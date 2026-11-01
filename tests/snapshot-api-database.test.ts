import test from 'node:test';
import assert from 'node:assert/strict';
import { A, PA, LA, asUser, sections } from './helpers/baseline';
import { snapshotLibraryDatabase, snapshotProposal } from './helpers/snapshot';
import { preparePortfolioSnapshots, readPortfolioSnapshots, acceptPortfolioSnapshot } from '../src/lib/editor/snapshot-api';

// Exercise the real proposed SQL through the production adapter. This bridge
// replaces transport only; it does not fabricate successful RPC responses.
for (const [section, plural] of sections) test(section + ': adapter and SQL agree on accepted editions', async () => {
 const db = await snapshotLibraryDatabase();
 try {
  await db.exec(snapshotProposal('snapshot-transition-read'));
  await asUser(db,A);
  const calls: string[]=[];
  const client={
   auth:{getUser:async()=>({data:{user:{id:A}},error:null})},
   rpc:async(name:string,args:Record<string,unknown>)=>{
    calls.push(name);
    const commands:Record<string,{sql:string;values:unknown[]}>={
     prepare_portfolio_item_snapshots:{sql:'SELECT prepare_portfolio_item_snapshots($1) AS result',values:[args.p_portfolio_id]},
     read_portfolio_item_snapshots:{sql:'SELECT read_portfolio_item_snapshots($1,$2) AS result',values:[args.p_portfolio_id,args.p_section]},
     capture_portfolio_item_snapshot:{sql:'SELECT capture_portfolio_item_snapshot($1,$2,$3,$4,$5) AS result',
      values:[args.p_portfolio_id,args.p_section,args.p_item_id,args.p_refresh,args.p_expected_revision]},
    };
    const command=commands[name];
    assert.ok(command);
    try {
     const result=await db.query<{result:unknown}>(command.sql,command.values);
     return {data:result.rows[0].result,error:null};
    } catch(error) {return {data:null,error};}
   },
  };
  const context={portfolioId:PA,ownerId:A,isCurrent:()=>true};
  await preparePortfolioSnapshots(client,context);
  const original=await readPortfolioSnapshots(client,context,section);
  const change=async(value:string)=>{
   await db.exec('RESET ROLE');
   await db.query(`UPDATE user_library_${plural} SET ${section==='education'?'school_name':'title'}=$1 WHERE id=$2`,[value,LA]);
   await asUser(db,A);
  };
  await change('Reviewed update');
  const pending=await readPortfolioSnapshots(client,context,section);
  assert.deepEqual(pending[0].item,original[0].item);
  assert.equal(pending[0].hasUpdate,true);
  const accepted=await acceptPortfolioSnapshot(client,context,section,LA,pending[0].latestRevision);
  assert.equal(accepted[0].version,2);
  assert.equal(accepted[0].hasUpdate,false);
  assert.notDeepEqual(accepted[0].item,original[0].item);
  await change('Unreviewed newer update');
  const before=calls.filter(name=>name==='capture_portfolio_item_snapshot').length;
  await assert.rejects(acceptPortfolioSnapshot(client,context,section,LA,pending[0].latestRevision));
  assert.equal(calls.filter(name=>name==='capture_portfolio_item_snapshot').length,before+1);
  const unchanged=await readPortfolioSnapshots(client,context,section);
  assert.deepEqual(unchanged[0].item,accepted[0].item);
  assert.equal(unchanged[0].version,2);
  await db.query(`DELETE FROM user_library_${plural} WHERE id=$1`,[LA]);
  assert.deepEqual(await readPortfolioSnapshots(client,context,section),[]);
 } finally {await db.close();}
});
