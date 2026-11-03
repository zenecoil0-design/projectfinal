// Real PostgreSQL/PostgREST acceptance runner. No hosted URL/credentials accepted.
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";

import { createServer } from "node:net";
import { fileURLToPath, pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const composeFile = fileURLToPath(new URL("./visibility/compose.yaml", import.meta.url));
import { localJwt, assertLocalDocker } from './portfolio-actions-api.mjs';
import { A, B, snapshotCases } from './snapshots/cases.mjs';
import { snapshotSetup } from './snapshots/setup.mjs';

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

// Only diagnostic categories and scalar assertion metadata; no messages/bodies/URLs.
export function failureSummary(error) {
 const kind=['AssertionError','TimeoutError','AbortError','TypeError','Error'].includes(error?.name)?error.name:'Unknown';
 const scalar=value=>typeof value==='number'||typeof value==='boolean'?value:typeof value;
 return {kind,actual:scalar(error?.actual),expected:scalar(error?.expected)};
}

export async function run() {
 const versions=prerequisites();
 const project=`snapshot-integration-${randomBytes(6).toString('hex')}`;
 const secret=randomBytes(32).toString('hex'),password=randomBytes(24).toString('hex');
 const port=await freePort();
 const env={...process.env,VISIBILITY_LOCAL_PASSWORD:password,VISIBILITY_LOCAL_JWT_SECRET:secret,VISIBILITY_LOCAL_API_PORT:String(port)};
 const prefix=['compose','-f',composeFile,'-p',project];
 const compose=(args,input)=>docker([...prefix,...args],{env,input,timeout:180000});
 const psql=['exec','-T','db','psql','-X','-qAt','-U','postgres','-d','section_visibility_integration','--set=ON_ERROR_STOP=1'];
 const admin=sql=>compose(psql,sql);
 const tokens={A:localJwt(A,secret),B:localJwt(B,secret)};
 const results=[];
 const check=async(name,fn)=>{try{await fn();results.push(name);console.log(`PASS ${name}`);}catch(error){console.error(`FAIL ${name}`);console.error(JSON.stringify(failureSummary(error)));throw new Error('Local API assertion failed');}};
 const request=async(who,method,path,body)=>{
  const headers={'Content-Type':'application/json',Prefer:'return=representation,resolution=merge-duplicates'};
  if(who)headers.Authorization=`Bearer ${tokens[who]}`;
  const res=await fetch(`http://127.0.0.1:${port}/${path}`,{method,headers,redirect:'error',body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  const text=await res.text();return {status:res.status,data:text?JSON.parse(text):null};
 };
 const waitFor=async predicate=>{
  const end=Date.now()+10000;
  while(Date.now()<end){if(await predicate())return;await delay(50);}
  throw new Error('Local lock/readiness condition timed out');
 };
 const blockedUpdate=async(plural,startWrite,startCapture,inspect)=>{
  assert.ok(['educations','activities','certificates'].includes(plural));
  // Controlled barrier: source UPDATE owns its row before waiting on this gate.
  // Capture must be observed waiting on that row before releasing the writer.
  const holder=spawn('docker',[...prefix,...psql],{env,stdio:['pipe','pipe','pipe']});
  let ready=false,stopped=false,output='';
  holder.stdout.on('data',chunk=>{output+=chunk;ready=output.includes('GATE_HELD');});
  holder.stderr.resume();holder.stdin.on('error',()=>{});
  const exited=new Promise(resolve=>{holder.once('exit',()=>{stopped=true;resolve();});holder.once('error',()=>{stopped=true;resolve();});});
  const writes=[];
  try{
   holder.stdin.write("BEGIN; SET LOCAL idle_in_transaction_session_timeout='20s'; SELECT pg_advisory_xact_lock(812347); SELECT 'GATE_HELD';\n");
   await waitFor(()=>{assert.equal(stopped,false);return ready;});
   admin(`CREATE FUNCTION snapshot_test_gate() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_advisory_xact_lock(812347); RETURN NEW; END $$; CREATE TRIGGER snapshot_test_gate BEFORE UPDATE ON user_library_${plural} FOR EACH ROW EXECUTE FUNCTION snapshot_test_gate();`);
   const write=startWrite();writes.push(write);write.catch(()=>{});
   await waitFor(()=>admin("SELECT count(*) FROM pg_locks WHERE locktype='advisory' AND objid=812347 AND NOT granted;").trim()==='1');
   const capture=startCapture();writes.push(capture);capture.catch(()=>{});
   await waitFor(()=>Number(admin("SELECT count(*) FROM pg_stat_activity WHERE pid<>pg_backend_pid() AND wait_event_type='Lock' AND query LIKE '%capture_portfolio_item_snapshot%';").trim())>=1);
   holder.stdin.end('COMMIT;\n');
   const [w,c]=await Promise.all([write,capture]);await inspect(w,c);
  }finally{
   if(!stopped&&!holder.stdin.writableEnded)holder.stdin.end('ROLLBACK;\n');
   await Promise.race([exited,delay(1000)]);if(!stopped)holder.kill('SIGTERM');
   await Promise.allSettled(writes);
   admin(`DROP TRIGGER IF EXISTS snapshot_test_gate ON user_library_${plural}; DROP FUNCTION IF EXISTS snapshot_test_gate();`);
  }
 };
 let started=false;
 try{
  console.log(JSON.stringify({phase:'starting isolated local stack',project}));started=true;
  compose(['up','-d','--wait','db']);
  const setup=snapshotSetup();
  for(const [index,sql] of setup.entries()){
   console.log(JSON.stringify({phase:'applying isolated fixture/proposals',step:index+1,total:setup.length}));
   compose([...psql,`--set=authenticator_password=${password}`],sql);
  }
  console.log(JSON.stringify({phase:'starting local API and checking readiness'}));
  compose(['up','-d','api']);
  await waitFor(async()=>{try{return (await request('A','GET','portfolios?select=id')).status===200;}catch{return false;}});
  await snapshotCases({request,admin,check,blockedUpdate});
  assert.equal(results.length,24);
  console.log(JSON.stringify({result:'PASS',suite:'Snapshot isolated real PostgreSQL/PostgREST signed JWT API',cases:results.length,versions,project}));
 }finally{
  if(started)try{compose(['down','--remove-orphans']);}catch{console.error(`Cleanup incomplete: stop only Compose project ${project}; no credentials logged.`);process.exitCode=1;}
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
