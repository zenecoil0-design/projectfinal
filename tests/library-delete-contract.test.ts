import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { baseline, asUser, A, B, PA, PB, LA, LB, sections } from './helpers/baseline';

// Isolated synthetic database only. Never connects to Supabase or Storage.
for (const [kind, plural] of sections) {
  test(`${kind}: source cascade removes both owner portfolios including hidden section, keeps shared tags/other owner, rejects stale selection`, async () => {
    const db = await baseline();
    try {
      await db.exec(await readFile(new URL('../supabase/migrations/202610130001_atomic_portfolio_selection.sql', import.meta.url), 'utf8'));
      const second = '10000000-0000-0000-0000-000000000003';
      await db.query('INSERT INTO portfolios(id,user_id) VALUES($1,$2)', [second,A]);
      // Visibility is unrelated to the reference: hiding must never exempt it.
      await db.exec('CREATE TABLE hidden_fixture(portfolio_id uuid, section text)');
      await db.query('INSERT INTO hidden_fixture VALUES($1,$2)', [second,kind]);
      await db.query(`INSERT INTO portfolio_${plural}(portfolio_id,${kind}_id) VALUES($1,$2)`, [second,LA]);
      const tag = '30000000-0000-0000-0000-000000000001';
      await db.query('INSERT INTO user_tags(id,user_id,name) VALUES($1,$2,$3)', [tag,A,'shared']);
      await db.query(`INSERT INTO user_library_${kind}_tags VALUES($1,$2)`, [LA,tag]);
      if (kind !== 'education') await db.query(`INSERT INTO user_library_${kind}_images(${kind}_id,image_url) VALUES($1,'kept-in-storage.png')`, [LA]);
      await asUser(db,B);
      assert.equal((await db.query(`DELETE FROM user_library_${plural} WHERE id=$1 RETURNING id`, [LA])).rows.length,0);
      await db.exec('RESET ROLE'); await asUser(db,A);
      await db.query('SELECT replace_portfolio_selection($1,$2,$3::uuid[])', [PA,kind,[]]);
      await db.exec('RESET ROLE');
      assert.equal((await db.query(`SELECT 1 FROM user_library_${plural} WHERE id=$1`,[LA])).rows.length,1);
      assert.equal((await db.query(`SELECT 1 FROM portfolio_${plural} WHERE portfolio_id=$1`,[second])).rows.length,1);
      await asUser(db,A);
      assert.equal((await db.query(`DELETE FROM user_library_${plural} WHERE id=$1 RETURNING id`,[LA])).rows.length,1);
      await assert.rejects(db.query('SELECT replace_portfolio_selection($1,$2,$3::uuid[])',[PA,kind,[LA]]), /not found|access denied/);
      await db.exec('RESET ROLE');
      assert.equal((await db.query(`SELECT 1 FROM portfolio_${plural} WHERE ${kind}_id=$1`,[LA])).rows.length,0);
      assert.equal((await db.query(`SELECT 1 FROM user_library_${kind}_tags WHERE ${kind}_id=$1`,[LA])).rows.length,0);
      if (kind !== 'education') assert.equal((await db.query(`SELECT 1 FROM user_library_${kind}_images WHERE ${kind}_id=$1`,[LA])).rows.length,0);
      assert.equal((await db.query('SELECT 1 FROM user_tags WHERE id=$1',[tag])).rows.length,1);
      assert.equal((await db.query(`SELECT 1 FROM user_library_${plural} WHERE id=$1`,[LB])).rows.length,1);
      assert.equal((await db.query(`SELECT 1 FROM portfolio_${plural} WHERE portfolio_id=$1 AND ${kind}_id=$2`,[PB,LB])).rows.length,1);
      assert.equal((await db.query('TABLE storage.objects')).rows.length,1);
    } finally { await db.close(); }
  });
}
