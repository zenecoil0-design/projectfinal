import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTagLoader, type TagResult, type TagState } from '../src/lib/editor/tag-loader';

const complete: TagResult = { tags: [{ id: 't', name: 'Trusted' }], relations: [{ itemId: 'a', tagId: 't' }], tagsError: false, relationsError: false };
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }

test('metadata failures/rejections retain the last complete snapshot, including successful empty responses', async () => {
  const loader = createTagLoader(); let state!: TagState;
  const publish = (next: TagState) => { state = next; };
  await loader.load('owner', async () => complete, publish);
  const snapshot = state.snapshot;
  for (const [tagsError, relationsError] of [[true, false], [false, true], [true, true]]) {
    await loader.load('owner', async () => ({ ...complete, tags: tagsError ? null : complete.tags, relations: relationsError ? null : complete.relations, tagsError, relationsError }), publish);
    assert.equal(state.snapshot, snapshot); assert.equal(state.loading, false);
    assert.equal(state.tagsError, tagsError); assert.equal(state.relationsError, relationsError);
  }
  await loader.load('owner', async () => { throw new Error('Network unavailable'); }, publish);
  assert.equal(state.snapshot, snapshot); assert.equal(state.tagsError, true); assert.equal(state.relationsError, true);
  await loader.load('owner', async () => ({ ...complete, tags: [], relations: [] }), publish);
  assert.deepEqual(state.snapshot, { tags: [], relations: [] }); assert.equal(state.tagsError, false); assert.equal(state.relationsError, false);
});

test('concurrent retries share a request; a new owner supersedes it and cannot receive old success or error', async () => {
  for (const fail of [false, true]) {
    const loader = createTagLoader(); let calls = 0; const updates: TagState[] = [];
    const old = deferred<TagResult>();
    const query = () => { calls++; return old.promise; };
    const first = loader.load('account-a/portfolio-a', query, state => updates.push(state));
    assert.equal(loader.load('account-a/portfolio-a', query, state => updates.push(state)), first);
    await Promise.resolve(); assert.equal(calls, 1);
    await loader.load('account-b/portfolio-b', async () => ({ ...complete, tags: [{ id: 'new', name: 'New owner' }] }), state => updates.push(state));
    const count = updates.length;
    old.resolve({ ...complete, tagsError: fail }); await first;
    assert.equal(updates.length, count); assert.equal(updates.at(-1)!.snapshot!.tags[0].id, 'new');
  }
});

test('unmount invalidates pending callbacks, including reuse after cleanup, without publishing into the next lifetime', async () => {
  const loader = createTagLoader(); const old = deferred<TagResult>(); const updates: TagState[] = [];
  const pending = loader.load('owner', () => old.promise, state => updates.push(state));
  loader.invalidate();
  await loader.load('owner', async () => ({ ...complete, tags: [] }), state => updates.push(state));
  const count = updates.length; old.resolve(complete); await pending;
  assert.equal(updates.length, count); assert.deepEqual(updates.at(-1)!.snapshot!.tags, []);
});
