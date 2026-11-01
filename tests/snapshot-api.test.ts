import test from 'node:test';
import assert from 'node:assert/strict';
import { readPortfolioSnapshots, preparePortfolioSnapshots, acceptPortfolioSnapshot, SnapshotSessionExpired } from '../src/lib/editor/snapshot-api';
const ownerId='00000000-0000-0000-0000-000000000001';
const portfolioId='10000000-0000-0000-0000-000000000001';
const itemId='20000000-0000-0000-0000-000000000001';
function setup() {
  const state={current:true,owner:ownerId,error:null as unknown,response:undefined as unknown};
  const calls: Array<{name:string;args:Record<string,unknown>}>=[];
  const client={auth:{getUser:async()=>({data:{user:{id:state.owner}},error:null})},rpc:async(name:string,args:Record<string,unknown>)=>{
    calls.push({name,args});
    return {data:state.response ?? (name==='prepare_portfolio_item_snapshots'?{portfolio_id:portfolioId,prepared_count:0}:{format_version:1,portfolio_id:portfolioId,section:'activity',items:[]}),error:state.error};
  }};
  return {state,calls,client,context:{portfolioId,ownerId,isCurrent:()=>state.current}};
}
test('read is read-only; explicit preparation validates its result',async()=>{
 const s=setup();assert.deepEqual(await readPortfolioSnapshots(s.client,s.context,'activity'),[]);
 assert.deepEqual(s.calls.map(c=>c.name),['read_portfolio_item_snapshots']);
 assert.deepEqual(await preparePortfolioSnapshots(s.client,s.context),{preparedCount:0});
 for(const response of [{},[],{portfolio_id:'other',prepared_count:0},{portfolio_id:portfolioId,prepared_count:-1}]) {
   s.state.response=response;await assert.rejects(preparePortfolioSnapshots(s.client,s.context));
 }
});
test('foreign or expired sessions never send a mutation',async()=>{
 const s=setup();s.state.owner='other';await assert.rejects(preparePortfolioSnapshots(s.client,s.context),SnapshotSessionExpired);
 s.state.owner=ownerId;s.state.current=false;await assert.rejects(acceptPortfolioSnapshot(s.client,s.context,'activity',itemId,'a'.repeat(32)),SnapshotSessionExpired);
 assert.equal(s.calls.length,0);
});
test('accept sends the reviewed revision once and reads back; failed readback never retries acceptance',async()=>{
 const s=setup();await acceptPortfolioSnapshot(s.client,s.context,'activity',itemId,'a'.repeat(32));
 assert.deepEqual(s.calls.map(c=>c.name),['capture_portfolio_item_snapshot','read_portfolio_item_snapshots']);
 assert.equal(s.calls[0].args.p_expected_revision,'a'.repeat(32));
 s.state.response={};await assert.rejects(acceptPortfolioSnapshot(s.client,s.context,'activity',itemId,'b'.repeat(32)));
 assert.equal(s.calls.filter(c=>c.name==='capture_portfolio_item_snapshot').length,2);
});
test('late mutation response cannot trigger another owner read or return usable data',async()=>{
 const s=setup();const original=s.client.rpc;
 s.client.rpc=async(name,args)=>{const result=await original(name,args);s.state.current=false;return result;};
 await assert.rejects(acceptPortfolioSnapshot(s.client,s.context,'activity',itemId,'a'.repeat(32)),SnapshotSessionExpired);
 assert.equal(s.calls.length,1);
});
test('backend and malformed results fail closed without exposing backend text',async()=>{
 const s=setup();s.state.error={message:'PRIVATE_SQL'};
 await assert.rejects(readPortfolioSnapshots(s.client,s.context,'activity'),e=>e instanceof Error&&!e.message.includes('PRIVATE_SQL'));
 assert.equal(s.calls.length,1);
 s.state.error=null;s.state.response={};await assert.rejects(readPortfolioSnapshots(s.client,s.context,'activity'));
 await assert.rejects(acceptPortfolioSnapshot(s.client,s.context,'activity',itemId,'a'.repeat(32)+'\n'));
 assert.equal(s.calls.length,2);
});
