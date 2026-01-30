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
const publicVapidKey = process.env.VAPID_PUBLIC_KEY || 'BInyTfJ0w_5yXq3a7T9j8Xq3a7T9j8Xq3a7T9j8Xq3a7T9j8Xq3a7T9j8Xq3a7T9j8Xq3a7T9j8Xq3a7T9j8Xq3a7T9j8Xq3a7T9j8Xq3a7T9j8Xq3a7T9j8'; // Placeholder if missing
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

// ... (Database Init and other routes remain same)

app.get('/api/signals', async (req: any, res: any) => {
  // If DB not connected, return mock data
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
            requiresSubscription: 'pro', // Mock Pro Tier
            created_at: new Date().toISOString(),
            timeAgo: '1h ago',
            tpTargets: [
                { target_price: '97,500', is_hit: false, target_order: 1 },
                { target_price: '98,500', is_hit: false, target_order: 2 },
                { target_price: '100,000', is_hit: false, target_order: 3 }
            ].map(t => ({price: t.target_price, hit: t.is_hit}))
        },
        // ... other mocks
      ]);
  }

  try {
    const checkTable = await query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'signals')");
    if (!checkTable.rows[0].exists) {
        return res.json([]); 
    }

    // 1. Determine User's Tier
    const userId = getUserId(req);
    let userTierLevel = 0; // Default Free
    
    if (userId) {
        const userRes = await query('SELECT subscription_plan FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length > 0) {
            const plan = userRes.rows[0].subscription_plan || 'free';
            if (plan === 'basic') userTierLevel = 1;
            else if (plan === 'pro') userTierLevel = 2; // 'premium' is often mapped to 'pro'
            else if (plan === 'elite') userTierLevel = 3;
        }
    }

    // Helper to map signal requirement string to level
    const getSignalLevel = (reqSub: string) => {
        if (reqSub === 'basic') return 1;
        if (reqSub === 'pro' || reqSub === 'premium') return 2;
        if (reqSub === 'elite') return 3;
        return 0; // free
    };

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
        s.requires_subscription as "requiresSubscription",
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

      // REDACTION LOGIC
      // If signal is active AND user tier < signal tier -> Lock Data
      const signalLevel = getSignalLevel(row.requiresSubscription);
      const isLocked = (userTierLevel < signalLevel) && (row.status === 'active');

      return {
        ...row,
        pnl: Number(row.pnl),
        // If locked, replace prices with "Locked"
        entry: isLocked ? 'Locked' : row.entry,
        stopLoss: isLocked ? 'Locked' : row.stopLoss,
        tpTargets: isLocked 
            ? row.tpTargets.map((t: any) => ({ ...t, price: 'Locked' }))
            : row.tpTargets,
        slUnlock: isLocked ? false : row.slUnlock, // Ensure UI treats it as locked
        timeAgo
      };
    });

    res.json(signals);
  } catch (error) {
    console.error('Error fetching signals:', error);
    res.status(500).json({ error: 'Failed to fetch signals' });
  }
});

// ... (Withdrawals and other routes)

// --- ADMIN ROUTES ---

// Create Signal (Send Push)
app.post('/api/admin/signals', ensureAdmin, async (req: any, res: any) => {
    if (!dbConnected) return res.json({ success: true, signalId: 'mock-id' });

    const { pair, type, side, leverage, entry, stopLoss, analysis, targets, requiresSubscription } = req.body;
    const userId = getUserId(req);

    if (!pair || !entry || !stopLoss || !targets || !Array.isArray(targets)) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        await query('BEGIN');
        const signalRes = await query(`
            INSERT INTO signals (pair, type, side, leverage, entry_price_display, stop_loss_price, analysis_text, created_by, status, requires_subscription)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9)
            RETURNING id
        `, [pair, type, side, leverage, entry, stopLoss, analysis, userId, requiresSubscription || 'free']);

        const signalId = signalRes.rows[0].id;

        for (let i = 0; i < targets.length; i++) {
            await query(`
                INSERT INTO signal_targets (signal_id, target_price, target_order, is_hit)
                VALUES ($1, $2, $3, false)
            `, [signalId, targets[i], i + 1]);
        }

        // Send Push Notification
        const subsRes = await query('SELECT keys, endpoint FROM push_subscriptions');
        const notificationPayload = JSON.stringify({
            title: `New ${requiresSubscription !== 'free' ? 'VIP ' : ''}Signal: ${pair} ${side}`,
            body: `${type} Trade. Entry: ${requiresSubscription !== 'free' ? 'Locked (VIP)' : entry}`,
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

// ... (Rest of file)
