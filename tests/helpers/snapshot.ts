import { readFileSync } from 'node:fs';
import { baseline, A, B } from './baseline';
export const TAG_A = '30000000-0000-0000-0000-000000000001';
export const TAG_B = '30000000-0000-0000-0000-000000000002';
export const snapshotProposal = (name: string) => readFileSync(new URL(`../../supabase/proposals/${name}.sql`, import.meta.url), 'utf8');

export async function snapshotLibraryDatabase() {
  const db = await baseline();
  // Extend the synthetic baseline with the fields currently sent by the three forms.
  // This is deliberately not a claim that target catalog types were verified here.
  await db.exec(`
    ALTER TABLE user_library_educations ADD COLUMN level text DEFAULT 'School', ADD COLUMN school_name text DEFAULT 'Original school',
      ADD COLUMN study_plan text, ADD COLUMN gpa numeric, ADD COLUMN start_year text, ADD COLUMN end_year text, ADD COLUMN logo_url text;
    ALTER TABLE user_library_activities ADD COLUMN activity_date date, ADD COLUMN organization text;
    ALTER TABLE user_library_certificates ADD COLUMN issued_date date, ADD COLUMN issued_by text, ADD COLUMN image_url text;
    INSERT INTO user_tags(id,user_id,name) VALUES('${TAG_A}','${A}','own'),('${TAG_B}','${B}','other');
  `);
  await db.exec(snapshotProposal('portfolio-item-snapshots'));
  await db.exec(readFileSync(new URL('../../supabase/migrations/20261023150558_library_image_limits.sql', import.meta.url), 'utf8'));
  await db.exec(snapshotProposal('atomic-library-update'));
  return db;
}
