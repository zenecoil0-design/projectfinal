import { readFileSync } from 'node:fs';
export function snapshotSetup() {
 const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
 return [read('../actions/fixture.sql'),read('./fixture.sql'),
  ...['20261020084510_section_visibility.sql','20261024131223_portfolio_actions.sql','20261026175325_profile_age_override.sql','20261023150558_library_image_limits.sql'].map(file=>read('../../../supabase/migrations/'+file)),
  ...['portfolio-item-snapshots','atomic-library-update','atomic-library-create','snapshot-upload-validation','snapshot-transition-read','snapshot-portfolio-copy'].map(file=>read('../../../supabase/proposals/'+file+'.sql')),
  `INSERT INTO portfolio_private.asset_config(public_base_url) VALUES('https://snapshot-fixture.invalid/storage/v1/object/public/portfolio-images/');
   INSERT INTO portfolio_section_visibility(portfolio_id,section,visible) VALUES('10000000-0000-0000-0000-000000000001','activity',false);
   INSERT INTO profiles(portfolio_id,age_mode,manual_age) VALUES('10000000-0000-0000-0000-000000000001','manual',0);`];
}
