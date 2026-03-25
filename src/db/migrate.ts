import fs from 'fs';
import path from 'path';
import { pool, query, closePool } from './connection';

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * Ensure the _migrations tracking table exists.
 */
async function ensureMigrationsTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         SERIAL PRIMARY KEY,
      filename   VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );
  `);
}

/**
 * Return the set of already-applied migration filenames.
 */
async function getAppliedMigrations(): Promise<Set<string>> {
  const result = await query<{ filename: string }>(
    'SELECT filename FROM _migrations ORDER BY id'
  );
  return new Set(result.rows.map((r) => r.filename));
}

/**
 * Run all pending "up" migrations (files matching NNN_*.sql, excluding *_down.sql).
 */
async function up(): Promise<void> {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql') && !f.includes('down'))
    .sort();

  let ranCount = 0;

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  Skipping (already applied): ${file}`);
      continue;
    }

    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    console.log(`  Applying: ${file}`);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO _migrations (filename) VALUES ($1)',
        [file]
      );
      await client.query('COMMIT');
      ranCount++;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  if (ranCount === 0) {
    console.log('  No pending migrations.');
  } else {
    console.log(`  Applied ${ranCount} migration(s).`);
  }
}

/**
 * Roll back the last applied migration by running the corresponding *_down.sql file.
 */
async function down(): Promise<void> {
  await ensureMigrationsTable();

  const result = await query<{ filename: string }>(
    'SELECT filename FROM _migrations ORDER BY id DESC LIMIT 1'
  );

  if (result.rows.length === 0) {
    console.log('  No migrations to roll back.');
    return;
  }

  const lastMigration = result.rows[0].filename;
  // Derive the down file: 001_initial_schema.sql -> 002_down.sql convention
  // We look for any *_down.sql file in the migrations directory
  const downFile = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('_down.sql'))
    .sort()
    .pop();

  if (!downFile) {
    console.error('  No down migration file found.');
    process.exit(1);
  }

  const filePath = path.join(MIGRATIONS_DIR, downFile);
  const sql = fs.readFileSync(filePath, 'utf-8');

  console.log(`  Rolling back: ${lastMigration} (using ${downFile})`);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('DELETE FROM _migrations WHERE filename = $1', [
      lastMigration,
    ]);
    await client.query('COMMIT');
    console.log('  Rollback complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * CLI entry point: npx tsx src/db/migrate.ts up|down
 */
async function main(): Promise<void> {
  const command = process.argv[2];

  if (command !== 'up' && command !== 'down') {
    console.error('Usage: npx tsx src/db/migrate.ts <up|down>');
    process.exit(1);
  }

  console.log(`Running migration: ${command}`);
  try {
    if (command === 'up') {
      await up();
    } else {
      await down();
    }
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await closePool();
  }
}

main();
