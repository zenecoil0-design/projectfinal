import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { calculateAge } from '../src/lib/age';

const on = (year: number, month: number, day: number) => new Date(year, month - 1, day, 12);

test('age advances on the birthday, not before, including the year boundary and age zero', () => {
  assert.equal(calculateAge('2000-06-15', on(2040, 6, 14)), 39);
  assert.equal(calculateAge('2000-06-15', on(2040, 6, 15)), 40);
  assert.equal(calculateAge('2000-06-15', on(2040, 6, 16)), 40);
  assert.equal(calculateAge('2000-12-31', on(2040, 12, 30)), 39);
  assert.equal(calculateAge('2000-12-31', on(2041, 1, 1)), 40);
  assert.equal(calculateAge('2040-06-15', on(2040, 6, 15)), 0);
});

test('Feb 29 advances on Feb 29 in leap years and March 1 in ordinary years', () => {
  assert.equal(calculateAge('2000-02-29', on(2024, 2, 28)), 23);
  assert.equal(calculateAge('2000-02-29', on(2024, 2, 29)), 24);
  assert.equal(calculateAge('2000-02-29', on(2024, 3, 1)), 24);
  assert.equal(calculateAge('2000-02-29', on(2025, 2, 28)), 24);
  assert.equal(calculateAge('2000-02-29', on(2025, 3, 1)), 25);
  assert.equal(calculateAge('2000-02-29', on(2100, 2, 28)), 99);
  assert.equal(calculateAge('2000-02-29', on(2100, 3, 1)), 100);
});

test('empty, malformed, impossible, future dates and invalid references have no displayable age', () => {
  const reference = on(2040, 6, 15);
  for (const value of ['', ' ', 'wrong', '2000-6-15', '2000-06-15T00:00:00Z', '0000-01-01',
    '2000-00-01', '2000-13-01', '2000-01-00', '2000-04-31', '2001-02-29', '1900-02-29',
    '2040-06-16', '2041-01-01']) {
    assert.equal(calculateAge(value, reference), null, value);
  }
  assert.equal(calculateAge('2000-06-15', new Date(NaN)), null);
  assert.equal(calculateAge('2000-02-29', reference), 40);
});

test('calendar input and local reference days agree across negative, zero and positive UTC offsets', () => {
  const moduleUrl = new URL('../src/lib/age.ts', import.meta.url).href;
  const code = `import { calculateAge } from ${JSON.stringify(moduleUrl)};
    console.log(JSON.stringify([14,15,16].map(day => calculateAge('2000-06-15', new Date(2040,5,day,0,30)))));`;
  for (const TZ of ['America/Los_Angeles', 'UTC', 'Asia/Bangkok']) {
    const result = execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', code],
      { env: { ...process.env, TZ }, encoding: 'utf8' });
    assert.deepEqual(JSON.parse(result), [39, 40, 40], TZ);
  }
});
