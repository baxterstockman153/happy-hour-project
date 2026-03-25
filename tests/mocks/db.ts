/**
 * Mock for src/db/connection
 *
 * Provides a jest-mocked `query` function and helpers to configure
 * return values for different SQL query patterns in tests.
 */
import { QueryResult, QueryResultRow } from 'pg';

// The core mock function
export const query = jest.fn<Promise<QueryResult<any>>, [string, unknown[]?]>();
export const closePool = jest.fn<Promise<void>, []>();
export const pool = {
  query,
  end: closePool,
  on: jest.fn(),
};

export default pool;

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Build a minimal QueryResult shape from an array of rows.
 */
function makeResult<T extends QueryResultRow>(rows: T[], rowCount?: number): QueryResult<T> {
  return {
    rows,
    rowCount: rowCount ?? rows.length,
    command: '',
    oid: 0,
    fields: [],
  };
}

/**
 * Configure `query` to resolve with the given rows on its next call.
 */
export function mockQueryResult<T extends QueryResultRow>(rows: T[], rowCount?: number): void {
  query.mockResolvedValueOnce(makeResult(rows, rowCount));
}

/**
 * Configure `query` to reject with an error on its next call.
 */
export function mockQueryError(error: Error): void {
  query.mockRejectedValueOnce(error);
}

/**
 * Reset all mock state between tests.
 */
export function resetMocks(): void {
  query.mockReset();
  closePool.mockReset();
}
