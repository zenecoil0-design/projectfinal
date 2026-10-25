// Real PostgreSQL/PostgREST acceptance runner. No hosted URL/credentials accepted.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes, createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer } from "node:net";
import { fileURLToPath, pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const composeFile = fileURLToPath(new URL("./visibility/compose.yaml", import.meta.url));
const fixtureFile = new URL("./actions/fixture.sql", import.meta.url);
const migrationFile = new URL("../../supabase/migrations/20261020084510_section_visibility.sql", import.meta.url);
const A = "00000000-0000-0000-0000-000000000001";
const B = "00000000-0000-0000-0000-000000000002";
const PA = "10000000-0000-0000-0000-000000000001";
const PB = "10000000-0000-0000-0000-000000000002";

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
  const project = `actions-integration-${randomBytes(6).toString("hex")}`;
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
  let started = false;
  try {
    console.log(JSON.stringify({ phase: "starting isolated local stack", project }));
    started = true;
    compose(["up", "-d", "--wait", "db"]);
    const psql = ["exec", "-T", "db", "psql", "-X", "-U", "postgres", "-d", "section_visibility_integration", "--set=ON_ERROR_STOP=1"];
    compose([...psql, `--set=authenticator_password=${password}`], readFileSync(fixtureFile, "utf8"));
    compose(psql, readFileSync(migrationFile, "utf8"));
    compose(psql, readFileSync(new URL("../../supabase/migrations/20261024131223_portfolio_actions.sql", import.meta.url), "utf8"));
    compose(psql,`INSERT INTO portfolio_section_visibility(portfolio_id,section,visible) VALUES('${PA}','profile',false);`);
    compose(["up", "-d", "api"]);
    let ready = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      try { await rows("A"); ready = true; break; } catch { await delay(250); }
    }
    assert.ok(ready, "Local PostgREST readiness timeout");
    const key = "30000000-0000-0000-0000-000000000001";
    const call = (who, id = key, action = "duplicate", source = PA, title = "Copy") => request(who,"POST","rpc/perform_portfolio_action",{p_request_id:id,p_action:action,p_source_id:source,p_title:title});
    let copied;
    await check("concurrent identical requests return one copy and one receipt",async()=>{
      const [a,b]=await Promise.all([call("A"),call("A")]);
      assert.equal(a.status,200);assert.deepEqual(a,b);assert.equal(a.data.status,"confirmed");copied=a.data.portfolio_id;
      const portfolios=await request("A","GET","portfolios?select=id");assert.equal(portfolios.data.length,2);
      const receipts=await request("A","GET","portfolio_action_receipts?select=request_id");assert.equal(receipts.data.length,1);
    });
    await check("copy preserves template, three colors and content",async()=>{
      const source=await request("A","GET",`portfolios?id=eq.${PA}&select=template_key,theme_color`);
      const copy=await request("A","GET",`portfolios?id=eq.${copied}&select=template_key,theme_color`);assert.deepEqual(copy,source);
      const cover=await request("A","GET",`covers?portfolio_id=eq.${copied}&select=first_name`);assert.deepEqual(cover.data,[{first_name:"Synthetic Name"}]);
    });
    await check("shared selection order and hidden section preferences are copied",async()=>{
      for(const [plural,kind] of [["activities","activity"],["certificates","certificate"],["educations","education"]]) {
        const r=await request("A","GET",`portfolio_${plural}?portfolio_id=eq.${copied}&select=${kind}_id,sort_order`);
        assert.equal(r.status,200);assert.deepEqual(r.data,[{[`${kind}_id`]:"20000000-0000-0000-0000-000000000001",sort_order:7}]);
      }
      assert.deepEqual(await rows("A",copied),[{section:"profile",visible:false}]);
    });
    await check("reusing request with changed arguments is rejected",async()=>{
      const result=await call("A",key,"duplicate",PA,"Changed");assert.equal(result.status,400);assert.equal(result.data.code,"22023");
    });
    await check("cross owner mutations and receipt reads are isolated",async()=>{
      assert.equal((await call("B",key,"delete",PA,"")).data.status,"rejected");
      assert.equal((await call("A","30000000-0000-0000-0000-000000000002","duplicate",PB)).data.status,"rejected");
      const rows=await request("B","GET",`portfolio_action_receipts?user_id=eq.${A}`);assert.equal(rows.status,200);assert.deepEqual(rows.data,[]);
    });
    await check("anonymous RPC and direct receipt writes denied",async()=>{
      const anon=await call(null);assert.ok([401,403].includes(anon.status));
      const write=await request("A","POST","portfolio_action_receipts",{user_id:A,request_id:key,action:"duplicate",source_id:PA,title:"Fake",status:"confirmed",portfolio_id:PA});assert.ok([401,403].includes(write.status));
    });
    await check("late failure rolls back portfolio and receipt; same key can recover",async()=>{
      compose(psql,"CREATE FUNCTION fail_copy() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic failure'; END $$; CREATE TRIGGER fail_copy BEFORE INSERT ON covers FOR EACH ROW EXECUTE FUNCTION fail_copy();");
      const id="30000000-0000-0000-0000-000000000003";
      assert.ok((await call("A",id)).status>=400);
      assert.equal((await request("A","GET","portfolios?select=id")).data.length,2);
      assert.deepEqual((await request("A","GET",`portfolio_action_receipts?request_id=eq.${id}`)).data,[]);
      compose(psql,"DROP TRIGGER fail_copy ON covers;");
      assert.equal((await call("A",id)).data.status,"confirmed");
    });
    await check("delete replay is stable and source content remains",async()=>{
      const id="30000000-0000-0000-0000-000000000004";
      const first=await call("A",id,"delete",copied,"");assert.equal(first.data.status,"confirmed");assert.deepEqual(await call("A",id,"delete",copied,""),first);
      assert.deepEqual((await request("A","GET",`covers?portfolio_id=eq.${copied}`)).data,[]);
      assert.equal((await request("A","GET",`covers?portfolio_id=eq.${PA}`)).data.length,1);
      for(const plural of ["activities","certificates","educations"]) {
        assert.deepEqual((await request("A","GET",`portfolio_${plural}?portfolio_id=eq.${copied}`)).data,[]);
        assert.equal((await request("A","GET",`user_library_${plural}?select=id`)).data.length,1);
      }
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
