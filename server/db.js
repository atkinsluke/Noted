import pg from 'pg';

// Allow self-signed certificates from DO managed database
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { Pool } = pg;

// Use DATABASE_URL env var in production, or construct from individual vars
const connectionString = process.env.DATABASE_URL ||
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?sslmode=require`;

let pool = null;

export async function getDb() {
  if (pool) return pool;

  pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  // Test connection
  const client = await pool.connect();
  client.release();

  return pool;
}

// Helper to run a query and return all results as objects
export async function all(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

// Helper to run a query and return first result as object
export async function get(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows[0] || null;
}

// Helper to run a statement (INSERT, UPDATE, DELETE)
export async function run(sql, params = []) {
  await pool.query(sql, params);
}
