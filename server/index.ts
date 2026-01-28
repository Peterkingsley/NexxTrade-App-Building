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

// --- API Routes ---

// GET /api/signals - Fetch all signals with their targets
app.get('/api/signals', async (req, res) => {
  try {
    // We use a subquery to fetch targets as a JSON array for each signal
    // This allows fetching the complete signal structure in a single query
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

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`API Server running on http://localhost:${PORT}`);
});