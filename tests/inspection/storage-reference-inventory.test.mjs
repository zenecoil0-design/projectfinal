import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const sql = readFileSync(new URL('../../scripts/inspection/storage-reference-inventory.sql', import.meta.url), 'utf8');

test('inventory includes all eight reference locations without exposing values or mutating rows', async () => {
 const db = new PGlite();
 try {
  const sources = [['covers','cover_image_url'],['profiles','profile_image_url'],['certificates','image_url'],['user_library_certificates','image_url'],['user_library_activity_images','image_url'],['user_library_certificate_images','image_url'],['user_library_educations','logo_url']];
  for(const [table,column] of sources) await db.exec(`CREATE TABLE ${table} (${column} text); INSERT INTO ${table} VALUES ('private-image'), (NULL), ('  ');`);
  await db.exec("CREATE TABLE activities(images text[]); INSERT INTO activities VALUES (ARRAY['private-image','private-image','','  ']),(NULL); CREATE SCHEMA storage; CREATE TABLE storage.objects(name text); INSERT INTO storage.objects VALUES ('private-object');");
  const result = (await db.exec(sql)).find(result => result.rows.length)?.rows[0]?.inventory;
  assert.equal(result.reference_counts.length, 8);
  assert.equal(result.reference_counts.find(row=>row.source==='activities.images').count, 2);
  assert.ok(result.reference_counts.filter(row=>row.source!=='activities.images').every(row=>row.count===1));
  assert.equal(result.storage_object_count, 1);
  assert.equal(result.deletion_authorized, false);
  assert.equal(result.status, 'INVENTORY_ONLY_NOT_DELETE_APPROVAL');
  assert.doesNotMatch(JSON.stringify(result), /private-image|private-object/);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM covers')).rows[0].n, 3);
  await db.exec('CREATE ROLE limited; GRANT USAGE ON SCHEMA storage TO limited; GRANT SELECT ON ALL TABLES IN SCHEMA public, storage TO limited; SET ROLE limited;');
  const limited = (await db.exec(sql)).find(result=>result.rows.length)?.rows[0]?.inventory;
  assert.equal(limited.status,'INCOMPLETE_RLS_VISIBILITY');
 } finally { await db.close(); }
});

test('inspection is read-only and permission/schema errors are not treated as empty inventory', async () => {
 const statements=sql.replace(/--[^\n]*/g,'').split(';').map(s=>s.trim()).filter(Boolean);
 assert.equal(statements.length,4);
 assert.equal(statements[0],'BEGIN TRANSACTION READ ONLY');
 assert.match(statements[2],/^WITH reference_counts/);
 assert.doesNotMatch(sql.replace(/--[^\n]*/g,''), /\b(DELETE|UPDATE|INSERT|CREATE|ALTER|DROP|TRUNCATE)\b/i);
 const db=new PGlite();
 try { await assert.rejects(db.exec(sql)); } finally { await db.close(); }
});
