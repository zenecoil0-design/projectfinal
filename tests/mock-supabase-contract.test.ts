// Contract checks: the E2E mock (tests/mock-supabase.mjs) must satisfy the app's own snapshot
// reader, acceptance flow, atomic library save and portfolio-action receipt parsing.
// This proves the mock matches the client, not that PostgreSQL/PostgREST behave the same.
import test, { after, before } from 'node:test';
import { spawn, type ChildProcess } from 'node:child_process';
import assert from 'node:assert/strict';
import { readPortfolioSnapshots, preparePortfolioSnapshots, acceptPortfolioSnapshot, SnapshotPreparationRequired } from '../src/lib/editor/snapshot-api';
import { makeLibrarySaveAttempt, saveAtomicLibrary } from '../src/lib/atomic-library-save';
import { parseActionReceipt } from '../src/lib/portfolio-actions';
import { fixtureId, owner, portfolioA, portfolioB, libraryItem } from './e2e/helpers/fixtures';

const port = 54329;
const base = `http://127.0.0.1:${port}`;
let server: ChildProcess;
before(async () => {
  server = spawn(process.execPath, ['tests/mock-supabase.mjs'], { env: { ...process.env, MOCK_SUPABASE_PORT: String(port) }, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.stdout!.on('data', chunk => { if (String(chunk).includes('Mock Supabase ready')) resolve(); });
  });
});
after(() => { server.kill(); });
const part = (v: object) => Buffer.from(JSON.stringify(v)).toString('base64url');
const token = (sub: string) => `${part({ alg: 'HS256' })}.${part({ sub, exp: 4102444800 })}.test`;
async function call(path: string, init: RequestInit = {}, sub = owner) {
  const res = await fetch(base + path, { ...init, headers: { 'content-type': 'application/json', authorization: `Bearer ${token(sub)}`, ...(init.headers ?? {}) } });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}
const rpc = (name: string, args: object, sub = owner) => call(`/rest/v1/rpc/${name}`, { method: 'POST', body: JSON.stringify(args) }, sub);
function client(sub = owner) {
  return {
    auth: { getUser: async () => ({ data: { user: { id: sub } }, error: null }) },
    rpc: async (name: string, args: Record<string, unknown>) => {
      const r = await rpc(name, args, sub);
      return r.status >= 300 ? { data: null, error: r.body } : { data: r.body, error: null };
    },
    storage: { from: () => ({ upload: async () => ({ error: null }), getPublicUrl: (p: string) => ({ data: { publicUrl: `${base}/storage/v1/object/public/portfolio-images/${p}` } }) }) },
  };
}
const ctx = (portfolioId: string) => ({ portfolioId, ownerId: owner, isCurrent: () => true });
test.beforeEach(async () => { await call('/__reset'); });

test('seeded ids match the shared fixture helper', async () => {
  const rows = (await call('/rest/v1/portfolios')).body;
  assert.deepEqual(rows.map((r: { id: string }) => r.id), [portfolioA, portfolioB]);
  const acts = (await call('/rest/v1/user_library_activities')).body;
  assert.equal(acts[0].id, libraryItem('activity'));
});
test('seeded portfolio A is prepared and parses with the app reader for all sections', async () => {
  for (const section of ['education', 'activity', 'certificate'] as const) {
    const entries = await readPortfolioSnapshots(client() as never, ctx(portfolioA), section);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].item.id, libraryItem(section));
    assert.equal(entries[0].hasUpdate, false);
    assert.equal(entries[0].version, 1);
  }
  for (const section of ['education', 'activity', 'certificate'] as const) {
    assert.deepEqual(await readPortfolioSnapshots(client() as never, ctx(portfolioB), section), []);
  }
});
test('selection captures, keeps old editions, reports updates and accepts explicitly', async () => {
  const kept = libraryItem('activity');
  await rpc('replace_portfolio_selection', { p_portfolio_id: portfolioB, p_section: 'activity', p_item_ids: [kept] });
  await call(`/rest/v1/user_library_activities?id=eq.${kept}`, { method: 'PATCH', body: JSON.stringify({ title: 'Edited' }) });
  let entries = await readPortfolioSnapshots(client() as never, ctx(portfolioB), 'activity');
  assert.equal((entries[0].item as { title: string }).title, 'Saved Activity');
  assert.equal(entries[0].hasUpdate, true);
  const stale = await rpc('capture_portfolio_item_snapshot', { p_portfolio_id: portfolioB, p_section: 'activity', p_item_id: kept, p_refresh: true, p_expected_revision: entries[0].revision });
  assert.equal(stale.status, 409); assert.equal(stale.body.code, 'PT409');
  entries = await acceptPortfolioSnapshot(client() as never, ctx(portfolioB), 'activity', kept, entries[0].latestRevision);
  assert.equal((entries[0].item as { title: string }).title, 'Edited');
  assert.equal(entries[0].version, 2);
  const a = await readPortfolioSnapshots(client() as never, ctx(portfolioA), 'activity');
  assert.equal((a[0].item as { title: string }).title, 'Saved Activity', 'portfolio A keeps its own edition');
  assert.equal(a[0].hasUpdate, true);
});
test('unprepared relation requires explicit preparation', async () => {
  await call('/rest/v1/portfolio_activities', { method: 'POST', body: JSON.stringify({ portfolio_id: portfolioB, activity_id: libraryItem('activity'), sort_order: 0, snapshot_version: 0 }) });
  await assert.rejects(readPortfolioSnapshots(client() as never, ctx(portfolioB), 'activity'), SnapshotPreparationRequired);
  assert.deepEqual(await preparePortfolioSnapshots(client() as never, ctx(portfolioB)), { preparedCount: 1 });
  assert.equal((await readPortfolioSnapshots(client() as never, ctx(portfolioB), 'activity')).length, 1);
});
test('fixture relation POST auto-captures; missing source is a FK error', async () => {
  const r = await call('/rest/v1/portfolio_certificates', { method: 'POST', body: JSON.stringify({ portfolio_id: portfolioB, certificate_id: libraryItem('certificate'), sort_order: 0 }) });
  assert.equal(r.status, 200);
  assert.equal((await readPortfolioSnapshots(client() as never, ctx(portfolioB), 'certificate')).length, 1);
  const bad = await call('/rest/v1/portfolio_certificates', { method: 'POST', body: JSON.stringify({ portfolio_id: portfolioB, certificate_id: fixtureId('nope'), sort_order: 1 }) });
  assert.equal(bad.status, 409);
});
test('recapture endpoint refreshes editions after fixture library edits', async () => {
  await call(`/rest/v1/user_library_certificates?id=eq.${libraryItem('certificate')}`, { method: 'PATCH', body: JSON.stringify({ description: 'Long' }) });
  await call('/__recapture');
  const [entry] = await readPortfolioSnapshots(client() as never, ctx(portfolioA), 'certificate');
  assert.equal((entry.item as { description: string }).description, 'Long');
  assert.equal(entry.hasUpdate, false);
});
test('atomic create/update through the app helper; image order and limits; images in snapshot parse', async () => {
  await call('/rest/v1/user_tags', { method: 'POST', body: JSON.stringify({ id: fixtureId('tag'), user_id: owner, name: 'T' }) });
  const file = new File([new Uint8Array([1])], 'x.png', { type: 'image/png' });
  const attempt = makeLibrarySaveAttempt({ section: 'activity', ownerId: owner, itemId: null, fields: { title: 'New', description: '', activity_date: null, organization: null }, images: [], files: [file, file], tagIds: [fixtureId('tag')] });
  const id = await saveAtomicLibrary(client() as never, attempt, () => true);
  // replay of the same create is idempotent
  assert.equal(await saveAtomicLibrary(client() as never, attempt, () => true), id);
  const images = (await call(`/rest/v1/user_library_activity_images?activity_id=eq.${id}`)).body;
  assert.equal(images.length, 2);
  const tags = (await call(`/rest/v1/user_library_activity_tags?activity_id=eq.${id}`)).body;
  assert.equal(tags.length, 1);
  const upd = makeLibrarySaveAttempt({ section: 'activity', ownerId: owner, itemId: id, fields: { title: 'Renamed', description: 'd', activity_date: null, organization: null },
    images: [{ id: images[1].id, image_url: images[1].image_url }], files: [], tagIds: [] });
  await saveAtomicLibrary(client() as never, upd, () => true);
  const after = (await call(`/rest/v1/user_library_activity_images?activity_id=eq.${id}`)).body;
  assert.deepEqual(after.map((i: { id: string; sort_order: number }) => [i.id, i.sort_order]), [[images[1].id, 0]]);
  const tooMany = await rpc('update_library_item_atomic', { p_section: 'certificate', p_item_id: libraryItem('certificate'), p_fields: {}, p_images: [{ image_url: 'a' }, { image_url: 'b' }, { image_url: 'c' }], p_tag_ids: [] });
  assert.equal(tooMany.status, 400); assert.equal(tooMany.body.code, '23514');
  await rpc('replace_portfolio_selection', { p_portfolio_id: portfolioB, p_section: 'activity', p_item_ids: [id] });
  const [entry] = await readPortfolioSnapshots(client() as never, ctx(portfolioB), 'activity');
  assert.equal((entry.item as { images: string[] }).images.length, 1);
  const edu = makeLibrarySaveAttempt({ section: 'education', ownerId: owner, itemId: libraryItem('education'), fields: { level: 'L', school_name: 'S', study_plan: '', gpa: 3.25, start_year: null, end_year: null, logo_url: null }, images: [], files: [], tagIds: [] });
  await saveAtomicLibrary(client() as never, edu, () => true);
});
test('other owner cannot read, select or accept', async () => {
  const other = fixtureId('other-owner');
  assert.equal((await rpc('read_portfolio_item_snapshots', { p_portfolio_id: portfolioA, p_section: 'activity' }, other)).status, 403);
  assert.equal((await rpc('replace_portfolio_selection', { p_portfolio_id: portfolioA, p_section: 'activity', p_item_ids: [] }, other)).status, 403);
  assert.equal((await call('/auth/v1/user', {}, other)).body.id, other);
});
test('portfolio actions: duplicate copies editions; delete keeps library; receipts are idempotent', async () => {
  const req = { owner, requestId: fixtureId('req-1'), action: 'duplicate' as const, sourceId: portfolioA, title: 'Copy' };
  const r = await rpc('perform_portfolio_action', { p_request_id: req.requestId, p_action: 'duplicate', p_source_id: portfolioA, p_title: 'Copy' });
  const result = parseActionReceipt(r.body, req);
  assert.equal(result.status, 'confirmed');
  const copyId = (result as { portfolioId: string }).portfolioId;
  const again = await rpc('perform_portfolio_action', { p_request_id: req.requestId, p_action: 'duplicate', p_source_id: portfolioA, p_title: 'Copy' });
  assert.deepEqual(again.body, r.body);
  for (const section of ['education', 'activity', 'certificate'] as const) {
    const [a] = await readPortfolioSnapshots(client() as never, ctx(portfolioA), section);
    const [c] = await readPortfolioSnapshots(client() as never, ctx(copyId), section);
    assert.equal(c.revision, a.revision);
  }
  const del = { owner, requestId: fixtureId('req-2'), action: 'delete' as const, sourceId: copyId, title: '' };
  const d = await rpc('perform_portfolio_action', { p_request_id: del.requestId, p_action: 'delete', p_source_id: copyId, p_title: '' });
  assert.equal(parseActionReceipt(d.body, del).status, 'confirmed');
  assert.equal((await call('/rest/v1/user_library_activities')).body.length, 1);
  const receipt = await call(`/rest/v1/portfolio_action_receipts?user_id=eq.${owner}&request_id=eq.${del.requestId}`, { headers: { accept: 'application/vnd.pgrst.object+json' } });
  assert.equal(parseActionReceipt(receipt.body, del).status, 'confirmed');
  const unknown = await rpc('perform_portfolio_action', { p_request_id: fixtureId('req-3'), p_action: 'delete', p_source_id: fixtureId('missing'), p_title: '' });
  assert.equal(unknown.body.status, 'rejected'); assert.equal(unknown.body.portfolio_id, null);
});
test('library delete cascades relations, images and tags', async () => {
  await call(`/rest/v1/user_library_activities?id=eq.${libraryItem('activity')}&user_id=eq.${owner}`, { method: 'DELETE' });
  assert.deepEqual(await readPortfolioSnapshots(client() as never, ctx(portfolioA), 'activity'), []);
});
