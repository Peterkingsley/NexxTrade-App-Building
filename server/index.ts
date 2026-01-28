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
                role VARCHAR(20) DEFAULT 'user',
                subscription_plan VARCHAR(20) DEFAULT 'free',
                subscription_expiry TIMESTAMPTZ,
                referral_code VARCHAR(20) UNIQUE,
                referred_by UUID REFERENCES users(id),
                wallet_balance DECIMAL(15, 2) DEFAULT 0.00,
                is_email_verified BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

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

        console.log("Database schema verified/updated successfully.");
    } catch (error) {
        console.error("Failed to initialize database:", error);
    }
};

// --- API Routes ---

app.post('/api/auth/login', async (req, res) => {
    const { provider, email, firstName, lastName, username, photoUrl, providerId } = req.body;

    try {
        if (!email && !username) {
            return res.status(400).json({ error: 'Email or Username required' });
        }

        let userRes;
        
        if (email) {
            userRes = await query('SELECT * FROM users WHERE email = $1', [email]);
        } else {
            const linkRes = await query('SELECT user_id FROM linked_accounts WHERE provider = $1 AND provider_user_id = $2', [provider, providerId]);
            if (linkRes.rows.length > 0) {
                userRes = await query('SELECT * FROM users WHERE id = $1', [linkRes.rows[0].user_id]);
            } else {
                 userRes = await query('SELECT * FROM users WHERE username = $1', [username]);
            }
        }

        let userId;
        let isNewUser = false;
        let userData;

        if (userRes && userRes.rows.length > 0) {
            userId = userRes.rows[0].id;
            userData = userRes.rows[0];
            await query('UPDATE users SET full_name = COALESCE($1, full_name), photo_url = COALESCE($2, photo_url), updated_at = NOW() WHERE id = $3', 
                [`${firstName} ${lastName || ''}`.trim(), photoUrl, userId]);
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
                INSERT INTO users (email, full_name, username, photo_url, referral_code, wallet_balance, is_email_verified)
                VALUES ($1, $2, $3, $4, $5, 0.00, $6)
                RETURNING *
            `, [finalEmail, fullName, finalUsername, photoUrl, refCode, provider === 'google']);
            
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

        res.json({
            id: userData.id,
            firstName: firstName,
            lastName: lastName,
            username: userData.username,
            photoUrl: userData.photo_url,
            referralCode: userData.referral_code,
            isNewUser
        });

    } catch (error) {
        console.error('Auth Error:', error);
        res.status(500).json({ error: 'Authentication failed' });
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