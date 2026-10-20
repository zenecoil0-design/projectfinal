// Real PostgreSQL/PostgREST acceptance runner. No hosted URL/credentials accepted.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes, createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer } from "node:net";
import { fileURLToPath, pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { defaultVisibility, parseVisibilityRows } from "../../src/lib/editor/section-visibility.ts";

const composeFile = fileURLToPath(new URL("./visibility/compose.yaml", import.meta.url));
const fixtureFile = new URL("./visibility/fixture.sql", import.meta.url);
const migrationFile = new URL("../../supabase/migrations/20261020084510_section_visibility.sql", import.meta.url);
const A = "00000000-0000-0000-0000-000000000001";
const B = "00000000-0000-0000-0000-000000000002";
const PA = "10000000-0000-0000-0000-000000000001";
const PB = "10000000-0000-0000-0000-000000000002";
const PA2 = "10000000-0000-0000-0000-000000000003";
const sections = ["preface", "toc", "profile", "education", "activity", "certificate"];

export function localJwt(subject, secret) {
  assert.ok([A, B].includes(subject), "Only synthetic fixture identities are accepted");
  const encode = value => Buffer.from(JSON.stringify(value)).toString("base64url");
  const message = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: subject, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 600 })}`;
  return `${message}.${createHmac("sha256", secret).update(message).digest("base64url")}`;
}

export function assertLocalDocker(endpoint, environment) {
  assert.ok(endpoint?.startsWith("unix:///"), "Only a local Unix Docker socket is allowed");
  assert.ok(!environment.DOCKER_HOST && !environment.DOCKER_CONTEXT, "Unset Docker endpoint/context overrides; remote engines are forbidden");
}

function docker(args, options = {}) {
  return execFileSync("docker", args, { encoding: "utf8", timeout: 30000,
    stdio: ["pipe", "pipe", "pipe"], maxBuffer: 4 * 1024 * 1024, ...options });
}

function prerequisites() {
  // Reject remote daemon overrides before any daemon request.
  assert.ok(!process.env.DOCKER_HOST && !process.env.DOCKER_CONTEXT, "Docker overrides forbidden");
  const contexts = JSON.parse(docker(["context", "inspect"]));
  assertLocalDocker(contexts[0]?.Endpoints?.docker?.Host, process.env);
  const compose = docker(["compose", "version", "--short"]).trim();
  const engine = docker(["info", "--format", "{{.ServerVersion}}"]).trim();
  return { compose, engine };
}

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const port = address.port;
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}

export async function run() {
  const versions = prerequisites();
  const project = `visibility-integration-${randomBytes(6).toString("hex")}`;
  const secret = randomBytes(32).toString("hex");
  const password = randomBytes(24).toString("hex");
  const port = await freePort();
  const env = { ...process.env, VISIBILITY_LOCAL_PASSWORD: password,
    VISIBILITY_LOCAL_JWT_SECRET: secret, VISIBILITY_LOCAL_API_PORT: String(port) };
  const compose = (args, input) => docker(["compose", "-f", composeFile, "-p", project, ...args], { env, input, timeout: 180000 });
  const tokens = { A: localJwt(A, secret), B: localJwt(B, secret) };
  const base = `http://127.0.0.1:${port}`;
  const results = [];
  const check = async (name, fn) => {
    try { await fn(); results.push(name); console.log(`PASS ${name}`); }
    catch { console.error(`FAIL ${name}`); throw new Error("Local API assertion failed"); }
  };
  const request = async (who, method, path, body) => {
    const headers = { "Content-Type": "application/json", Prefer: "return=representation,resolution=merge-duplicates" };
    if (who) headers.Authorization = `Bearer ${tokens[who]}`;
    const response = await fetch(`${base}/${path}`, { method, headers, redirect: "error",
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10000) });
    const text = await response.text();
    return { status: response.status, data: text ? JSON.parse(text) : null };
  };
  const rows = async (who, portfolio = PA) => {
    const r = await request(who, "GET", `portfolio_section_visibility?portfolio_id=eq.${portfolio}&select=section,visible&order=section`);
    assert.equal(r.status, 200); assert.ok(Array.isArray(r.data)); return r.data;
  };
  const upsert = (who, portfolio, section, visible) => request(who, "POST", "portfolio_section_visibility?on_conflict=portfolio_id,section&select=section,visible", { portfolio_id: portfolio, section, visible });
  const denied = (r, code) => { assert.ok([400, 401, 403, 409].includes(r.status)); assert.equal(r.data.code, code); };
  let started = false;
  try {
    console.log(JSON.stringify({ phase: "starting isolated local stack", project }));
    started = true;
    compose(["up", "-d", "--wait", "db"]);
    const psql = ["exec", "-T", "db", "psql", "-X", "-U", "postgres", "-d", "section_visibility_integration", "--set=ON_ERROR_STOP=1"];
    compose([...psql, `--set=authenticator_password=${password}`], readFileSync(fixtureFile, "utf8"));
    compose(psql, readFileSync(migrationFile, "utf8"));
    compose(["up", "-d", "api"]);
    let ready = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      try { await rows("A"); ready = true; break; } catch { await delay(250); }
    }
    assert.ok(ready, "Local PostgREST readiness timeout");
    const originalA = await request("A", "GET", `portfolios?id=eq.${PA}&select=*`);
    const originalB = await request("B", "GET", `portfolios?id=eq.${PB}&select=*`);
    assert.equal(originalA.status, 200); assert.equal(originalA.data.length, 1);
    assert.equal(originalB.status, 200); assert.equal(originalB.data.length, 1);
    await check("empty successful API read means all six optional sections visible", async () => {
      const overrides = await rows("A"); assert.deepEqual(overrides, []);
      assert.deepEqual(parseVisibilityRows(overrides), defaultVisibility());
      assert.deepEqual(Object.values(parseVisibilityRows(overrides)), sections.map(() => true));
    });
    await check("single-section upsert and readback", async () => {
      const r = await upsert("A", PA, "profile", false); assert.equal(r.status, 201);
      assert.deepEqual(r.data, [{ section: "profile", visible: false }]);
      assert.deepEqual(await rows("A"), r.data);
    });
    await check("different section keys survive stale-map and concurrent writes", async () => {
      const written = await Promise.all([upsert("A", PA, "education", false), upsert("A", PA, "activity", false)]);
      for (const r of written) assert.ok([200, 201].includes(r.status));
      assert.deepEqual(await rows("A"), ["activity", "education", "profile"].map(section => ({ section, visible: false })));
      const r = await upsert("A", PA, "profile", true); assert.ok([200, 201].includes(r.status));
      assert.equal((await rows("A")).find(r => r.section === "education").visible, false);
    });
    await check("same owner portfolios have independent overrides", async () => {
      assert.deepEqual(await rows("A", PA2), []);
      assert.equal((await upsert("A", PA2, "toc", false)).status, 201);
      assert.ok(!(await rows("A")).some(r => r.section === "toc"));
    });
    await check("both accounts can read/write only their own rows", async () => {
      assert.deepEqual(await rows("B", PA), []); assert.deepEqual(await rows("A", PB), []);
      assert.equal((await upsert("B", PB, "profile", false)).status, 201);
      assert.deepEqual(await rows("B", PB), [{ section: "profile", visible: false }]);
      assert.deepEqual(await rows("A", PB), []);
    });
    await check("cross-owner insert/upsert rejected with RLS code", async () => {
      denied(await upsert("A", PB, "toc", false), "42501");
      denied(await upsert("A", PB, "profile", true), "42501");
      denied(await upsert("B", PA, "toc", true), "42501");
    });
    await check("cross-owner UPDATE affects zero rows; ownership reassignment rejected", async () => {
      const r = await request("A", "PATCH", `portfolio_section_visibility?portfolio_id=eq.${PB}&section=eq.profile`, { visible: true });
      assert.equal(r.status, 200); assert.deepEqual(r.data, []);
      denied(await request("A", "PATCH", `portfolio_section_visibility?portfolio_id=eq.${PA}&section=eq.education`, { portfolio_id: PB }), "42501");
      assert.deepEqual(await rows("B", PB), [{ section: "profile", visible: false }]);
    });
    await check("anon read/write and authenticated direct DELETE rejected", async () => {
      denied(await request(null, "GET", "portfolio_section_visibility?select=*"), "42501");
      denied(await upsert(null, PA, "toc", false), "42501");
      denied(await request("A", "DELETE", `portfolio_section_visibility?portfolio_id=eq.${PA}`), "42501");
      assert.equal((await rows("A")).length, 3);
    });
    await check("cover/unknown/empty sections and invalid boolean rejected", async () => {
      for (const section of ["cover", "unknown", ""]) denied(await upsert("A", PA, section, false), "23514");
      denied(await upsert("A", PA, "toc", null), "23502");
      denied(await upsert("A", PA, "toc", "not-a-boolean"), "22P02");
      assert.ok(!(await rows("A")).some(r => r.section === "cover"));
    });
    await check("title/template/content/selection/image order remain unchanged", async () => {
      assert.deepEqual(await request("A", "GET", `portfolios?id=eq.${PA}&select=*`), originalA);
      assert.deepEqual(await request("B", "GET", `portfolios?id=eq.${PB}&select=*`), originalB);
    });
    console.log(JSON.stringify({ result: "PASS", suite: "isolated real PostgreSQL/PostgREST with signed authenticated JWTs", cases: results.length, versions, project }));
  } finally {
    // Exactly this run's random Compose project; no user/host volumes or other projects.
    if (started) {
      try { compose(["down", "--remove-orphans"]); }
      catch { console.error(`Cleanup incomplete: operator must stop only Compose project ${project}; no credentials logged.`); process.exitCode = 1; }
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2];
  if (process.argv.length > 3) { console.error("Extra arguments forbidden; no URL/connection argument accepted."); process.exitCode = 2; }
  else if (mode === "--help" || !mode) console.log("--check: inspect local Docker/Compose prerequisites only. --run: create a fresh disposable LOCAL PostgreSQL/PostgREST stack and run JWT API acceptance. No hosted target option; no existing database is reused.");
  else if (mode === "--check") {
    try { console.log(JSON.stringify({ result: "PREREQUISITES_AVAILABLE_NOT_TESTED", ...prerequisites() })); }
    catch { console.error("NOT_RUN: local Unix Docker engine + Compose v2 unavailable or remote override refused. Install/enable locally under operator control; no hosted fallback."); process.exitCode = 2; }
  } else if (mode === "--run") {
    run().catch(() => { console.error("Integration did not pass. Check local engine/images/API/SQL prerequisites privately; no hosted fallback or raw credential-bearing error output."); process.exitCode = 1; });
  } else { console.error("Unknown argument; use --help. No URL/connection argument accepted."); process.exitCode = 2; }
}
