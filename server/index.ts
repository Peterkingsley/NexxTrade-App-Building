import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { query, waitForDatabase } from './db';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import webpush from 'web-push'; // Requires: npm install web-push
import axios from 'axios'; // Ensure axios is installed for server

// Fix for __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS
app.use(cors());
app.use(express.json());

// --- Web Push Configuration ---
// Generate keys if not present (Note: In production, these should be static env vars to persist subscriptions)
const publicVapidKey = process.env.VAPID_PUBLIC_KEY || 'BInyTfJ0w_5yXq3a7T9j8Xq3a7T9j8Xq3a7T9j8Xq3a7T9j8Xq3a7T9j8Xq3a7T9j8Xq3a7T9j8'; // Placeholder if missing
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || '...';

// We try to generate keys dynamically if they are clearly placeholders or missing
// This ensures the app works out of the box, but subscriptions will be lost on server restart if keys aren't saved
let vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY
};

if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
    console.log("No VAPID keys found in .env. Generating ephemeral keys for this session.");
    vapidKeys = webpush.generateVAPIDKeys();
    console.log("EPHEMERAL PUBLIC KEY:", vapidKeys.publicKey);
    console.log("EPHEMERAL PRIVATE KEY:", vapidKeys.privateKey);
}

webpush.setVapidDetails(
  'mailto:support@nexxtrade.com',
  vapidKeys.publicKey!,
  vapidKeys.privateKey!
);

// --- Helper Functions ---
const generateReferralCode = () => {
    return 'NEXX-' + crypto.randomBytes(3).toString('hex').toUpperCase();
};

const getUserId = (req: express.Request): string | null => {
    const userId = req.headers['x-user-id'];
    return typeof userId === 'string' ? userId : null;
};

const ensureAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const result = await query('SELECT role FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden: Admins only' });
        }
        next();
    } catch (error) {
        console.error('Admin Check Error:', error);
        res.status(500).json({ error: 'Server error during auth check' });
    }
};

// --- PRICE MONITORING ENGINE ---
// In-Memory Cache for Proxy Endpoint
const priceCache: Record<string, number> = {};

const monitorPrices = async () => {
    try {
        // 1. Fetch Active Signals with their Targets
        const activeSignalsRes = await query(`
            SELECT 
                s.id, s.pair, s.type, s.side, s.leverage, s.entry_price_display, s.stop_loss_price, s.pnl_percentage,
                (SELECT json_agg(st.* ORDER BY st.target_order) FROM signal_targets st WHERE st.signal_id = s.id) as targets 
            FROM signals s 
            WHERE s.status = 'active'
        `);
        
        if (activeSignalsRes.rows.length === 0) return;

        const signals = activeSignalsRes.rows;
        
        // 2. Get Unique Symbols for API Call (e.g., "BTC/USDT" -> "BTCUSDT")
        // Remove special chars to match Binance format
        const pairs = [...new Set(signals.map((s: any) => s.pair.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()))];
        
        if (pairs.length === 0) return;

        // 3. Fetch Prices from Binance
        // Note: Binance requires symbols in format ["BTCUSDT","ETHUSDT"]
        const symbolsParam = JSON.stringify(pairs);
        const url = `https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(symbolsParam)}`;
        
        // Add timeout to prevent server hanging
        const priceRes = await axios.get(url, { timeout: 5000 });
        const prices: Record<string, number> = {};
        
        if (Array.isArray(priceRes.data)) {
            priceRes.data.forEach((p: any) => {
                const val = parseFloat(p.price);
                prices[p.symbol] = val;
                // Update Cache
                priceCache[p.symbol] = val;
            });
        }

        // 4. Evaluate Each Signal
        const subsRes = await query('SELECT keys, endpoint FROM push_subscriptions');
        const subscriptions = subsRes.rows;

        const sendBroadcast = (title: string, body: string) => {
            const payload = JSON.stringify({ title, body, icon: '/logo.png' });
            subscriptions.forEach(sub => {
                webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload).catch(() => {});
            });
        };

        for (const signal of signals) {
            const symbol = signal.pair.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
            const currentPrice = prices[symbol];
            
            if (!currentPrice) continue;

            // Parse Numbers
            // Remove commas and take first number of range "2000-2050"
            const entry = parseFloat(signal.entry_price_display.replace(/,/g, '').split('-')[0].trim());
            const stopLoss = parseFloat(signal.stop_loss_price.replace(/,/g, '').trim());
            const leverage = parseInt(signal.leverage?.match(/\d+/)?.[0] || '1');
            
            if (isNaN(entry)) continue;

            // --- A. Calculate PnL ---
            let pnl = 0;
            if (signal.side === 'Long') {
                pnl = ((currentPrice - entry) / entry) * 100 * leverage;
            } else {
                pnl = ((entry - currentPrice) / entry) * 100 * leverage;
            }

            // Update PnL in DB
            await query('UPDATE signals SET pnl_percentage = $1 WHERE id = $2', [pnl, signal.id]);

            // --- B. Check Stop Loss ---
            let slHit = false;
            if (!isNaN(stopLoss)) {
                if (signal.side === 'Long' && currentPrice <= stopLoss) slHit = true;
                if (signal.side === 'Short' && currentPrice >= stopLoss) slHit = true;
            }

            if (slHit) {
                console.log(`SL Hit for ${signal.pair} at ${currentPrice}`);
                await query("UPDATE signals SET status = 'closed', closed_at = NOW() WHERE id = $1", [signal.id]);
                // Notify
                await query("INSERT INTO notifications (type, title, message) VALUES ($1, $2, $3)", ['Signal', 'Stop Loss Hit', `${signal.pair} hit SL at ${currentPrice}. PnL: ${pnl.toFixed(2)}%`]);
                sendBroadcast('Stop Loss Hit', `${signal.pair} has hit the stop loss.`);
                continue; // Signal closed, skip targets
            }

            // --- C. Check Take Profits ---
            const targets = signal.targets || [];
            let updatedTargets = false;
            let highestTargetHit = 0;

            for (const target of targets) {
                if (target.is_hit) {
                    highestTargetHit = Math.max(highestTargetHit, target.target_order);
                    continue;
                }

                const tpPrice = parseFloat(target.target_price.replace(/,/g, '').trim());
                if (isNaN(tpPrice)) continue;

                let hit = false;
                if (signal.side === 'Long' && currentPrice >= tpPrice) hit = true;
                if (signal.side === 'Short' && currentPrice <= tpPrice) hit = true;

                if (hit) {
                    await query('UPDATE signal_targets SET is_hit = true, hit_at = NOW() WHERE id = $1', [target.id]);
                    updatedTargets = true;
                    highestTargetHit = Math.max(highestTargetHit, target.target_order);
                    
                    console.log(`TP${target.target_order} Hit for ${signal.pair} at ${currentPrice}`);

                    // Notify TP Hit
                    await query("INSERT INTO notifications (type, title, message) VALUES ($1, $2, $3)", ['Signal', 'Take Profit Hit', `${signal.pair} hit TP${target.target_order} at ${currentPrice}.`]);
                    sendBroadcast('Take Profit Hit', `${signal.pair} Target ${target.target_order} reached!`);
                }
            }

            // Auto-close if all targets hit
            if (updatedTargets && highestTargetHit === targets.length && targets.length > 0) {
                 await query("UPDATE signals SET status = 'closed', closed_at = NOW() WHERE id = $1", [signal.id]);
                 sendBroadcast('Trade Completed', `${signal.pair} has hit all targets!`);
            }
        }

    } catch (e) {
        // Suppress generic network errors in loop
        // console.error("Price Monitor Error:", (e as Error).message);
    }
};

// --- Database Initialization ---
const initDb = async () => {
    try {
        console.log("Initializing database schema...");
        
        await query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"').catch(err => console.log('UUID extension might already exist (skipping)'));

        await query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255),
                full_name VARCHAR(100),
                username VARCHAR(50) UNIQUE,
                photo_url TEXT,
                telegram_id VARCHAR(255) UNIQUE,
                role VARCHAR(20) DEFAULT 'user',
                subscription_plan VARCHAR(20) DEFAULT 'free',
                subscription_expiry TIMESTAMPTZ,
                referral_code VARCHAR(20) UNIQUE,
                referred_by UUID REFERENCES users(id),
                wallet_balance DECIMAL(15, 2) DEFAULT 0.00,
                is_email_verified BOOLEAN DEFAULT FALSE,
                notification_preferences JSONB DEFAULT '{"allSignals": true, "announcement": true, "tp": true, "sl": true, "academy": false}',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        // Migration: Add telegram_id and notification_preferences if they don't exist
        try {
            await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_id VARCHAR(255) UNIQUE`);
            await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"allSignals": true, "announcement": true, "tp": true, "sl": true, "academy": false}'`);
        } catch (e) {
            console.log('Note: column check/update', (e as Error).message);
        }

        await query(`
            CREATE TABLE IF NOT EXISTS linked_accounts (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                provider VARCHAR(50) NOT NULL,
                provider_user_id VARCHAR(255) NOT NULL,
                linked_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(provider, provider_user_id)
            )
        `);

        await query(`
            CREATE TABLE IF NOT EXISTS signals (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                pair VARCHAR(20) NOT NULL,
                type VARCHAR(20) NOT NULL,
                side VARCHAR(10) NOT NULL,
                leverage VARCHAR(20),
                status VARCHAR(20) DEFAULT 'active',
                entry_price_display VARCHAR(100) NOT NULL,
                entry_price_min DECIMAL(20, 8),
                entry_price_max DECIMAL(20, 8),
                stop_loss_price VARCHAR(100) NOT NULL,
                pnl_percentage DECIMAL(8, 2) DEFAULT 0.00,
                max_gain DECIMAL(8, 2) DEFAULT 0.00,
                analysis_text TEXT,
                risk_management_text TEXT,
                chart_image_url TEXT,
                is_sl_unlocked BOOLEAN DEFAULT TRUE,
                requires_subscription VARCHAR(20) DEFAULT 'free',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                closed_at TIMESTAMPTZ,
                created_by UUID REFERENCES users(id)
            )
        `);

        // Migration: Add leverage column if it doesn't exist
        try {
            await query(`ALTER TABLE signals ADD COLUMN IF NOT EXISTS leverage VARCHAR(20)`);
        } catch (e) {
            console.log('Note: leverage column check', (e as Error).message);
        }

        await query(`
            CREATE TABLE IF NOT EXISTS signal_targets (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                signal_id UUID REFERENCES signals(id) ON DELETE CASCADE,
                target_price VARCHAR(50) NOT NULL,
                target_order INTEGER NOT NULL,
                is_hit BOOLEAN DEFAULT FALSE,
                hit_at TIMESTAMPTZ
            )
        `);

        await query(`
            CREATE TABLE IF NOT EXISTS withdrawals (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                amount DECIMAL(15, 2) NOT NULL,
                network VARCHAR(50) NOT NULL,
                wallet_address VARCHAR(255) NOT NULL,
                status VARCHAR(20) DEFAULT 'Pending',
                tx_hash VARCHAR(255),
                rejection_reason TEXT,
                requested_at TIMESTAMPTZ DEFAULT NOW(),
                processed_at TIMESTAMPTZ
            )
        `);

        await query(`
             CREATE TABLE IF NOT EXISTS notifications (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                type VARCHAR(50) NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                link_url TEXT,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        // Academy Tables
        await query(`
            CREATE TABLE IF NOT EXISTS academy_items (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                title VARCHAR(255) NOT NULL,
                category VARCHAR(50) NOT NULL,
                type VARCHAR(20) NOT NULL,
                thumbnail_url TEXT,
                author_name VARCHAR(100),
                duration_display VARCHAR(50),
                description_short TEXT,
                content_html TEXT,
                video_url TEXT,
                is_featured BOOLEAN DEFAULT FALSE,
                published_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        
        // Push Subscriptions Table
        await query(`
            CREATE TABLE IF NOT EXISTS push_subscriptions (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                endpoint TEXT NOT NULL,
                keys JSONB NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(user_id, endpoint)
            )
        `);

        console.log("Database schema verified/updated successfully.");
    } catch (error) {
        console.error("Failed to initialize database:", error);
    }
};

// --- API Routes ---

// Proxy Price Endpoint (For Frontend Fallback)
app.get('/api/prices/proxy', (req, res) => {
    res.json(priceCache);
});

// GET Public VAPID Key for Frontend
app.get('/api/push/vapid-public-key', (req, res) => {
    res.json({ publicKey: vapidKeys.publicKey });
});

// POST Subscribe to Push Notifications
app.post('/api/push/subscribe', async (req, res) => {
    const userId = getUserId(req);
    const subscription = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!subscription || !subscription.endpoint) return res.status(400).json({ error: 'Invalid subscription' });

    try {
        await query(`
            INSERT INTO push_subscriptions (user_id, endpoint, keys)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, endpoint) DO NOTHING
        `, [userId, subscription.endpoint, JSON.stringify(subscription.keys)]);
        
        console.log(`User ${userId} subscribed to push notifications.`);
        res.json({ success: true });
    } catch (error) {
        console.error('Push Subscribe Error:', error);
        res.status(500).json({ error: 'Failed to subscribe' });
    }
});

// GET Current User Profile (Refresh Session)
app.get('/api/auth/me', async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        
        const user = result.rows[0];
        
        // Fetch linked accounts
        const linkedRes = await query('SELECT provider FROM linked_accounts WHERE user_id = $1', [userId]);
        const linkedProviders = linkedRes.rows.map(r => r.provider);

        // Split full name approximation
        const nameParts = (user.full_name || '').split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        res.json({
            id: user.id,
            firstName,
            lastName,
            username: user.username,
            photoUrl: user.photo_url,
            role: user.role, // This ensures fresh role from DB
            referralCode: user.referral_code,
            notificationPreferences: user.notification_preferences,
            linkedProviders
        });
    } catch (error) {
        console.error('Auth Me Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { provider, email, firstName, lastName, username, photoUrl, providerId } = req.body;

    try {
        if (!email && !username && !providerId) {
            return res.status(400).json({ error: 'Email, Username, or Provider ID required' });
        }

        let userRes;
        
        // 1. Check by Telegram ID in users table
        if (provider === 'telegram' && providerId) {
             userRes = await query('SELECT * FROM users WHERE telegram_id = $1', [providerId.toString()]);
        }

        // 2. Check by Email
        if ((!userRes || userRes.rows.length === 0) && email) {
            userRes = await query('SELECT * FROM users WHERE email = $1', [email]);
        } 
        
        // 3. Check Linked Accounts (legacy/backup/cross-provider)
        if (!userRes || userRes.rows.length === 0) {
            const linkRes = await query('SELECT user_id FROM linked_accounts WHERE provider = $1 AND provider_user_id = $2', [provider, providerId]);
            if (linkRes.rows.length > 0) {
                userRes = await query('SELECT * FROM users WHERE id = $1', [linkRes.rows[0].user_id]);
            } else if (username) {
                 userRes = await query('SELECT * FROM users WHERE username = $1', [username]);
            }
        }

        let userId;
        let isNewUser = false;
        let userData;

        if (userRes && userRes.rows.length > 0) {
            userId = userRes.rows[0].id;
            userData = userRes.rows[0];
            
            // Build dynamic update query
            const updateFields = [];
            const updateValues = [];
            let valueIndex = 1;

            updateFields.push(`full_name = COALESCE($${valueIndex++}, full_name)`);
            updateValues.push(`${firstName} ${lastName || ''}`.trim());

            updateFields.push(`photo_url = COALESCE($${valueIndex++}, photo_url)`);
            updateValues.push(photoUrl);
            
            // Explicitly record telegram_id in users table if coming from telegram login
            if (provider === 'telegram' && providerId) {
                updateFields.push(`telegram_id = COALESCE($${valueIndex++}, telegram_id)`);
                updateValues.push(providerId.toString());
