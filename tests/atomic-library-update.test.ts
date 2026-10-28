import test from 'node:test';
import assert from 'node:assert/strict';
import { asUser, A, B, PA, LA, LB, sections } from './helpers/baseline';

import { snapshotLibraryDatabase, TAG_A, TAG_B } from './helpers/snapshot';
type Image = { id?: string; image_url: string };
type Snapshot = { data: { item: Record<string, unknown>; images: Image[] }; revision: string; latest_revision: string; version: number };


for (const [kind, plural] of sections) {
  test(`${kind}: atomic text/media/tag update, retained snapshot and failure rollback`, async () => {
    const db = await snapshotLibraryDatabase();
    try {
      if (kind !== 'education') {
        await db.query(`INSERT INTO user_library_${kind}_images(${kind}_id,image_url) VALUES($1,'old.png')`, [LA]);
      }
      await db.query(`INSERT INTO user_library_${kind}_tags(${kind}_id,tag_id) VALUES($1,$2)`, [LA, TAG_A]);
      await asUser(db, A);
      const capture = async (refresh = false, revision: string | null = null) =>
        (await db.query<{ result: Snapshot }>('SELECT capture_portfolio_item_snapshot($1,$2,$3,$4,$5) AS result', [PA, kind, LA, refresh, revision])).rows[0].result;
      const save = (fields: Record<string, unknown>, images: Image[], tags = [TAG_A], id = LA) =>
        db.query('SELECT update_library_item_atomic($1,$2,$3,$4,$5::uuid[])', [kind, id, JSON.stringify(fields), JSON.stringify(images), tags]);
      const fields = kind === 'education' ? { school_name: 'New school', logo_url: 'new-logo.png' } : { title: 'New title', description: 'New body' };
      const newImages = kind === 'education' ? [] : [{ image_url: 'new.png' }];
      const initial = await capture();

      // Inject a late constraint failure after primary fields and image changes have run.
      await db.exec('RESET ROLE');
      await db.exec(`CREATE FUNCTION fail_test_tag_write() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic late failure'; END $$;
        CREATE TRIGGER fail_test_tag_write BEFORE INSERT ON user_library_${kind}_tags FOR EACH ROW EXECUTE FUNCTION fail_test_tag_write();`);
      await asUser(db, A);
      await assert.rejects(save(fields, newImages), /synthetic late failure/);
      const unchanged = await capture();
      assert.equal(unchanged.latest_revision, initial.revision);
      assert.deepEqual(unchanged.data, initial.data);
      assert.equal((await db.query(`SELECT * FROM user_library_${kind}_tags WHERE ${kind}_id=$1`, [LA])).rows.length, 1);
      await db.exec('RESET ROLE');
      await db.exec(`DROP TRIGGER fail_test_tag_write ON user_library_${kind}_tags`);
      await asUser(db, A);

      await save(fields, newImages);
      const pending = await capture();
      assert.deepEqual(pending.data, initial.data);
      assert.notEqual(pending.latest_revision, initial.revision);
      const accepted = await capture(true, pending.latest_revision);
      assert.equal(accepted.version, 2);
      for (const [key, value] of Object.entries(fields)) assert.equal(accepted.data.item[key], value);
      assert.deepEqual(accepted.data.images.map(i => i.image_url), newImages.map(i => i.image_url));
      // Keeping the same image IDs and fields does not manufacture another content revision.
      const keptImages = accepted.data.images.map(({ id, image_url }) => ({ id, image_url }));
      await save(fields, keptImages);
      assert.equal((await capture()).latest_revision, accepted.revision);

      await assert.rejects(save({ user_id: B }, keptImages), /Unsupported field/);
      await assert.rejects(save(fields, keptImages, [TAG_B]), /Tag access denied/);
      await assert.rejects(save(fields, keptImages, [TAG_A], LB), /Source unavailable/);
      await assert.rejects(db.query(`UPDATE user_library_${plural} SET updated_at=now() WHERE id=$1`, [LA]), /permission denied/);
      if (kind !== 'education') {
        await assert.rejects(db.query(`DELETE FROM user_library_${kind}_images WHERE ${kind}_id=$1`, [LA]), /permission denied/);
      }
      assert.equal((await capture()).latest_revision, accepted.revision);
      // A stale edit of a deleted item must fail; update never recreates the source.
      await db.query(`DELETE FROM user_library_${plural} WHERE id=$1`, [LA]);
      await assert.rejects(save(fields, keptImages), /Source unavailable/);
      assert.equal((await db.query(`SELECT * FROM portfolio_${plural} WHERE portfolio_id=$1`, [PA])).rows.length, 0);
    } finally { await db.close(); }
  });
}

test('image limits, ownership, reordering, malformed input and legacy certificates', async () => {
  const db = await snapshotLibraryDatabase();
  try {
    // Seed historical over-limit data before enabling the current addition trigger.
    await db.exec('ALTER TABLE user_library_certificate_images DISABLE TRIGGER certificate_image_limit');
    for (let index = 0; index < 3; index++) {
      await db.query('INSERT INTO user_library_certificate_images(certificate_id,image_url,sort_order) VALUES($1,$2,$3)', [LA, `legacy-${index}.png`, index]);
    }
    await db.exec('ALTER TABLE user_library_certificate_images ENABLE TRIGGER certificate_image_limit');
    await db.query("INSERT INTO user_library_certificate_images(certificate_id,image_url) VALUES($1,'other-owner.png')", [LB]);
    const other = (await db.query<Image>('SELECT id,image_url FROM user_library_certificate_images WHERE certificate_id=$1', [LB])).rows[0];
    await asUser(db, A);
    const images = (await db.query<Image>('SELECT id,image_url FROM user_library_certificate_images WHERE certificate_id=$1 ORDER BY sort_order', [LA])).rows;
    const save = (kind: string, rows: unknown, fields: unknown = { title: 'Edited title' }) => db.query(
      'SELECT update_library_item_atomic($1,$2,$3,$4,$5::uuid[])', [kind, LA, JSON.stringify(fields), JSON.stringify(rows), []]);
    await save('certificate', images.slice().reverse());
    const result = (await db.query<Image>('SELECT id,image_url FROM user_library_certificate_images WHERE certificate_id=$1 ORDER BY sort_order', [LA])).rows;
    assert.deepEqual(result, images.slice().reverse());
    await assert.rejects(save('certificate', [...images, { image_url: 'extra.png' }]), /Image limit exceeded/);
    await assert.rejects(save('certificate', [other]), /Image access denied/);
    await assert.rejects(save('certificate', [images[0], images[0]]), /Duplicate image/);
    await assert.rejects(save('certificate', [{ ...images[0], image_url: 'replacement.png' }]), /Image access denied/);
    await assert.rejects(save('certificate', null), /Invalid save payload/);
    await assert.rejects(save('certificate', [null]), /Invalid image/);
    await assert.rejects(save('certificate', [], { title: '  ' }), /Title required/);
    await assert.rejects(save('certificate', [], { description: { forged: true } }), /Invalid field type/);
    await assert.rejects(save('activity', Array.from({ length: 5 }, (_, i) => ({ image_url: `${i}.png` }))), /Image limit exceeded/);
    await save('activity', Array.from({ length: 4 }, (_, i) => ({ image_url: `${i}.png` })));
    // Replacing legacy images is allowed only once the final set fits the two-image limit.
    await save('certificate', [images[1], { image_url: 'new.png' }]);
    assert.equal((await db.query('SELECT * FROM user_library_certificate_images WHERE certificate_id=$1', [LA])).rows.length, 2);
    await assert.rejects(save('education', [], { gpa: 5 }), /Invalid GPA/);
    await db.exec('RESET ROLE; SET ROLE anon');
    await assert.rejects(save('certificate', []), /permission denied/);
  } finally { await db.close(); }
});
