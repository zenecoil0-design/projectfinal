// Reads metadata via an operator-configured psql connection. Never applies migrations.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

export const targetRef = "dlauefjrcstfcmhafyan";
export const migrationVersion = "20261020084510";
export const migrationUrl = new URL("../../supabase/migrations/20261020084510_section_visibility.sql", import.meta.url);
export const catalogSql = readFileSync(new URL("./section-visibility-preflight.sql", import.meta.url), "utf8");

export function assessCatalog(report) {
  const stops = [];
  const portfolios = report.relations.find(r => r.name === "portfolios");
  if (!portfolios || portfolios.kind !== "r" || !portfolios.rls) stops.push("portfolios missing/not ordinary table/RLS disabled");
  for (const name of ["id", "user_id"]) {
    if (!report.columns.some(c => c.table === "portfolios" && c.name === name && c.type === "uuid")) stops.push(`portfolios.${name} must be uuid`);
  }
  if (!report.constraints.some(c => c.table === "portfolios" && c.validated &&
    ((c.kind === "p" && c.definition === "PRIMARY KEY (id)") ||
     (c.kind === "u" && c.definition === "UNIQUE (id)")))) stops.push("portfolios.id needs validated single-column primary/unique key");
  for (const name of ["anon", "authenticated"]) {
    const role = report.roles.find(r => r.name === name);
    if (!role || role.superuser || role.bypass_rls) stops.push(`${name} missing or bypasses RLS`);
    if (name === "authenticated" && (!role?.public_usage || !role?.auth_usage || !role?.auth_uid_execute || !role?.portfolios_select)) stops.push("authenticated lacks ownership-lookup prerequisites");
  }
  if (report.relations.some(r => r.name === "portfolio_section_visibility")) stops.push("visibility relation already exists: compare catalog/history; do not create over it");
  if (!report.history_present) stops.push("migration history unavailable: reconcile independently before installation");
  return { stops, manual: [
    "Confirm target identity/connection independently; this label does not attest connection identity.",
    "Review all portfolios policies (permissive/restrictive, roles, USING/WITH CHECK) and inherited grants for ownership lookup.",
    "Review default ACLs and effective grants, including PUBLIC, role memberships and migration creator.",
    "Confirm exposed schemas from actual Data API settings/config; SQL settings may be absent or overridden.",
    "Reconcile complete migration history/content against repository; hashes are evidence, not automatic equivalence.",
    "Require isolated PostgreSQL/PostgREST JWT acceptance and advisor review before approval."
  ] };
}

function query(sql) {
  const output = execFileSync("psql", ["-X", "-qAt", "--set=ON_ERROR_STOP=1", "--command", sql], {
    encoding: "utf8", timeout: 20000, stdio: ["ignore", "pipe", "pipe"], maxBuffer: 4 * 1024 * 1024
  });
  return JSON.parse(output.trim());
}

export function runPreflight() {
  if (process.env.VISIBILITY_PREFLIGHT_TARGET !== targetRef) throw new Error("Set VISIBILITY_PREFLIGHT_TARGET to the independently verified target ref. Connection must be configured separately using psql/PGSERVICE; never paste credentials into output.");
  const catalog = query(catalogSql);
  const assessment = assessCatalog(catalog);
  let history = null;
  if (catalog.history_present && ["version", "name", "statements"].every(c => catalog.history_columns.includes(c))) {
    history = query(`BEGIN TRANSACTION READ ONLY; SET LOCAL statement_timeout = '10s';
      SELECT COALESCE(jsonb_agg(jsonb_build_object('version', version, 'name', name,
        'stored_statements_md5', md5(array_to_string(statements, E'\\n'))) ORDER BY version), '[]'::jsonb)
      FROM supabase_migrations.schema_migrations; COMMIT;`);
    if (history.some(r => r.version === migrationVersion || r.name === "section_visibility")) assessment.stops.push("visibility migration already recorded: stop, reconcile contents; never rerun or edit installed history");
  } else assessment.stops.push("migration history shape/visibility unconfirmed");
  console.log(JSON.stringify({ target_label: targetRef, checked_at: new Date().toISOString(),
    repository_migration_sha256: createHash("sha256").update(readFileSync(migrationUrl)).digest("hex"),
    catalog, history, ...assessment,
    conclusion: assessment.stops.length ? "STOP" : "MANUAL_REVIEW_REQUIRED_NOT_INSTALL_AUTHORIZATION"
  }, null, 2));
  return assessment.stops.length ? 2 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.exitCode = runPreflight(); }
  catch { console.error("Preflight unavailable: check target attestation, psql connection/permissions and catalog access privately. No migration was run; do not treat this as PASS."); process.exitCode = 1; }
}
