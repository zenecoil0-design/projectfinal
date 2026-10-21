import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDashboardPortfolios } from '../src/lib/dashboard-portfolios';
const row = { id: 'a', title: null, template_key: 'future-template', created_at: null, updated_at: null };
test('successful empty array is distinct from malformed responses', () => {
  assert.deepEqual(parseDashboardPortfolios([]), []);
  for (const value of [null, undefined, {}, '', { message: 'private' }, [null], ['bad'], [{ id: 'a' }]]) {
    assert.throws(() => parseDashboardPortfolios(value));
  }
});
test('UI-compatible nullable/empty/long names and unknown template are accepted without new rules', () => {
  for (const title of [null, '', ' ', 'ชื่อไทย English'.repeat(100)]) assert.equal(parseDashboardPortfolios([{ ...row, title }])[0].title, title);
  assert.deepEqual(parseDashboardPortfolios([row]), [row]);
});
test('incorrect field types cannot acknowledge a list', () => {
  for (const key of Object.keys(row)) assert.throws(() => parseDashboardPortfolios([{ ...row, [key]: 7 }]));
});
