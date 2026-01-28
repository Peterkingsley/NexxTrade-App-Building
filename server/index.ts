import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { query } from './db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS to allow requests from the frontend (usually port 3000 or 5173)
app.use(cors());
app.use(express.json());

// Helper to get a demo user ID for testing since we don't have full auth sync yet
const getDemoUserId = async () => {
    const res = await query('SELECT id FROM users LIMIT 1');
    if (res.rows.length > 0) return res.rows[0].id;
    
    // Create one if not exists
    const newRes = await query(`
        INSERT INTO users (email, full_name, username, wallet_balance, referral_code)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
    `, ['demo@nexxtrade.com', 'Demo User', 'nexx_demo', 150.00, 'NEXX-DEMO']);
    return newRes.rows[0].id;
};

// --- API Routes ---

// GET /api/signals - Fetch all signals with their targets
app.get('/api/signals', async (req, res) => {
  try {
    // We use a subquery to fetch targets as a JSON array for each signal
    const result = await query(`
      SELECT 
        s.id, 
        s.pair, 
        s.type, 
        s.side, 
        s.status, 
        s.pnl_percentage as pnl,
        s.entry_price_display as entry,
        s.stop_loss_price as "stopLoss",
        s.is_sl_unlocked as "slUnlock",
        s.analysis_text as analysis,
        s.risk_management_text as "riskManagement",
        s.created_at,
        s.closed_at as "closedAt",
        COALESCE(
          (
            SELECT json_agg(json_build_object('price', st.target_price, 'hit', st.is_hit) ORDER BY st.target_order)
            FROM signal_targets st
            WHERE st.signal_id = s.id
          ),
          '[]'::json
        ) as "tpTargets"
      FROM signals s
      ORDER BY s.created_at DESC
    `);

    const signals = result.rows.map(row => {
      // Calculate timeAgo helper
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
        pnl: Number(row.pnl), // Ensure number type
        tpTargets: row.tpTargets,
        timeAgo
      };
    });

    res.json(signals);
  } catch (error) {
    console.error('Error fetching signals:', error);
    res.status(500).json({ error: 'Failed to fetch signals from database' });
  }
});

// --- Referral & Withdrawal Routes ---

// GET /api/referrals/my-stats
app.get('/api/referrals/my-stats', async (req, res) => {
    try {
        // In a real app, req.user.id from middleware. Here, use demo user.
        const userId = await getDemoUserId();
        
        // Parallel queries
        const [userRes, refRes, withdrawRes] = await Promise.all([
            query('SELECT wallet_balance, referral_code FROM users WHERE id = $1', [userId]),
            query('SELECT COUNT(*) as count FROM users WHERE referred_by = $1', [userId]),
            query('SELECT COALESCE(SUM(amount), 0) as total_withdrawn FROM withdrawals WHERE user_id = $1 AND status = $2', [userId, 'Completed'])
        ]);

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
        const userId = await getDemoUserId();
        const result = await query('SELECT * FROM withdrawals WHERE user_id = $1 ORDER BY requested_at DESC', [userId]);
        
        // Map DB columns to frontend interface
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
        const userId = await getDemoUserId();
        
        // Check balance
        const userRes = await query('SELECT wallet_balance FROM users WHERE id = $1', [userId]);
        const currentBalance = parseFloat(userRes.rows[0].wallet_balance);
        
        if (currentBalance < amount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Transaction start
        await query('BEGIN');
        
        // Deduct balance
        await query('UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2', [amount, userId]);
        
        // Insert withdrawal
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