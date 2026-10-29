import test from 'node:test';
import assert from 'node:assert/strict';
import { asUser, A, B, PA, PB, LA, LB, sections } from './helpers/baseline';
import { snapshotLibraryDatabase, snapshotProposal } from './helpers/snapshot';
import { parsePortfolioSnapshots } from '../src/lib/editor/snapshot-reader';

type Envelope = { format_version: number; portfolio_id: string; section: string; items: Array<{
  item_id: string; sort_order: number; data: { item: Record<string, unknown>; images: Array<Record<string, unknown>> };
  revision: string; latest_revision: string; version: number;
}> };
const L2 = '20000000-0000-0000-0000-000000000003';
const prepare = (db: Awaited<ReturnType<typeof snapshotLibraryDatabase>>, portfolio = PA) =>
  db.query<{ result: { portfolio_id: string; prepared_count: number } }>(
    'SELECT prepare_portfolio_item_snapshots($1) AS result', [portfolio]);
const read = async (db: Awaited<ReturnType<typeof snapshotLibraryDatabase>>, section: string, portfolio = PA) =>
  (await db.query<{ result: Envelope }>('SELECT read_portfolio_item_snapshots($1,$2) AS result', [portfolio, section])).rows[0].result;
const code = (expected: string) => (error: unknown) =>
  !!error && typeof error === 'object' && 'code' in error && error.code === expected;

for (const [kind, plural] of sections) test(`${kind}: transition, read-only edition mapping, explicit update and deletion`, async () => {
  const db = await snapshotLibraryDatabase();
  try {
    await db.exec(snapshotProposal('snapshot-transition-read'));
    await db.query(`INSERT INTO user_library_${plural}(id,user_id) VALUES($1,$2)`, [L2,A]);
    await db.query(`INSERT INTO portfolio_${plural}(portfolio_id,${kind}_id,sort_order) VALUES($1,$2,0)`, [PA,L2]);
    await db.query(`UPDATE portfolio_${plural} SET sort_order=5 WHERE portfolio_id=$1 AND ${kind}_id=$2`, [PA,LA]);
    if (kind !== 'education') await db.query(`INSERT INTO user_library_${kind}_images(${kind}_id,image_url,sort_order)
      VALUES($1,'https://example.invalid/second.png',8),($1,'https://example.invalid/first.png',2)`, [LA]);
    else await db.query('UPDATE user_library_educations SET gpa=0,logo_url=$1 WHERE id=$2', ['https://example.invalid/logo.png',LA]);
    await db.exec(`CREATE TABLE portfolio_section_visibility(portfolio_id uuid,section text,visible boolean);
      INSERT INTO portfolio_section_visibility VALUES('${PA}','${kind}',false);
      UPDATE portfolios SET title='Original portfolio',template_key='minimal',theme_color='three-colors' WHERE id='${PA}';`);
    const metadata = (await db.query('SELECT title,template_key,theme_color FROM portfolios WHERE id=$1',[PA])).rows;
    const references = (await db.query(`SELECT id,${kind}_id,sort_order FROM portfolio_${plural} WHERE portfolio_id=$1 ORDER BY sort_order`,[PA])).rows;
    await asUser(db,A);
    await assert.rejects(read(db,kind),code('55000'));
    assert.equal((await prepare(db)).rows[0].result.prepared_count,4); // all sections, including hidden
    const first = await read(db,kind);
    assert.deepEqual(first.items.map(x=>x.item_id),[L2,LA]);
    const accepted = parsePortfolioSnapshots(first,kind,{portfolioId:PA,ownerId:A});
    assert.equal(accepted[1].version,1);
    assert.equal(accepted[1].hasUpdate,false);
    if ('images' in accepted[1].item) assert.deepEqual(accepted[1].item.images,
      ['https://example.invalid/first.png','https://example.invalid/second.png']);
    else assert.equal(accepted[1].item.gpa,'0');

    // Ordinary read works in a read-only transaction and does not silently prepare/refresh.
    await db.exec('BEGIN READ ONLY');
    assert.deepEqual(await read(db,kind),first);
    await db.exec('COMMIT');
    await db.exec('RESET ROLE');
    const field = kind === 'education' ? 'school_name' : 'title';
    await db.query(`UPDATE user_library_${plural} SET ${field}='New edition' WHERE id=$1`,[LA]);
    if (kind !== 'education') await db.query(`UPDATE user_library_${kind}_images SET image_url='https://example.invalid/new.png' WHERE ${kind}_id=$1`,[LA]);
    await asUser(db,A);
    assert.equal((await prepare(db)).rows[0].result.prepared_count,0);
    const stale = await read(db,kind);
    assert.deepEqual(stale.items[1].data,first.items[1].data);
    assert.notEqual(stale.items[1].latest_revision,stale.items[1].revision);
    assert.equal(parsePortfolioSnapshots(stale,kind,{portfolioId:PA,ownerId:A})[1].hasUpdate,true);
    const captured = (await db.query<{ result: { latest_revision: string } }>(
      'SELECT capture_portfolio_item_snapshot($1,$2,$3) AS result',[PA,kind,LA])).rows[0].result;
    assert.equal(stale.items[1].latest_revision,captured.latest_revision);
    await db.query('SELECT capture_portfolio_item_snapshot($1,$2,$3,true,$4)',[PA,kind,LA,stale.items[1].latest_revision]);
    const refreshed = await read(db,kind);
    assert.equal(refreshed.items[1].version,2);
    assert.equal(refreshed.items[1].data.item[field],'New edition');
    assert.equal((await prepare(db)).rows[0].result.prepared_count,0);
    assert.deepEqual(await read(db,kind),refreshed);
    assert.deepEqual((await db.query(`SELECT id,${kind}_id,sort_order FROM portfolio_${plural} WHERE portfolio_id=$1 ORDER BY sort_order`,[PA])).rows,references);
    assert.deepEqual((await db.query('SELECT title,template_key,theme_color FROM portfolios WHERE id=$1',[PA])).rows,metadata);
    await db.exec('RESET ROLE');
    assert.deepEqual((await db.query('SELECT section,visible FROM portfolio_section_visibility')).rows,[{section:kind,visible:false}]);
    await asUser(db,A);
    await db.query(`DELETE FROM user_library_${plural} WHERE id=$1`,[LA]);
    assert.deepEqual((await read(db,kind)).items.map(x=>x.item_id),[L2]);
    await db.query('SELECT replace_portfolio_selection($1,$2,$3::uuid[])',[PA,kind,[]]);
    assert.deepEqual(parsePortfolioSnapshots(await read(db,kind),kind,{portfolioId:PA,ownerId:A}),[]);
    assert.equal((await db.query(`SELECT id FROM user_library_${plural} WHERE id=$1`,[L2])).rows.length,1);
  } finally { await db.close(); }
});

test('preparation rolls all three sections back after a late failure; same request recovers',async()=>{
  const db=await snapshotLibraryDatabase();
  try {
    await db.exec(snapshotProposal('snapshot-transition-read'));
    await db.exec(`CREATE FUNCTION reject_transition() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      RAISE EXCEPTION 'synthetic late failure'; END $$;
      CREATE TRIGGER reject_transition BEFORE UPDATE ON portfolio_certificates FOR EACH ROW EXECUTE FUNCTION reject_transition();`);
    await asUser(db,A);
    await assert.rejects(prepare(db));
    for(const [,plural] of sections) {
      assert.deepEqual((await db.query(`SELECT snapshot_data,snapshot_revision,snapshot_version FROM portfolio_${plural} WHERE portfolio_id=$1`,[PA])).rows,
        [{snapshot_data:null,snapshot_revision:null,snapshot_version:0}]);
    }
    await db.exec('RESET ROLE; DROP TRIGGER reject_transition ON portfolio_certificates');
    await asUser(db,A);
    assert.equal((await prepare(db)).rows[0].result.prepared_count,3);
    assert.equal((await prepare(db)).rows[0].result.prepared_count,0);
  } finally {await db.close();}
});

test('owner/anon/section isolation and corrupt snapshots fail closed',async()=>{
  const db=await snapshotLibraryDatabase();
  try {
    await db.exec(snapshotProposal('snapshot-transition-read'));
    await asUser(db,A);
    await assert.rejects(prepare(db,PB),code('42501'));
    await assert.rejects(read(db,'activity',PB),code('42501'));
    await assert.rejects(read(db,'cover'),code('22023'));
    await prepare(db);
    await db.exec('RESET ROLE');
    await asUser(db,B);
    await prepare(db,PB);
    assert.equal((await read(db,'activity',PB)).items[0].item_id,LB);
    await assert.rejects(read(db,'activity',PA),code('42501'));
    await db.exec('RESET ROLE; SET ROLE anon');
    await assert.rejects(read(db,'activity'),code('42501'));
    await assert.rejects(prepare(db),code('42501'));
    await db.exec('RESET ROLE');
    await db.query('UPDATE portfolio_activities SET snapshot_revision=NULL WHERE portfolio_id=$1',[PA]);
    await asUser(db,A);
    await assert.rejects(read(db,'activity'),code('22023'));
    await assert.rejects(prepare(db),code('22023'));
    assert.equal((await db.query<{snapshot_revision:null}>('SELECT snapshot_revision FROM portfolio_activities WHERE portfolio_id=$1',[PA])).rows[0].snapshot_revision,null);
  } finally {await db.close();}
});
