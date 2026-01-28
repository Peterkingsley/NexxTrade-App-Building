import { Pool } from 'pg';

// This module is intended for server-side use only.
// It initializes the PostgreSQL connection pool using the DATABASE_URL environment variable.
// Do not import this file into client-side React components.

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // Warn in development, or throw in production depending on preference
  console.warn('WARNING: DATABASE_URL environment variable is not defined. Database connections will fail.');
}

// Configure the connection pool
const pool = new Pool({
  connectionString: connectionString,
  // Enable SSL for production environments (common for cloud databases like Neon, Heroku, AWS RDS)
  // rejectUnauthorized: false is often required for managed Postgres services that use self-signed certs
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  
  // Pool optimization settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

// Helper method for executing queries with logging
export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    // Log slow queries (> 100ms) or all queries in debug mode
    if (duration > 100) {
        console.log('Executed query', { text, duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('Database query error', { text, error });
    throw error;
  }
};

// Health check function to verify connection
export const checkDatabaseConnection = async () => {
    try {
        const res = await pool.query('SELECT NOW()');
        console.log('Database connected successfully:', res.rows[0].now);
        return true;
    } catch (err) {
        console.error('Database connection failed:', err);
        return false;
    }
};

export default pool;