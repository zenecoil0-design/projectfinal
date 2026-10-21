import { test } from 'node:test';
import assert from 'node:assert/strict';
import { confirmedCreatedId, createAccountChanged } from '../src/lib/portfolio-create';
const sent = { user_id: 'owner-a', title: 'พอร์ต Science', template_key: 'minimal' };
test('acknowledge only usable string ID and matching submitted owner/title/template', () => {
  assert.equal(confirmedCreatedId({ id: 'new-id', ...sent }, sent), 'new-id');
  for (const id of [undefined, null, 1, '', ' ', ' padded ']) assert.equal(confirmedCreatedId({ ...sent, id }, sent), null);
  for (const key of Object.keys(sent)) assert.equal(confirmedCreatedId({ ...sent, id: 'new-id', [key]: 'different' }, sent), null);
});
test('missing or unexpected response cannot acknowledge creation', () => {
  for (const value of [null, undefined, [], {}, 'id', { id: 'new-id' }]) assert.equal(confirmedCreatedId(value, sent), null);
});
test('early account events invalidate an unbound draft while initial binding and same-owner refresh do not', () => {
  assert.equal(createAccountChanged(undefined, 'a', 'INITIAL_SESSION'), false);
  assert.equal(createAccountChanged(undefined, null, 'INITIAL_SESSION'), false);
  assert.equal(createAccountChanged(undefined, 'b', 'SIGNED_IN'), true);
  assert.equal(createAccountChanged(undefined, 'a', 'TOKEN_REFRESHED'), true);
  assert.equal(createAccountChanged('a', 'a', 'TOKEN_REFRESHED'), false);
  assert.equal(createAccountChanged('a', 'b', 'SIGNED_IN'), true);
  assert.equal(createAccountChanged(null, 'a', 'SIGNED_IN'), true);
  assert.equal(createAccountChanged('a', null, 'SIGNED_OUT'), true);
});
