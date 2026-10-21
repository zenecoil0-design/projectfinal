import { test } from 'node:test';
import assert from 'node:assert/strict';
import { confirmedCreatedId } from '../src/lib/portfolio-create';
const sent = { user_id: 'owner-a', title: 'พอร์ต Science', template_key: 'minimal' };
test('acknowledge only usable string ID and matching submitted owner/title/template', () => {
  assert.equal(confirmedCreatedId({ id: 'new-id', ...sent }, sent), 'new-id');
  for (const id of [undefined, null, 1, '', ' ', ' padded ']) assert.equal(confirmedCreatedId({ ...sent, id }, sent), null);
  for (const key of Object.keys(sent)) assert.equal(confirmedCreatedId({ ...sent, id: 'new-id', [key]: 'different' }, sent), null);
});
test('missing or unexpected response cannot acknowledge creation', () => {
  for (const value of [null, undefined, [], {}, 'id', { id: 'new-id' }]) assert.equal(confirmedCreatedId(value, sent), null);
});
