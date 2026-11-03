import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const file=fileURLToPath(new URL('../snapshot-api.mjs',import.meta.url));
test('runner rejects target arguments before starting a stack',()=>{
 const r=spawnSync(process.execPath,[file,'--run','https://example.invalid'],{encoding:'utf8'});
 assert.equal(r.status,2);assert.equal(r.stdout,'');assert.match(r.stderr,/Extra arguments forbidden/);
});
test('runner refuses Docker overrides without disclosing endpoints or starting a stack',()=>{
 for(const name of ['DOCKER_HOST','DOCKER_CONTEXT']){
  const r=spawnSync(process.execPath,[file,'--check'],{encoding:'utf8',env:{...process.env,[name]:'synthetic-private-endpoint'}});
  assert.equal(r.status,2);assert.equal(r.stdout,'');assert.match(r.stderr,/NOT_RUN/);assert.doesNotMatch(r.stderr,/synthetic-private-endpoint/);
 }
});


test('failure summary distinguishes timeout from assertions without response or credential text',async()=>{
 const {failureSummary}=await import('../snapshot-api.mjs');
 assert.deepEqual(failureSummary({name:'TimeoutError',message:'PRIVATE_URL',cause:{code:'PRIVATE'}}),{kind:'TimeoutError',actual:'undefined',expected:'undefined'});
 assert.deepEqual(failureSummary({name:'AssertionError',actual:500,expected:409}),{kind:'AssertionError',actual:500,expected:409});
 assert.doesNotMatch(JSON.stringify(failureSummary({name:'PRIVATE',actual:'PRIVATE',expected:{token:'PRIVATE'}})),/PRIVATE/);
});
