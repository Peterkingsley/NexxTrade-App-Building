import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { query, waitForDatabase } from './db';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Fix for __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS
app.use(cors());
app.use(express.json());

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

        console.log("Database schema verified/updated successfully.");
    } catch (error) {
        console.error("Failed to initialize database:", error);
    }
};

// --- API Routes ---

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
app.get('/api/user/settings/notifications', async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

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
app.put('/api/user/settings/notifications', async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const preferences = req.body;

    try {
        await query('UPDATE users SET notification_preferences = $1 WHERE id = $2', [JSON.stringify(preferences), userId]);
        res.json({ success: true });
    } catch (error) {
        console.error('Update Settings Error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// New endpoint to link an account from profile settings (enforces uniqueness)
app.post('/api/user/link-account', async (req, res) => {
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
app.get('/api/user/subscription', async (req, res) => {
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
app.post('/api/referrals/claim', async (req, res) => {
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

app.get('/api/signals', async (req, res) => {
  try {
    const checkTable = await query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'signals')");
    if (!checkTable.rows[0].exists) {
        return res.json([]); 
    }

    const result = await query(`
      SELECT 
        s.id, s.pair, s.type, s.side, s.status, 
        s.pnl_percentage as pnl,
        s.entry_price_display as entry,
        s.stop_loss_price as "stopLoss",
        s.is_sl_unlocked as "slUnlock",
        s.analysis_text as analysis,
        s.risk_management_text as "riskManagement",
        s.created_at,
        s.closed_at as "closedAt",
        COALESCE(
          (SELECT json_agg(json_build_object('price', st.target_price, 'hit', st.is_hit) ORDER BY st.target_order)
           FROM signal_targets st WHERE st.signal_id = s.id), '[]'::json
        ) as "tpTargets"
      FROM signals s
      ORDER BY s.created_at DESC
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

app.get('/api/referrals/my-stats', async (req, res) => {
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

app.get('/api/withdrawals', async (req, res) => {
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

app.post('/api/withdrawals', async (req, res) => {
    const { amount, network, address } = req.body;
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

// Create Signal
app.post('/api/admin/signals', ensureAdmin, async (req, res) => {
    const { pair, type, side, entry, stopLoss, analysis, targets } = req.body;
    const userId = getUserId(req);

    if (!pair || !entry || !stopLoss || !targets || !Array.isArray(targets)) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        await query('BEGIN');
        const signalRes = await query(`
            INSERT INTO signals (pair, type, side, entry_price_display, stop_loss_price, analysis_text, created_by, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
            RETURNING id
        `, [pair, type, side, entry, stopLoss, analysis, userId]);

        const signalId = signalRes.rows[0].id;

        for (let i = 0; i < targets.length; i++) {
            await query(`
                INSERT INTO signal_targets (signal_id, target_price, target_order, is_hit)
                VALUES ($1, $2, $3, false)
            `, [signalId, targets[i], i + 1]);
        }

        await query('COMMIT');
        res.json({ success: true, signalId });
    } catch (error) {
        await query('ROLLBACK');
        console.error('Create Signal Error:', error);
        res.status(500).json({ error: 'Failed to create signal' });
    }
});

// Close Signal
app.put('/api/admin/signals/:id/close', ensureAdmin, async (req, res) => {
    const { id } = req.params;
    const { pnl } = req.body;

    try {
        await query(`
            UPDATE signals 
            SET status = 'closed', pnl_percentage = $1, closed_at = NOW()
            WHERE id = $2
        `, [pnl, id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Close Signal Error:', error);
        res.status(500).json({ error: 'Failed to close signal' });
    }
});

// Delete Signal
app.delete('/api/admin/signals/:id', ensureAdmin, async (req, res) => {
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
app.post('/api/admin/academy', ensureAdmin, async (req, res) => {
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

// Send Notification
app.post('/api/admin/notifications', ensureAdmin, async (req, res) => {
    const { title, message, type } = req.body;
    // user_id NULL means global
    try {
        await query(`
            INSERT INTO notifications (type, title, message, user_id)
            VALUES ($1, $2, $3, NULL)
        `, [type, title, message]);
        res.json({ success: true });
    } catch (error) {
        console.error('Send Notification Error:', error);
        res.status(500).json({ error: 'Failed to send notification' });
    }
});


app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// --- SERVE FRONTEND (STATIC FILES) ---
// Resolve the 'dist' directory relative to this file
// server/index.ts is in /server, dist/ is in /dist (parent root)
const distPath = path.resolve(__dirname, '..', 'dist');

console.log('Serving static files from:', distPath);

if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));

    // Handle React routing, return all requests to React app
    // Use Regex /.*/ to match all routes, avoiding Express 5 string path syntax issues
    app.get(/.*/, (req, res) => {
        // Only serve index.html for non-API routes
        if (!req.path.startsWith('/api')) {
             res.sendFile(path.join(distPath, 'index.html'));
        } else {
             res.status(404).json({ error: 'API route not found' });
        }
    });
} else {
    console.error('CRITICAL: dist directory not found! Ensure `npm run build` ran successfully.');
    app.get(/.*/, (req, res) => {
        res.status(500).send('Server Error: Frontend build not found.');
    });
}

// --- Server Startup ---
const startServer = async () => {
    // Wait up to 30 seconds for DB to be ready
    const connected = await waitForDatabase(10, 3000);
    
    if (!connected) {
        console.error("CRITICAL: Could not connect to database after multiple attempts. Exiting process.");
        (process as any).exit(1); 
    }
    
    await initDb();
    
    app.listen(PORT, () => {
      console.log(`API Server running on http://localhost:${PORT}`);
    });
};

startServer();