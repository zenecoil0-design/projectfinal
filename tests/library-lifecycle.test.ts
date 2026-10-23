import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { baseline, asUser, A, B, LA, LB } from './helpers/baseline';
import { parseLibraryImpact, confirmedLibraryDelete, canAddLibraryImages } from '../src/lib/library-lifecycle';

test('impact/returning validation never converts missing or foreign data into empty/success', () => {
  assert.deepEqual(parseLibraryImpact([],A),[]);
  const row = { portfolio_id: 'p', portfolios: { id:'p',title:null,user_id:A } };
  assert.deepEqual(parseLibraryImpact([row],A),[{id:'p',title:null}]);
  for (const value of [null,{},[{}],[{...row,portfolios:null}],[{...row,portfolios:{...row.portfolios,user_id:B}}],[row,row]]) assert.throws(() => parseLibraryImpact(value,A));
  assert(confirmedLibraryDelete([{id:LA}],LA));
  for (const value of [null,[],{},[{id:LB}],[{id:LA},{id:LA}]]) assert(!confirmedLibraryDelete(value,LA));
});

test('image additions cap 4/2 but text-only edits preserve legacy image sets', () => {
  assert(canAddLibraryImages('activity',3,1)); assert(!canAddLibraryImages('activity',4,1));
  assert(!canAddLibraryImages('activity',5,0));
  assert(canAddLibraryImages('certificate',1,1)); assert(!canAddLibraryImages('certificate',2,1));
  assert(canAddLibraryImages('certificate',4,0)); assert(!canAddLibraryImages('certificate',3,1));
});

test('PGlite trigger preserves legacy rows and enforces authenticated additions/transfer/batch rollback', async () => {
  const db = await baseline();
  try {
    await db.query("INSERT INTO user_library_certificate_images(certificate_id,image_url,sort_order) SELECT $1,'legacy-'||n,n FROM generate_series(0,3) n",[LA]);
    await db.exec(await readFile(new URL('../supabase/migrations/20261023150558_library_image_limits.sql',import.meta.url),'utf8'));
    await asUser(db,A);
    await db.query("UPDATE user_library_certificates SET title='legacy text stays editable' WHERE id=$1",[LA]);
    assert.equal((await db.query('SELECT * FROM user_library_certificate_images WHERE certificate_id=$1',[LA])).rows.length,4);
    await assert.rejects(db.query("INSERT INTO user_library_certificate_images(certificate_id,image_url) VALUES($1,'extra')",[LA]),/limit exceeded/);
    await db.query("INSERT INTO user_library_activity_images(activity_id,image_url) SELECT $1,'activity-'||n FROM generate_series(1,4) n",[LA]);
    await assert.rejects(db.query("INSERT INTO user_library_activity_images(activity_id,image_url) VALUES($1,'fifth')",[LA]),/limit exceeded/);
    assert.equal((await db.query('SELECT * FROM user_library_activity_images WHERE activity_id=$1',[LA])).rows.length,4);
    await db.exec('RESET ROLE'); await asUser(db,B);
    await db.query("INSERT INTO user_library_certificate_images(certificate_id,image_url) VALUES($1,'one'),($1,'two')",[LB]);
    await assert.rejects(db.query("INSERT INTO user_library_certificate_images(certificate_id,image_url) VALUES($1,'third')",[LB]),/limit exceeded/);
    await assert.rejects(db.query("INSERT INTO user_library_certificate_images(certificate_id,image_url) VALUES($1,'foreign')",[LA]),/Source unavailable|row-level security/);
    await db.query('DELETE FROM user_library_certificate_images WHERE certificate_id=$1',[LB]);
    await assert.rejects(db.query("INSERT INTO user_library_certificate_images(certificate_id,image_url) VALUES($1,'a'),($1,'b'),($1,'c')",[LB]),/limit exceeded/);
    assert.equal((await db.query('SELECT * FROM user_library_certificate_images WHERE certificate_id=$1',[LB])).rows.length,0);
    await db.exec('RESET ROLE'); await asUser(db,A);
    await db.query('DELETE FROM user_library_certificate_images WHERE certificate_id=$1 AND sort_order>=1',[LA]);
    await db.query("INSERT INTO user_library_certificate_images(certificate_id,image_url) VALUES($1,'replacement')",[LA]);
    const rows = await db.query<{ image_url:string }>('SELECT image_url FROM user_library_certificate_images WHERE certificate_id=$1 ORDER BY sort_order,image_url',[LA]);
    assert.deepEqual(rows.rows.map(row=>row.image_url),['legacy-0','replacement']);
  } finally { await db.close(); }
});
