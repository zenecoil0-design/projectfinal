import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:net';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {assertLocalDocker,localJwt} from './portfolio-actions-api.mjs';
import {failureSummary} from './snapshot-api.mjs';
import {ownerA,ownerB,storageCases} from './storage/cases.mjs';
const composeFile=fileURLToPath(new URL('./storage/compose.yaml',import.meta.url));
function docker(args,options={}){return execFileSync('docker',args,{encoding:'utf8',stdio:['pipe','pipe','pipe'],timeout:30000,maxBuffer:4*1024*1024,...options});}
export function prerequisites(){
 assert.ok(!process.env.DOCKER_HOST&&!process.env.DOCKER_CONTEXT);
 const contexts=JSON.parse(docker(['context','inspect']));assertLocalDocker(contexts[0]?.Endpoints?.docker?.Host,process.env);
 return {compose:docker(['compose','version','--short']).trim(),engine:docker(['info','--format','{{.ServerVersion}}']).trim()};
}
async function freePort(){
 const server=createServer();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const address=server.address();assert.ok(address&&typeof address==='object');
 await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));return address.port;
}
export async function run(){
 const versions=prerequisites(),project='storage-integration-'+randomBytes(6).toString('hex');
 const secret=randomBytes(32).toString('hex'),port=await freePort();
 const env={...process.env,STORAGE_TEST_PASSWORD:randomBytes(24).toString('hex'),STORAGE_TEST_JWT_SECRET:secret,STORAGE_TEST_PORT:String(port)};
 const prefix=['compose','-f',composeFile,'-p',project];
 const compose=(args,input)=>docker([...prefix,...args],{env,input,timeout:180000});
 const sql=source=>compose(['exec','-T','db','psql','-X','-qAt','-U','postgres','-d','storage_integration','--set=ON_ERROR_STOP=1'],source);
 const tokens={A:localJwt(ownerA,secret),B:localJwt(ownerB,secret)};
 const request=async(who,method,path,body,extra={})=>{
  assert.ok(!path.includes('://')&&!path.startsWith('/'));
  const bytes=Buffer.isBuffer(body);const headers={...(body&&!bytes?{'Content-Type':'application/json'}:{}),...extra};
  if(who)headers.Authorization='Bearer '+tokens[who];
  const r=await fetch(`http://127.0.0.1:${port}/${path}`,{method,headers,body:body===undefined?undefined:bytes?body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(15000)});
  return {status:r.status,contentType:r.headers.get('content-type') ?? '',bytes:Buffer.from(await r.arrayBuffer())};
 };
 let started=false;let count=0;
 try{
  console.log(JSON.stringify({phase:'starting isolated real Storage service',project}));
  started=true;compose(['up','-d','--wait','db']);compose(['up','-d','storage']);
  console.log(JSON.stringify({phase:'waiting for Storage readiness'}));
  const deadline=Date.now()+60000;let ready=false;
  while(Date.now()<deadline){try{if((await request(null,'GET','status')).status===200){ready=true;break;}}catch{}await delay(250);}
  assert.ok(ready,'Storage readiness timeout');
  console.log(JSON.stringify({phase:'applying isolated Storage policies'}));
  sql(readFileSync(new URL('./storage/fixture.sql',import.meta.url),'utf8'));
  sql(readFileSync(new URL('../../supabase/proposals/snapshot-storage-retention.sql',import.meta.url),'utf8'));
  await storageCases({request,check:async(name,fn)=>{try{await fn();count++;console.log('PASS '+name);}catch(error){console.error('FAIL '+name);console.error(JSON.stringify(failureSummary(error)));throw new Error('Storage acceptance failed');}}});
  assert.equal(count,8);console.log(JSON.stringify({result:'PASS',suite:'isolated real Storage HTTP and physical file bytes',cases:count,versions,project}));
 }finally{
  if(started)try{compose(['down','--remove-orphans']);}catch{console.error('Cleanup incomplete for isolated project '+project);process.exitCode=1;}
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const mode=process.argv[2];
 if(process.argv.length>3||!['--run','--check','--help',undefined].includes(mode)){console.error('Extra/unknown arguments forbidden; no target URL accepted.');process.exitCode=2;}
 else if(mode==='--run')run().catch(()=>{console.error('Storage integration did not pass; no hosted fallback. Raw responses and credentials omitted.');process.exitCode=1;});
 else if(mode==='--check'){try{console.log(JSON.stringify({result:'PREREQUISITES_AVAILABLE_NOT_TESTED',...prerequisites()}));}catch{console.error('NOT_RUN: local Docker/Compose unavailable or remote override refused.');process.exitCode=2;}}
 else console.log('--check checks local prerequisites. --run starts disposable local PostgreSQL/Storage and checks file bytes. No hosted target or credentials accepted.');
}
