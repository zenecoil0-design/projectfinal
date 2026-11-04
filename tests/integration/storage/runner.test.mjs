import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
for(const mode of ['--check','--run'])test(mode+' refuses remote Docker before any connection',()=>{
 const r=spawnSync(process.execPath,['tests/integration/storage-api.mjs',mode],{encoding:'utf8',env:{...process.env,DOCKER_HOST:'tcp://invalid.invalid:2375'}});
 assert.notEqual(r.status,0);assert.ok(!r.stderr.includes('invalid.invalid'));
});
test('runner refuses extra arguments and has no import side effects',()=>{
 const r=spawnSync(process.execPath,['tests/integration/storage-api.mjs','--run','https://invalid.invalid'],{encoding:'utf8'});assert.equal(r.status,2);
 const imported=spawnSync(process.execPath,['--input-type=module','-e',"await import('./tests/integration/storage-api.mjs')"],{encoding:'utf8'});assert.equal(imported.status,0);assert.equal(imported.stdout,'');
});
