import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { schema } from './schema';
import { config } from '../config/env';
const pool = new Pool({
  connectionString: config.database.url,
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
// Test connection
pool.on('connect', () => {
  console.log('[DB] Connected to PostgreSQL');
});
pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client', err);
  process.exit(-1);
});
export const db = drizzle(pool, { schema });
// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('[DB] Closing PostgreSQL connection pool...');
  await pool.end();
  process.exit(0);
});