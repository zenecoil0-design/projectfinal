import { test } from "node:test";
import assert from "node:assert/strict";
import { baseline } from "../helpers/baseline.ts";
import { catalogSql, assessCatalog } from "../../scripts/inspection/section-visibility-preflight.mjs";

test("preflight SQL uses only a read-only transaction, timeout, SELECT and COMMIT", () => {
  const sql = catalogSql.replace(/--[^\n]*/g, "");
  const statements = sql.split(";").map(s => s.trim()).filter(Boolean);
  assert.equal(statements.length, 4);
  assert.match(statements[0], /^BEGIN TRANSACTION READ ONLY$/);
  assert.equal(statements[1], "SET LOCAL statement_timeout = '10s'");
  assert.match(statements[2], /^WITH relations AS/);
  assert.equal(statements[3], "COMMIT");
  assert.doesNotMatch(sql, /\b(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE|COPY|CALL|DO|pg_read_file|dblink|set_config|pg_notify)\b/i);
  assert.doesNotMatch(sql, /FROM\s+(?:public\.)?portfolios\b/i);
});

test("preflight runs on synthetic catalog without changing fixture rows; absence never proves readiness", async () => {
  const db = await baseline();
  try {
    const before = (await db.query("TABLE portfolios")).rows;
    const results = await db.exec(catalogSql);
    const report = Object.values(results.find(r => r.rows.length)?.rows[0] ?? {})[0];
    assert.equal(typeof report, "object");
    assert.equal(report.history_present, false);
    assert.equal(report.relations.some(r => r.name === "portfolio_section_visibility"), false);
    const assessment = assessCatalog(report);
    assert.ok(assessment.stops.some(s => s.includes("history")));
    assert.ok(assessment.manual.some(s => s.includes("Data API")));
    assert.deepEqual((await db.query("TABLE portfolios")).rows, before);
    const bad = structuredClone(report);
    bad.columns = bad.columns.filter(c => c.name !== "user_id");
    bad.relations.push({ name: "portfolio_section_visibility", kind: "v" });
    bad.roles.find(r => r.name === "authenticated").bypass_rls = true;
    const stops = assessCatalog(bad).stops.join("\n");
    assert.match(stops, /user_id/); assert.match(stops, /already exists/); assert.match(stops, /bypasses RLS/);
  } finally { await db.close(); }
});
