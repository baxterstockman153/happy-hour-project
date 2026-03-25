/**
 * Global test setup / teardown.
 *
 * We mock the DB connection module so that no real Postgres (or PostGIS)
 * connection is required.  Individual test files call `jest.mock` with the
 * same module path; this file simply re-exports the mock helpers and
 * provides a `clearData` convenience function.
 */
import { resetMocks } from './mocks/db';

// Ensure JWT_SECRET is available for token generation in tests
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-happy-hour';

/**
 * Clear mock call data between tests so one test's mock setup
 * does not leak into another.
 */
export function clearData(): void {
  resetMocks();
}

afterEach(() => {
  clearData();
});
