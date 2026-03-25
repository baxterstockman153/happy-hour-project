import { Pool, QueryResult, QueryResultRow } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'happy_hour',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
      }
);

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
  process.exit(1);
});

/**
 * Convenience wrapper around pool.query that preserves generic typing.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}

/**
 * Gracefully shut down the connection pool.
 */
export async function closePool(): Promise<void> {
  await pool.end();
}

// Handle process shutdown signals
const shutdown = async () => {
  console.log('Shutting down database pool...');
  await closePool();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export { pool };
export default pool;
