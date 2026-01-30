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
import { Buffer } from 'buffer';

// Fix for __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS
// Explicitly cast cors middleware to match express types if mismatch occurs
app.use(cors() as any);
// Increase payload limit for Base64 image uploads
app.use(express.json({ limit: '10mb' }) as any);

// Track DB Status
let dbConnected = false;

// --- File Upload Setup ---
// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log("Created uploads directory at", uploadsDir);
}

// Serve uploads: Check DB first, then fallback to filesystem
app.get('/uploads/:filename', async (req: any, res: any) => {
    const { filename } = req.params;

    try {
        if (dbConnected) {
             const result = await query('SELECT data, mime_type FROM file_uploads WHERE filename = $1', [filename]);
             if (result.rows.length > 0) {
                 const file = result.rows[0];
                 res.setHeader('Content-Type', file.mime_type);
                 res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
                 return res.send(file.data);
             }
        }
        
        // Fallback to filesystem (legacy support or local dev)
        const filePath = path.join(uploadsDir, filename);
        if (fs.existsSync(filePath)) {
             return res.sendFile(filePath);
        }

        res.status(404).send('File not found');

    } catch (error) {
        console.error("Error serving file:", error);
        res.status(500).send('Server error');
    }
});

// Note: We cast static to any to avoid TS issues with Express types in some envs
app.use('/uploads', express.static(uploadsDir) as any);


// --- Web Push Configuration ---
// Generate keys if not present (Note: In production, these should be static env vars to persist subscriptions)
const publicVapidKey = process.env.VAPID_PUBLIC_KEY || 'BInyTfJ0w_5yXq3a7T9j8Xq3a7T9j8Xq3a7T9j8Xq3a7T9j8Xq3a7T9j8Xq3a7T9j8Xq3a7T9j8Xq3a7T9j8Xq3a7T9j8Xq3a7T9j8Xq3a7T9j8'; // Placeholder if missing
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

const getUserId = (req: any): string | null => {
    const userId = req.headers['x-user-id'];
    return typeof userId === 'string' ? userId : null;
};

const ensureAdmin = async (req: any, res: any, next: any) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (!dbConnected) {
        // Mock admin check for demo mode
        return next();
    }

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

// Helper to reliably extract numbers from strings like "$2,000 - $2,100" or "Entry: 50.5"
const extractNumbers = (str: string): number[] => {
    if (!str) return [];
    // Remove commas to handle "1,000", then match float pattern
    const cleanStr = str.replace(/,/g, '');
    const matches = cleanStr.match(/[+-]?([0-9]*[.])?[0-9]+/g);
    return matches ? matches.map(parseFloat) : [];
};

const monitorPrices = async () => {
    if (!dbConnected) return; // Skip if no DB

    try {
        // 1. Fetch Active Signals with their Targets
        const activeSignalsRes = await query(`
            SELECT 
                s.id, s.pair, s.type, s.side, s.leverage, s.entry_price_display, s.stop_loss_price, s.pnl_percentage, s.is_entry_hit,
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

            // Robust Number Parsing using Regex
            const entryParts = extractNumbers(signal.entry_price_display);
            const stopLossParts = extractNumbers(signal.stop_loss_price);
            const stopLoss = stopLossParts.length > 0 ? stopLossParts[0] : NaN;
            const leverage = parseInt(signal.leverage?.match(/\d+/)?.[0] || '1');
            
            if (entryParts.length === 0) continue;

            // For logic checks:
            // Long Entry Trigger: Price enters zone (Price <= Max Entry)
            // Short Entry Trigger: Price enters zone (Price >= Min Entry)
            const entryMax = Math.max(...entryParts);
            const entryMin = Math.min(...entryParts);
            
            // For PnL calculation, use the first number as the anchor
            const entryCalc = entryParts[0];
            
            // --- A. Check Entry Condition ---
            // If entry hasn't been hit yet, check if price is now within/crossed entry zone.
            if (!signal.is_entry_hit) {
                let entryTriggered = false;
                
                // Long: Triggers if price is below or equal to the top of the entry zone
                // User requirement: "Long BTC at 90... current below 90 automatically start"
                if (signal.side === 'Long' && currentPrice <= entryMax) entryTriggered = true;
                
                // Short: Triggers if price is above or equal to the bottom of the entry zone
                // User requirement: "Short at 89... current above 89... start"
                if (signal.side === 'Short' && currentPrice >= entryMin) entryTriggered = true;

                if (entryTriggered) {
                    await query('UPDATE signals SET is_entry_hit = TRUE WHERE id = $1', [signal.id]);
                    console.log(`Entry filled for ${signal.pair} at ${currentPrice}`);
                    
                    // Notify User
                    sendBroadcast('Entry Filled', `${signal.pair} has reached entry zone. Trade is active.`);
                    // We continue to calculate PnL immediately in this same tick
                } else {
                    // Entry not hit yet: PnL is 0, skip SL/TP checks
                    // Reset PnL if it was previously set (unlikely but safe)
                    if (Number(signal.pnl_percentage) !== 0) {
                         await query('UPDATE signals SET pnl_percentage = 0 WHERE id = $1', [signal.id]);
                    }
                    continue; // Skip SL/TP checks because trade isn't active
                }
            }

            // --- B. Calculate PnL (Entry is hit) ---
            let pnl = 0;
            if (signal.side === 'Long') {
                pnl = ((currentPrice - entryCalc) / entryCalc) * 100 * leverage;
            } else {
                pnl = ((entryCalc - currentPrice) / entryCalc) * 100 * leverage;
            }

            // Update PnL in DB
            await query('UPDATE signals SET pnl_percentage = $1 WHERE id = $2', [pnl, signal.id]);

            // --- C. Check Stop Loss ---
            let slHit = false;
            if (!isNaN(stopLoss)) {
                if (signal.side === 'Long' && currentPrice <= stopLoss) slHit = true;
                if (signal.side === 'Short' && currentPrice >= stopLoss) slHit = true;
            }

            if (slHit) {
                // Calculate Final PnL based on SL Price (Fixed Loss), not current wick
                // This ensures the recorded ROI matches the Stop Loss exactly.
                let finalPnl = 0;
                if (signal.side === 'Long') {
                    finalPnl = ((stopLoss - entryCalc) / entryCalc) * 100 * leverage;
                } else {
                    finalPnl = ((entryCalc - stopLoss) / entryCalc) * 100 * leverage;
                }

                console.log(`SL Hit for ${signal.pair} at ${currentPrice}. Final PnL recorded: ${finalPnl.toFixed(2)}%`);
                
                // Close the trade automatically
                await query("UPDATE signals SET status = 'closed', closed_at = NOW(), pnl_percentage = $1 WHERE id = $2", [finalPnl, signal.id]);
                
                // Notify
                await query("INSERT INTO notifications (type, title, message) VALUES ($1, $2, $3)", ['Signal', 'Stop Loss Hit', `${signal.pair} hit SL. PnL: ${finalPnl.toFixed(2)}%`]);
                sendBroadcast('Stop Loss Hit', `${signal.pair} has hit the stop loss.`);
                continue; // Signal closed, skip targets
            }

            // --- D. Check Take Profits ---
            const targets = signal.targets || [];
            let updatedTargets = false;
            let highestTargetHit = 0;

            for (const target of targets) {
                if (target.is_hit) {
                    highestTargetHit = Math.max(highestTargetHit, target.target_order);
                    continue;
                }

                const tpPriceArr = extractNumbers(target.target_price);
                const tpPrice = tpPriceArr.length > 0 ? tpPriceArr[0] : NaN;
                
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
                proof_image_url TEXT,
                is_sl_unlocked BOOLEAN DEFAULT TRUE,
                requires_subscription VARCHAR(20) DEFAULT 'free',
                is_entry_hit BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                closed_at TIMESTAMPTZ,
                created_by UUID REFERENCES users(id)
            )
        `);

        // Migration: Add leverage column if it doesn't exist
        try {
            await query(`ALTER TABLE signals ADD COLUMN IF NOT EXISTS leverage VARCHAR(20)`);
            await query(`ALTER TABLE signals ADD COLUMN IF NOT EXISTS is_entry_hit BOOLEAN DEFAULT FALSE`);
            // Add proof image column
            await query(`ALTER TABLE signals ADD COLUMN IF NOT EXISTS proof_image_url TEXT`);
        } catch (e) {
            console.log('Note: column check', (e as Error).message);
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

        // File Uploads Table (For Persistent Storage)
        await query(`
            CREATE TABLE IF NOT EXISTS file_uploads (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                filename VARCHAR(255) UNIQUE NOT NULL,
                data BYTEA NOT NULL,
                mime_type VARCHAR(100) NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        console.log("Database schema verified/updated successfully.");
    } catch (error) {
        console.error("Failed to initialize database:", error);
    }
};

// --- API Routes ---

// 1. Upload Handler (Base64 -> Database)
app.post('/api/admin/upload', ensureAdmin, async (req: any, res: any) => {
    // If DB is not connected, fallback to placeholder
    if (!dbConnected) return res.json({ url: 'https://placehold.co/600x800/10B981/ffffff?text=PnL+Proof' });

    const { image, filename } = req.body;
    if (!image) return res.status(400).json({ error: 'No image data' });

    try {
        const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        
        if (!matches || matches.length !== 3) {
            return res.status(400).json({ error: 'Invalid base64 string' });
        }

        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        const extension = mimeType.split('/')[1] || 'png';
        const safeName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${extension}`;

        // Store in DB for persistence across redeploys
        await query(
            'INSERT INTO file_uploads (filename, data, mime_type) VALUES ($1, $2, $3)', 
            [safeName, buffer, mimeType]
        );

        const fileUrl = `/uploads/${safeName}`;
        res.json({ url: fileUrl });
    } catch (e) {
        console.error("Upload error", e);
        res.status(500).json({ error: 'Failed to upload' });
    }
});

// 2. Update Proof URL Independent Endpoint
app.put('/api/admin/signals/:id/proof', ensureAdmin, async (req: any, res: any) => {
    if (!dbConnected) return res.json({ success: true });

    const { id } = req.params;
    const { proofImageUrl } = req.body;

    try {
        await query('UPDATE signals SET proof_image_url = $1 WHERE id = $2', [proofImageUrl, id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Update Proof Error:', error);
        res.status(500).json({ error: 'Failed to update proof' });
    }
});

// Proxy Price Endpoint (For Frontend Fallback)
app.get('/api/prices/proxy', (req: any, res: any) => {
    res.json(priceCache);
});

// GET Public VAPID Key for Frontend
app.get('/api/push/vapid-public-key', (req: any, res: any) => {
    res.json({ publicKey: vapidKeys.publicKey });
});

// POST Subscribe to Push Notifications
app.post('/api/push/subscribe', async (req: any, res: any) => {
    if (!dbConnected) return res.json({ success: true }); // Mock success

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
app.get('/api/auth/me', async (req: any, res: any) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (!dbConnected) {
        // Return Mock User for Demo Mode
        return res.json({
            id: userId,
            firstName: 'Demo',
            lastName: 'User',
            username: 'demo_trader',
            photoUrl: '',
            role: 'user',
            referralCode: 'DEMO-123',
            notificationPreferences: {allSignals: true, announcement: true, tp: true, sl: true, academy: false},
            linkedProviders: ['google']
        });
    }

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

app.post('/api/auth/login', async (req: any, res: any) => {
    const { provider, email, firstName, lastName, username, photoUrl, providerId } = req.body;

    // --- Mock Login if DB is down ---
    if (!dbConnected) {
        console.log("DB Down: Performing Mock Login");
        const mockId = providerId || 'mock-user-id';
        return res.json({
            id: mockId,
            firstName: firstName || 'Demo',
            lastName: lastName || 'User',
            username: username || 'demo_user',
            photoUrl: photoUrl || '',
            role: 'user',
            referralCode: 'DEMO-CODE',
            notificationPreferences: {allSignals: true, announcement: true, tp: true, sl: true, academy: false},
            isNewUser: false,
            linkedProviders: [provider]
        });
    }

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
            }

            updateFields.push(`updated_at = NOW()`);
            
            // Add ID for WHERE clause
            updateValues.push(userId);

            const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${valueIndex}`;
            await query(updateQuery, updateValues);

        } else {
            isNewUser = true;
            const refCode = generateReferralCode();
            const fullName = `${firstName} ${lastName || ''}`.trim();
            const finalEmail = email || `${providerId}@telegram.nexxtrade.com`;
            let finalUsername = username || `user_${crypto.randomBytes(4).toString('hex')}`;
            const checkUser = await query('SELECT id FROM users WHERE username = $1', [finalUsername]);
            if (checkUser.rows.length > 0) {
                finalUsername = `${finalUsername}_${Math.floor(Math.random() * 1000)}`;
            }

            const insertRes = await query(`
                INSERT INTO users (email, full_name, username, photo_url, referral_code, wallet_balance, is_email_verified, telegram_id)
                VALUES ($1, $2, $3, $4, $5, 0.00, $6, $7)
                RETURNING *
            `, [
                finalEmail, 
                fullName, 
                finalUsername, 
                photoUrl, 
                refCode, 
                provider === 'google',
                (provider === 'telegram' && providerId) ? providerId.toString() : null
            ]);
            
            userId = insertRes.rows[0].id;
            userData = insertRes.rows[0];
        }

        if (providerId) {
            await query(`
                INSERT INTO linked_accounts (user_id, provider, provider_user_id)
                VALUES ($1, $2, $3)
                ON CONFLICT (provider, provider_user_id) DO NOTHING
            `, [userId, provider, providerId.toString()]);
        }

        // Fetch all linked accounts for this user to return in login response
        const linkedRes = await query('SELECT provider FROM linked_accounts WHERE user_id = $1', [userId]);
        const linkedProviders = linkedRes.rows.map(r => r.provider);

        res.json({
            id: userData.id,
            firstName: firstName,
            lastName: lastName,
            username: userData.username,
            photoUrl: userData.photo_url,
            role: userData.role, // Return Role
            referralCode: userData.referral_code,
            notificationPreferences: userData.notification_preferences, // Return preferences
            isNewUser,
            linkedProviders
        });

    } catch (error) {
        console.error('Auth Error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

// GET Notification Settings
app.get('/api/user/settings/notifications', async (req: any, res: any) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (!dbConnected) {
        return res.json({allSignals: true, announcement: true, tp: true, sl: true, academy: false});
    }

    try {
        const result = await query('SELECT notification_preferences FROM users WHERE id = $1', [userId]);
        if (result.rows.length > 0) {
            res.json(result.rows[0].notification_preferences);
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        console.error('Fetch Settings Error:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// UPDATE Notification Settings
app.put('/api/user/settings/notifications', async (req: any, res: any) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    if (!dbConnected) return res.json({ success: true });

    const preferences = req.body;

    try {
        await query('UPDATE users SET notification_preferences = $1 WHERE id = $2', [JSON.stringify(preferences), userId]);
        res.json({ success: true });
    } catch (error) {
        console.error('Update Settings Error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// GET All Notifications (Global + User Specific)
app.get('/api/notifications', async (req: any, res: any) => {
    const userId = getUserId(req);
    
    if (!dbConnected) {
        return res.json([
            {id: '1', type: 'Announcement', title: 'System Maintenance', message: 'This is a demo notification because the database is offline.', is_read: false, created_at: new Date().toISOString()},
            {id: '2', type: 'Signal', title: 'BTC/USDT Hit TP1', message: 'Bitcoin has reached the first target.', is_read: true, created_at: new Date(Date.now() - 3600000).toISOString()}
        ]);
    }

    // If user is logged in, fetch global (NULL) and their specific notifications
    // If not logged in, fetch only global announcements
    const params = userId ? [userId] : [];
    const queryText = userId 
        ? `SELECT * FROM notifications WHERE user_id IS NULL OR user_id = $1 ORDER BY created_at DESC LIMIT 50`
        : `SELECT * FROM notifications WHERE user_id IS NULL ORDER BY created_at DESC LIMIT 50`;

    try {
        const result = await query(queryText, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Fetch Notifications Error:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// New endpoint to link an account from profile settings (enforces uniqueness)
app.post('/api/user/link-account', async (req: any, res: any) => {
    if (!dbConnected) return res.json({ success: true });

    const userId = getUserId(req);
    const { provider, providerId } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!provider || !providerId) return res.status(400).json({ error: 'Missing provider data' });

    try {
        // Check if this provider account is already linked
        const existing = await query(
            'SELECT user_id FROM linked_accounts WHERE provider = $1 AND provider_user_id = $2',
            [provider, providerId.toString()]
        );

        if (existing.rows.length > 0) {
            const linkedUserId = existing.rows[0].user_id;
            if (linkedUserId === userId) {
                // Linked to self: Idempotent success
                return res.json({ success: true, message: 'Account already linked' });
            } else {
                // Linked to someone else: Conflict
                return res.status(409).json({ error: 'Account linked to another user' });
            }
        }

        // Perform Link
        await query(
            'INSERT INTO linked_accounts (user_id, provider, provider_user_id) VALUES ($1, $2, $3)',
            [userId, provider, providerId.toString()]
        );
        
        // Also update the users table if it's telegram
        if (provider === 'telegram') {
            await query('UPDATE users SET telegram_id = $1 WHERE id = $2 AND telegram_id IS NULL', [providerId.toString(), userId]);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Link Account Error:', error);
        res.status(500).json({ error: 'Failed to link account' });
    }
});

// GET Subscription Details
app.get('/api/user/subscription', async (req: any, res: any) => {
    if (!dbConnected) return res.json({plan: 'free', expiry: null});

    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const result = await query('SELECT subscription_plan, subscription_expiry FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

        const user = result.rows[0];
        
        res.json({
            plan: user.subscription_plan,
            expiry: user.subscription_expiry
        });
    } catch (error) {
        console.error('Error fetching subscription:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Claim Referral Code Endpoint
app.post('/api/referrals/claim', async (req: any, res: any) => {
    if (!dbConnected) return res.json({ success: true });

    const userId = getUserId(req);
    const { code } = req.body;
    
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!code) return res.status(400).json({ error: 'Code required' });

    try {
        // Find referrer
        const referrerRes = await query('SELECT id FROM users WHERE referral_code = $1', [code]);
        if (referrerRes.rows.length === 0) {
            return res.status(404).json({ error: 'Invalid referral code' });
        }
        
        const referrerId = referrerRes.rows[0].id;

        // Prevent self-referral
        if (referrerId === userId) {
            return res.status(400).json({ error: 'Cannot refer yourself' });
        }

        // Check if already referred
        const userRes = await query('SELECT referred_by FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length > 0 && userRes.rows[0].referred_by) {
            return res.status(400).json({ error: 'Already referred' });
        }

        // Update user
        await query('UPDATE users SET referred_by = $1 WHERE id = $2', [referrerId, userId]);
        
        res.json({ success: true });

    } catch (error) {
        console.error('Referral Claim Error:', error);
        res.status(500).json({ error: 'Failed to claim referral' });
    }
});

app.get('/api/signals', async (req: any, res: any) => {
  // If DB not connected, return mock data directly from server
  // This prevents frontend 500 errors and "Signal fetch failed" messages
  if (!dbConnected) {
      return res.json([
        {
            id: 'mock-1',
            pair: 'BTC/USDT',
            type: 'Futures',
            side: 'Long',
            leverage: 'Cross 20x',
            status: 'active',
            pnl: 0,
            entry: '96,500',
            stopLoss: '95,500',
            slUnlock: true,
            isEntryHit: true,
            analysis: 'Bullish consolidation above key support. Looking for a breakout.',
            riskManagement: '1-2% risk. Tight SL.',
            created_at: new Date().toISOString(),
            timeAgo: '1h ago',
            tpTargets: [
                { target_price: '97,500', is_hit: false, target_order: 1 },
                { target_price: '98,500', is_hit: false, target_order: 2 },
                { target_price: '100,000', is_hit: false, target_order: 3 }
            ].map(t => ({price: t.target_price, hit: t.is_hit}))
        },
        {
            id: 'mock-2',
            pair: 'ETH/USDT',
            type: 'Spot',
            side: 'Long',
            status: 'active',
            pnl: 2.5,
            entry: '3,450',
            stopLoss: '3,300',
            slUnlock: true,
            isEntryHit: true,
            created_at: new Date(Date.now() - 7200000).toISOString(),
            timeAgo: '2h ago',
            tpTargets: [
                { price: '3,550', hit: true },
                { price: '3,700', hit: false }
            ]
        },
        {
            id: 'mock-3',
            pair: 'SOL/USDT',
            type: 'Futures',
            side: 'Short',
            leverage: 'Iso 10x',
            status: 'active',
            pnl: -1.2,
            entry: '190.50',
            stopLoss: '195.00',
            slUnlock: true,
            isEntryHit: true,
            analysis: 'Bearish divergence on 4H RSI. Rejection from supply zone.',
            riskManagement: 'High volatility, use reduced position size.',
            created_at: new Date(Date.now() - 18000000).toISOString(),
            timeAgo: '5h ago',
            tpTargets: [
                { price: '185.00', hit: false },
                { price: '180.00', hit: false }
            ]
        },
        {
            id: 'mock-4',
            pair: 'XRP/USDT',
            type: 'Futures',
            side: 'Long',
            leverage: '20x',
            status: 'closed',
            pnl: 15.0,
            entry: '2.10',
            stopLoss: '2.00',
            slUnlock: true,
            isEntryHit: true,
            created_at: new Date(Date.now() - 86400000).toISOString(),
            closedAt: new Date(Date.now() - 86400000).toISOString(),
            timeAgo: '1d ago',
            tpTargets: [
                { price: '2.20', hit: true },
                { price: '2.30', hit: true }
            ]
        }
      ]);
  }

  try {
    const checkTable = await query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'signals')");
    if (!checkTable.rows[0].exists) {
        return res.json([]); 
    }

    const result = await query(`
      SELECT 
        s.id, s.pair, s.type, s.side, s.leverage, s.status, 
        s.pnl_percentage as pnl,
        s.entry_price_display as entry,
        s.stop_loss_price as "stopLoss",
        s.is_sl_unlocked as "slUnlock",
        s.is_entry_hit as "isEntryHit",
        s.analysis_text as analysis,
        s.risk_management_text as "riskManagement",
        s.proof_image_url as "proofImageUrl",
        s.created_at,
        s.closed_at as "closedAt",
        COALESCE(
          (SELECT json_agg(json_build_object('price', st.target_price, 'hit', st.is_hit) ORDER BY st.target_order)
           FROM signal_targets st WHERE st.signal_id = s.id), '[]'::json
        ) as "tpTargets"
      FROM signals s
      ORDER BY (CASE WHEN s.status = 'active' THEN 0 ELSE 1 END) ASC, s.created_at DESC
    `);

    const signals = result.rows.map(row => {
      const diffMs = new Date().getTime() - new Date(row.created_at).getTime();
      const diffMins = Math.round(diffMs / 60000);
      const diffHours = Math.round(diffMs / 3600000);
      const diffDays = Math.round(diffMs / 86400000);
      
      let timeAgo = 'Just now';
      if (diffDays > 0) timeAgo = `${diffDays}d ago`;
      else if (diffHours > 0) timeAgo = `${diffHours}h ago`;
      else if (diffMins > 0) timeAgo = `${diffMins}m ago`;

      return {
        ...row,
        pnl: Number(row.pnl),
        tpTargets: row.tpTargets,
        timeAgo
      };
    });

    res.json(signals);
  } catch (error) {
    console.error('Error fetching signals:', error);
    res.status(500).json({ error: 'Failed to fetch signals' });
  }
});

app.get('/api/referrals/my-stats', async (req: any, res: any) => {
    if (!dbConnected) return res.json({pendingBalance: 0, totalEarnings: 0, totalReferrals: 0, referralCode: 'DEMO-123'});

    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        
        const checkTable = await query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'withdrawals')");
        const totalWithdrawn = checkTable.rows[0].exists 
            ? (await query('SELECT COALESCE(SUM(amount), 0) as total_withdrawn FROM withdrawals WHERE user_id = $1 AND status = $2', [userId, 'Completed'])).rows[0].total_withdrawn
            : 0;

        const [userRes, refRes] = await Promise.all([
            query('SELECT wallet_balance, referral_code FROM users WHERE id = $1', [userId]),
            query('SELECT COUNT(*) as count FROM users WHERE referred_by = $1', [userId])
        ]);

        if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

        const user = userRes.rows[0];
        const referralCount = parseInt(refRes.rows[0].count);
        const pendingBalance = parseFloat(user.wallet_balance);
        const totalEarnings = pendingBalance + parseFloat(totalWithdrawn);

        res.json({
            pendingBalance,
            totalEarnings,
            totalReferrals: referralCount,
            referralCode: user.referral_code
        });
    } catch (error) {
        console.error('Error fetching referral stats:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/withdrawals', async (req: any, res: any) => {
    if (!dbConnected) return res.json([]);

    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const checkTable = await query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'withdrawals')");
        if (!checkTable.rows[0].exists) return res.json([]);

        const result = await query('SELECT * FROM withdrawals WHERE user_id = $1 ORDER BY requested_at DESC', [userId]);
        
        const withdrawals = result.rows.map(row => ({
            id: row.id,
            amount: parseFloat(row.amount),
            date: new Date(row.requested_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            status: row.status,
            chain: row.network,
            address: row.wallet_address,
            txHash: row.tx_hash,
            timeRequested: new Date(row.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timeSent: row.processed_at ? new Date(row.processed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined
        }));
        
        res.json(withdrawals);
    } catch (error) {
        console.error('Error fetching withdrawals:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/withdrawals', async (req: any, res: any) => {
    const { amount, network, address } = req.body;
    
    if (!dbConnected) {
         // Mock withdrawal response
         return res.json({
            id: 'mock-wd-' + Date.now(),
            amount: parseFloat(amount),
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            status: 'Pending',
            chain: network,
            address: address,
            timeRequested: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
         });
    }

    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        
        const userRes = await query('SELECT wallet_balance FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

        const currentBalance = parseFloat(userRes.rows[0].wallet_balance);
        
        if (currentBalance < amount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        await query('BEGIN');
        await query('UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2', [amount, userId]);
        const insertRes = await query(`
            INSERT INTO withdrawals (user_id, amount, network, wallet_address, status)
            VALUES ($1, $2, $3, $4, 'Pending')
            RETURNING *
        `, [userId, amount, network, address]);
        await query('COMMIT');
        
        const row = insertRes.rows[0];
        const newWithdrawal = {
            id: row.id,
            amount: parseFloat(row.amount),
            date: new Date(row.requested_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            status: row.status,
            chain: row.network,
            address: row.wallet_address,
            txHash: row.tx_hash,
            timeRequested: new Date(row.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        res.json(newWithdrawal);

    } catch (error) {
        await query('ROLLBACK');
        console.error('Error creating withdrawal:', error);
        res.status(500).json({ error: 'Transaction failed' });
    }
});

// --- ADMIN ROUTES ---

// Create Signal (Send Push)
app.post('/api/admin/signals', ensureAdmin, async (req: any, res: any) => {
    if (!dbConnected) return res.json({ success: true, signalId: 'mock-id' });

    const { pair, type, side, leverage, entry, stopLoss, analysis, targets } = req.body;
    const userId = getUserId(req);

    if (!pair || !entry || !stopLoss || !targets || !Array.isArray(targets)) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        await query('BEGIN');
        const signalRes = await query(`
            INSERT INTO signals (pair, type, side, leverage, entry_price_display, stop_loss_price, analysis_text, created_by, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
            RETURNING id
        `, [pair, type, side, leverage, entry, stopLoss, analysis, userId]);

        const signalId = signalRes.rows[0].id;

        for (let i = 0; i < targets.length; i++) {
            await query(`
                INSERT INTO signal_targets (signal_id, target_price, target_order, is_hit)
                VALUES ($1, $2, $3, false)
            `, [signalId, targets[i], i + 1]);
        }

        // Send Push Notification for Signal
        // In a real app, optimize this to batch send
        const subsRes = await query('SELECT keys, endpoint FROM push_subscriptions');
        const notificationPayload = JSON.stringify({
            title: `New Signal: ${pair} ${side}`,
            body: `${type} Trade. Entry: ${entry}`,
            icon: '/logo.png'
        });

        subsRes.rows.forEach(sub => {
            webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, notificationPayload)
                .catch(err => console.error("Push Error", err));
        });

        await query('COMMIT');
        res.json({ success: true, signalId });
    } catch (error) {
        await query('ROLLBACK');
        console.error('Create Signal Error:', error);
        res.status(500).json({ error: 'Failed to create signal' });
    }
});

// Close Signal
app.put('/api/admin/signals/:id/close', ensureAdmin, async (req: any, res: any) => {
    if (!dbConnected) return res.json({ success: true });

    const { id } = req.params;
    const { pnl, proofImageUrl } = req.body;

    try {
        await query(`
            UPDATE signals 
            SET status = 'closed', pnl_percentage = $1, closed_at = NOW()
            WHERE id = $2
        `, [pnl, id]);
        
        // Optional: Update proof if provided during close (legacy support)
        if (proofImageUrl) {
             await query('UPDATE signals SET proof_image_url = $1 WHERE id = $2', [proofImageUrl, id]);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Close Signal Error:', error);
        res.status(500).json({ error: 'Failed to close signal' });
    }
});

// Delete Signal
app.delete('/api/admin/signals/:id', ensureAdmin, async (req: any, res: any) => {
    if (!dbConnected) return res.json({ success: true });

    const { id } = req.params;
    try {
        await query('DELETE FROM signals WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete Signal Error:', error);
        res.status(500).json({ error: 'Failed to delete signal' });
    }
});

// Post Academy Content
app.post('/api/admin/academy', ensureAdmin, async (req: any, res: any) => {
    if (!dbConnected) return res.json({ success: true });

    const { title, category, type, duration, author, description, content, videoUrl } = req.body;

    try {
        await query(`
            INSERT INTO academy_items (title, category, type, duration_display, author_name, description_short, content_html, video_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [title, category, type, duration, author, description, content, videoUrl]);
        res.json({ success: true });
    } catch (error) {
        console.error('Post Academy Error:', error);
        res.status(500).json({ error: 'Failed to post content' });
    }
});

// Send Notification (Broadcast with Push)
app.post('/api/admin/notifications', ensureAdmin, async (req: any, res: any) => {
    if (!dbConnected) return res.json({ success: true, count: 0 });

    const { title, message, type } = req.body;
    // user_id NULL means global
    try {
        // 1. Save to Database
        await query(`
            INSERT INTO notifications (type, title, message, user_id)
            VALUES ($1, $2, $3, NULL)
        `, [type, title, message]);

        // 2. Broadcast via Web Push
        const subsRes = await query('SELECT keys, endpoint FROM push_subscriptions');
        const notificationPayload = JSON.stringify({
            title: title,
            body: message,
            icon: '/logo.png'
        });

        // Fire and forget push sending
        subsRes.rows.forEach(sub => {
            webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, notificationPayload)
                .catch(err => {
                    // 410 Gone means subscription is invalid/expired
                    if (err.statusCode === 410) {
                         query('DELETE FROM push_subscriptions WHERE endpoint = $1', [sub.endpoint]).catch(console.error);
                    }
                });
        });

        res.json({ success: true, count: subsRes.rowCount });
    } catch (error) {
        console.error('Send Notification Error:', error);
        res.status(500).json({ error: 'Failed to send notification' });
    }
});


app.get('/health', (req: any, res: any) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// --- SERVE FRONTEND (STATIC FILES) ---
// Resolve the 'dist' directory relative to this file
// server/index.ts is in /server, dist/ is in /dist (parent root)
const distPath = path.resolve(__dirname, '..', 'dist');

console.log('Serving static files from:', distPath);

if (fs.existsSync(distPath)) {
    app.use(express.static(distPath) as any);

    // Handle React routing, return all requests to React app
    // Use Regex /.*/ to match all routes, avoiding Express 5 string path syntax issues
    // Explicitly define types for req and res to match Express RequestHandler
    app.get(/.*/, (req: any, res: any) => {
        // Only serve index.html for non-API routes
        if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
             res.sendFile(path.join(distPath, 'index.html'));
        } else if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
             res.status(404).json({ error: 'Resource not found' });
        }
    });
} else {
    // If running in dev mode without build, provide a fallback or just log
    // We don't error out here to allow dev server to work
    console.warn('Frontend build not found in dist/. Assuming development mode.');
}

// --- Server Startup ---
const startServer = async () => {
    // Wait for DB, but soft-fail if it doesn't connect.
    // This fixes "Network Error" on frontend by allowing the server to listen 
    // even if the DB is down (e.g. in environments without a local Postgres).
    const connected = await waitForDatabase(5, 2000);
    dbConnected = connected; // Update Global State
    
    if (!connected) {
        console.error("WARNING: Database connection failed. Starting server in limited mode (Mock Data Enabled).");
        // We do not exit process here.
    } else {
        await initDb();
        // Start Background Service only if DB is active
        setInterval(monitorPrices, 10000); 
        console.log("Price Monitor Service Started.");
    }

    app.listen(PORT, () => {
      console.log(`API Server running on http://localhost:${PORT}`);
    });
};

startServer();