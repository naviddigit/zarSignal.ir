import assert from 'node:assert/strict';
import test from 'node:test';
import { describeDatabaseError } from '../src/server/database-health';

test('database errors expose actionable development states without leaking credentials', () => {
  assert.equal(describeDatabaseError(new Error("P1001: Can't reach database server")).code, 'connection_refused');
  assert.equal(describeDatabaseError(new Error('P1000: Authentication failed')).code, 'authentication_failed');
  assert.equal(describeDatabaseError(new Error('relation users does not exist')).code, 'migration_required');
  assert.equal(describeDatabaseError(new Error('unexpected')).code, 'unknown');
  assert.doesNotMatch(describeDatabaseError(new Error('postgresql://')).message, /password|secret/i);
});
