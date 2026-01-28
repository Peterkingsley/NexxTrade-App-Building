import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { query } from './db';
import crypto from 'crypto';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS to allow requests from the frontend
app.use(cors());
app.use(express.json());

// Helper: Generate a random referral code
const generateReferralCode = () => {
    return 'NEXX-' + crypto.randomBytes(3).toString('hex').toUpperCase();
};

// Middleware helper to get User ID from headers (Simple Auth)
const getUserId = (req: express.Request): string | null => {
    const userId = req.headers['x-user-id'];
    return typeof userId === 'string' ? userId : null;
};

// --- API Routes ---

// POST /api/auth/login - Handle Sign Up / Login for Google, Telegram, Email
app.post('/api/auth/login', async (req, res) => {
    const { provider, email, firstName, lastName, username, photoUrl, providerId } = req.body;

    try {
        if (!email && !username) {
            return res.status(400).json({ error: 'Email or Username required' });
        }

        // 1. Check if user exists by Email (for Google/Email) or Username (Telegram)
        // We prioritize email for uniqueness
        let userRes;
        
        if (email) {
            userRes = await query('SELECT * FROM users WHERE email = $1', [email]);
        } else {
            // Telegram might not provide email, use username match or provider link
            // First check linked accounts to find user_id
            const linkRes = await query('SELECT user_id FROM linked_accounts WHERE provider = $1 AND provider_user_id = $2', [provider, providerId]);
            if (linkRes.rows.length > 0) {
                userRes = await query('SELECT * FROM users WHERE id = $1', [linkRes.rows[0].user_id]);
            } else {
                // Fallback to username check
                 userRes = await query('SELECT * FROM users WHERE username = $1', [username]);
            }
        }

        let userId;
        let isNewUser = false;
        let userData;

        if (userRes && userRes.rows.length > 0) {
            // --- EXISTING USER ---
            userId = userRes.rows[0].id;
            userData = userRes.rows[0];
            
            // Update latest info if provided
            await query('UPDATE users SET full_name = COALESCE($1, full_name), photo_url = COALESCE($2, photo_url), updated_at = NOW() WHERE id = $3', 
                [`${firstName} ${lastName || ''}`.trim(), photoUrl, userId]);
        } else {
            // --- NEW USER ---
            isNewUser = true;
            const refCode = generateReferralCode();
            const fullName = `${firstName} ${lastName || ''}`.trim();
            
            // Handle cases where email might be missing (Telegram sometimes)
            // If email is missing, generate a dummy one based on provider ID to satisfy NOT NULL constraint
            const finalEmail = email || `${providerId}@telegram.nexxtrade.com`;

            const insertRes = await query(`
                INSERT INTO users (email, full_name, username, photo_url, referral_code, wallet_balance, is_email_verified)
                VALUES ($1, $2, $3, $4, $5, 0.00, $6)
                RETURNING *
            `, [finalEmail, fullName, username || `user_${crypto.randomBytes(4).toString('hex')}`, photoUrl, refCode, provider === 'google']);
            
            userId = insertRes.rows[0].id;
            userData = insertRes.rows[0];
        }

        // 2. Link Account (Idempotent)
        if (providerId) {
            await query(`
                INSERT INTO linked_accounts (user_id, provider, provider_user_id)
                VALUES ($1, $2, $3)
                ON CONFLICT (provider, provider_user_id) DO NOTHING
            `, [userId, provider, providerId.toString()]);
        }

        // Return the user profile
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


// GET /api/signals - Fetch all signals with their targets
app.get('/api/signals', async (req, res) => {
  try {
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

// --- Referral & Withdrawal Routes (Updated to use Real User) ---

// GET /api/referrals/my-stats
app.get('/api/referrals/my-stats', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        
        const [userRes, refRes, withdrawRes] = await Promise.all([
            query('SELECT wallet_balance, referral_code FROM users WHERE id = $1', [userId]),
            query('SELECT COUNT(*) as count FROM users WHERE referred_by = $1', [userId]),
            query('SELECT COALESCE(SUM(amount), 0) as total_withdrawn FROM withdrawals WHERE user_id = $1 AND status = $2', [userId, 'Completed'])
        ]);

        if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

        const user = userRes.rows[0];
        const referralCount = parseInt(refRes.rows[0].count);
        const totalWithdrawn = parseFloat(withdrawRes.rows[0].total_withdrawn);
        const pendingBalance = parseFloat(user.wallet_balance);
        const totalEarnings = pendingBalance + totalWithdrawn;

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

// GET /api/withdrawals
app.get('/api/withdrawals', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

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

// POST /api/withdrawals
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

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`API Server running on http://localhost:${PORT}`);
});