import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatPortfolioDate, portfolioTemplateName, parseDashboardPortfolios } from '../src/lib/dashboard-portfolios';
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

test('portfolio dates use a placeholder for missing and invalid values', () => {
  for (const value of [null, '', ' ', 'not-a-date', '2026-99-99']) {
    assert.equal(formatPortfolioDate(value), '-');
  }
});

test('valid portfolio dates preserve Thai locale formatting', () => {
  const timestamp = '2026-10-22T10:30:00.000Z';
  const expected = new Date(timestamp).toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
  assert.equal(formatPortfolioDate(timestamp), expected);
});

test('display name agrees with the template chooser and handles unknown keys without rewriting them', () => {
  assert.equal(portfolioTemplateName('modern'), 'Modern University');
  assert.equal(portfolioTemplateName('minimal'), 'Minimal');
  assert.equal(portfolioTemplateName('classic'), 'Classic');
  assert.equal(portfolioTemplateName(null), 'Classic');
  assert.equal(portfolioTemplateName('future-template'), 'รูปแบบเดิม');
});
