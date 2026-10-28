import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { snapshotLibraryDatabase, snapshotProposal, TAG_A, TAG_B } from './helpers/snapshot';
import { actionDatabase } from './helpers/portfolio-actions';
import { asUser, A, B, PA, PB, LA, LB, sections } from './helpers/baseline';

const newItem = '40000000-0000-0000-0000-000000000001';
const requestId = '50000000-0000-0000-0000-000000000001';
type Snapshot = { data: { item: { title: string }; images: { image_url: string }[] }; revision: string; version: number; latest_revision: string };
type Action = { status: string; portfolio_id: string };

for (const [kind, plural] of sections) {
  test(`${kind}: create commits one complete item, rolls back late failure and replays without resurrection`, async () => {
    const db = await snapshotLibraryDatabase();
    try {
      await db.exec(snapshotProposal('atomic-library-create'));
      const fields = kind === 'education'
        ? { school_name: 'New school', level: 'School', logo_url: 'new-logo.png' }
        : { title: 'New item', description: 'New body' };
      const images = kind === 'education' ? [] : [{ image_url: 'second.png' }, { image_url: 'first.png' }];
      const args = [kind, newItem, JSON.stringify(fields), JSON.stringify(images), [TAG_A]];
      const create = () => db.query<{ result: { id: string; status: string } }>('SELECT create_library_item_atomic($1,$2,$3,$4,$5::uuid[]) AS result', args);

      await db.exec(`CREATE FUNCTION fail_create_tags() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'late create failure'; END $$;
        CREATE TRIGGER fail_create_tags BEFORE INSERT ON user_library_${kind}_tags FOR EACH ROW EXECUTE FUNCTION fail_create_tags();`);
      await asUser(db, A);
      await assert.rejects(create(), /late create failure/);
      assert.equal((await db.query(`SELECT * FROM user_library_${plural} WHERE id=$1`, [newItem])).rows.length, 0);
      assert.equal((await db.query('TABLE library_create_receipts')).rows.length, 0);
      if (kind !== 'education') assert.equal((await db.query(`SELECT * FROM user_library_${kind}_images WHERE ${kind}_id=$1`, [newItem])).rows.length, 0);

      await db.exec(`RESET ROLE; DROP TRIGGER fail_create_tags ON user_library_${kind}_tags`);
      await asUser(db, A);
      const first = (await create()).rows[0].result;
      assert.deepEqual(first, { id: newItem, status: 'confirmed' });
      assert.deepEqual((await create()).rows[0].result, first);
      assert.equal((await db.query('TABLE library_create_receipts')).rows.length, 1);
      assert.equal((await db.query(`SELECT * FROM user_library_${plural} WHERE id=$1`, [newItem])).rows.length, 1);
      await db.query('SELECT replace_portfolio_selection($1,$2,$3::uuid[])', [PA, kind, [newItem, LA]]);
      const snap = (await db.query<{ result: { data: { item: Record<string, unknown>; images: { image_url: string }[] } } }>(
        'SELECT capture_portfolio_item_snapshot($1,$2,$3) AS result', [PA, kind, newItem])).rows[0].result;
      for (const [key, value] of Object.entries(fields)) assert.equal(snap.data.item[key], value);
      assert.deepEqual(snap.data.images.map(i => i.image_url), images.map(i => i.image_url));
      const changedFields = { ...fields, ...(kind === 'education' ? { school_name: 'Later edit' } : { title: 'Later edit' }) };
      await assert.rejects(db.query('SELECT create_library_item_atomic($1,$2,$3,$4,$5::uuid[])', [kind, newItem, JSON.stringify(changedFields), JSON.stringify(images), [TAG_A]]), /different arguments/);

      // The receipt verifies the historical create; replay must never revert later edits.
      await db.exec('RESET ROLE');
      await db.query(`UPDATE user_library_${plural} SET ${kind === 'education' ? 'school_name' : 'title'}='Later edit' WHERE id=$1`, [newItem]);
      await asUser(db, A);
      await create();
      assert.equal((await db.query<{ value: string }>(`SELECT ${kind === 'education' ? 'school_name' : 'title'} AS value FROM user_library_${plural} WHERE id=$1`, [newItem])).rows[0].value, 'Later edit');
      await assert.rejects(db.exec('DELETE FROM library_create_receipts'), /permission denied/);
      await db.exec('RESET ROLE');
      await asUser(db, B);
      assert.equal((await db.query('TABLE library_create_receipts')).rows.length, 0);
      await assert.rejects(create(), { code: '23505' }); // plain INSERT cannot claim an existing item ID
      await db.exec('RESET ROLE');
      await asUser(db, A);
      await db.query(`DELETE FROM user_library_${plural} WHERE id=$1`, [newItem]);
      assert.deepEqual((await create()).rows[0].result, first);
      assert.equal((await db.query(`SELECT * FROM user_library_${plural} WHERE id=$1`, [newItem])).rows.length, 0);
      assert.equal((await db.query(`SELECT * FROM portfolio_${plural} WHERE portfolio_id=$1 AND ${kind}_id=$2`, [PA, newItem])).rows.length, 0);
    } finally { await db.close(); }
  });
}

test('create rejects foreign tags, injected fields, invalid shape and excess images without partial rows', async () => {
  const db = await snapshotLibraryDatabase();
  try {
    await db.exec(snapshotProposal('atomic-library-create'));
    await asUser(db, A);
    const call = (fields: unknown, images: unknown = [], tags: unknown = []) => db.query(
      "SELECT create_library_item_atomic('certificate',$1,$2,$3,$4::uuid[])", [newItem, JSON.stringify(fields), JSON.stringify(images), tags]);
    await assert.rejects(call({ title: 'Test' }, [], [TAG_B]), /Tag access denied/);
    await assert.rejects(call({ title: 'Test', user_id: B }), /Unsupported field/);
    await assert.rejects(call({ title: 'Test', id: LB }), /Unsupported field/);
    await assert.rejects(call({ title: 'Test' }, [{ image_url: 'one' }, { image_url: 'two' }, { image_url: 'three' }]), /Image limit exceeded/);
    await assert.rejects(call(null), /Invalid create payload/);
    await assert.rejects(call({ title: '  ' }), /Title required/);
    await assert.rejects(call({ title: ['invalid'] }), /Invalid field type/);
    assert.equal((await db.query('SELECT * FROM user_library_certificates WHERE id=$1', [newItem])).rows.length, 0);
    assert.equal((await db.query('TABLE library_create_receipts')).rows.length, 0);
    await db.exec('RESET ROLE; SET ROLE anon');
    await assert.rejects(call({ title: 'Test' }), /permission denied/);
  } finally { await db.close(); }
});

async function copyDatabase() {
  const db = await actionDatabase();
  await db.exec(readFileSync(new URL('../supabase/migrations/20261026175325_profile_age_override.sql', import.meta.url), 'utf8'));
  await db.exec(snapshotProposal('portfolio-item-snapshots'));
  await db.exec(snapshotProposal('snapshot-portfolio-copy'));
  return db;
}

test('duplicate keeps all original snapshots, image order, hidden sections, colors and manual age', async () => {
  const db = await copyDatabase();
  try {
    const palette = JSON.stringify({ primary: '#A13A50', secondary: '#ABCDEF', text: '#703344' });
    await db.query("UPDATE portfolios SET template_key='minimal',theme_color=$2 WHERE id=$1", [PA, palette]);
    await db.query("INSERT INTO profiles(portfolio_id,age_mode,manual_age) VALUES($1,'manual',0)", [PA]);
    await db.query("INSERT INTO portfolio_section_visibility VALUES($1,'activity',false),($1,'toc',false)", [PA]);
    for (const kind of ['activity', 'certificate']) {
      await db.query(`INSERT INTO user_library_${kind}_images(${kind}_id,image_url,sort_order) VALUES($1,'second.png',1),($1,'first.png',0)`, [LA]);
    }
    await asUser(db, A);
    const capture = async (portfolio: string, kind: string, refresh = false, rev: string | null = null) =>
      (await db.query<{ result: Snapshot }>('SELECT capture_portfolio_item_snapshot($1,$2,$3,$4,$5) AS result', [portfolio, kind, LA, refresh, rev])).rows[0].result;
    const originals = new Map<string, Snapshot>();
    for (const [kind, plural] of sections) {
      await db.query(`INSERT INTO user_library_${plural}(id,user_id,title) VALUES($1,$2,'Other selected item')`, [newItem, A]);
      await db.query('SELECT replace_portfolio_selection($1,$2,$3::uuid[])', [PA, kind, [newItem, LA]]);
      if (kind === 'certificate') {
        await db.query(`UPDATE user_library_${plural} SET title='Accepted version two' WHERE id=$1`, [LA]);
        const pending = await capture(PA, kind);
        await capture(PA, kind, true, pending.latest_revision);
      }
      originals.set(kind, await capture(PA, kind));
      // Change the library after capture; copying must not recapture these changes.
      await db.query(`UPDATE user_library_${plural} SET title='Latest source' WHERE id=$1`, [LA]);
    }
    await db.exec('RESET ROLE');
    for (const kind of ['activity', 'certificate']) {
      await db.query(`UPDATE user_library_${kind}_images SET image_url='latest-source.png' WHERE ${kind}_id=$1 AND sort_order=0`, [LA]);
    }
    await asUser(db, A);
    const copyArgs = [requestId, 'duplicate', PA, 'Snapshot copy'];
    const first = (await db.query<{ result: Action }>('SELECT perform_portfolio_action($1,$2,$3,$4) AS result', copyArgs)).rows[0].result;
    assert.equal(first.status, 'confirmed');
    assert.deepEqual((await db.query<{ result: Action }>('SELECT perform_portfolio_action($1,$2,$3,$4) AS result', copyArgs)).rows[0].result, first);
    for (const [kind, plural] of sections) {
      const copy = await capture(first.portfolio_id, kind);
      const original = originals.get(kind)!;
      assert.deepEqual(copy.data, original.data);
      assert.equal(copy.revision, original.revision);
      assert.equal(copy.version, original.version);
      assert.notEqual(copy.latest_revision, copy.revision);
      assert.deepEqual((await db.query(`SELECT ${kind}_id AS item,sort_order FROM portfolio_${plural} WHERE portfolio_id=$1 ORDER BY sort_order`, [first.portfolio_id])).rows,
        [{ item: newItem, sort_order: 0 }, { item: LA, sort_order: 1 }]);
      if (kind !== 'education') assert.deepEqual(copy.data.images.map(image => image.image_url), ['first.png', 'second.png']);
      if (kind === 'certificate') assert.equal(copy.version, 2);
      await capture(first.portfolio_id, kind, true, copy.latest_revision);
      assert.deepEqual((await capture(PA, kind)).data, original.data);
    }
    assert.deepEqual((await db.query('SELECT template_key,theme_color FROM portfolios WHERE id=$1', [first.portfolio_id])).rows, [{ template_key: 'minimal', theme_color: palette }]);
    assert.deepEqual((await db.query('SELECT age_mode,manual_age FROM profiles WHERE portfolio_id=$1', [first.portfolio_id])).rows, [{ age_mode: 'manual', manual_age: 0 }]);
    assert.deepEqual((await db.query('SELECT section,visible FROM portfolio_section_visibility WHERE portfolio_id=$1 ORDER BY section', [first.portfolio_id])).rows, [{ section: 'activity', visible: false }, { section: 'toc', visible: false }]);
    for (const [kind, plural] of sections) {
      await db.query(`DELETE FROM user_library_${plural} WHERE id=$1`, [LA]);
      assert.equal((await db.query(`SELECT * FROM portfolio_${plural} WHERE ${kind}_id=$1`, [LA])).rows.length, 0);
    }
    assert.equal((await db.query('TABLE portfolios')).rows.length, 2); // source and copy remain; only deleted library references disappear
  } finally { await db.close(); }
});

test('copy blocks missing snapshots and late failure atomically, retains replay and owner restrictions', async () => {
  const db = await copyDatabase();
  try {
    await db.query("INSERT INTO portfolio_section_visibility VALUES($1,'profile',false)", [PA]);
    await asUser(db, A);
    const copy = (source = PA) => db.query<{ result: Action }>("SELECT perform_portfolio_action($1,'duplicate',$2,'Copy') AS result", [requestId, source]);
    await assert.rejects(copy(), /Snapshot transition required/);
    assert.equal((await db.query('TABLE portfolios')).rows.length, 1);
    assert.equal((await db.query('TABLE portfolio_action_receipts')).rows.length, 0);
    for (const [kind] of sections) await db.query('SELECT capture_portfolio_item_snapshot($1,$2,$3)', [PA, kind, LA]);
    await db.exec('RESET ROLE');
    await db.exec("CREATE FUNCTION fail_snapshot_copy() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'late snapshot copy failure'; END $$; CREATE TRIGGER fail_snapshot_copy BEFORE INSERT ON portfolio_section_visibility FOR EACH ROW EXECUTE FUNCTION fail_snapshot_copy()");
    await asUser(db, A);
    await assert.rejects(copy(), /late snapshot copy failure/);
    assert.equal((await db.query('TABLE portfolios')).rows.length, 1);
    assert.equal((await db.query('TABLE portfolio_action_receipts')).rows.length, 0);
    await db.exec('RESET ROLE; DROP TRIGGER fail_snapshot_copy ON portfolio_section_visibility');
    await asUser(db, A);
    const copied = (await copy()).rows[0].result;
    assert.deepEqual((await copy()).rows[0].result, copied);
    await assert.rejects(copy(PB), /different arguments/);
    const denied = (await db.query<{ result: Action }>("SELECT perform_portfolio_action($1,'duplicate',$2,'Copy') AS result", ['50000000-0000-0000-0000-000000000002', PB])).rows[0].result;
    assert.equal(denied.status, 'rejected');
    await db.query("SELECT perform_portfolio_action($1,'delete',$2,'')", ['50000000-0000-0000-0000-000000000003', copied.portfolio_id]);
    for (const [, plural] of sections) {
      assert.equal((await db.query(`SELECT * FROM user_library_${plural} WHERE id=$1`, [LA])).rows.length, 1);
      assert.equal((await db.query(`SELECT * FROM portfolio_${plural} WHERE portfolio_id=$1`, [PA])).rows.length, 1);
    }
    await db.exec('RESET ROLE; SET ROLE anon');
    await assert.rejects(copy(), /permission denied/);
  } finally { await db.close(); }
});
