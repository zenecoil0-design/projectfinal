import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseActionReceipt,readPending,savePending,clearPending,actionStorageKey,type ActionRequest} from '../src/lib/portfolio-actions';
const r:ActionRequest={owner:'owner',requestId:'30000000-0000-0000-0000-000000000001',sourceId:'source',action:'duplicate',title:'สำเนา'};
test('receipts must match the exact request; absent and malformed results remain uncertain',()=>{
 const receipt={request_id:r.requestId,source_id:r.sourceId,action:r.action,title:r.title,status:'confirmed',portfolio_id:'copy'};
 assert.deepEqual(parseActionReceipt(receipt,r),{status:'confirmed',portfolioId:'copy'});
 for(const value of [null,{}, {...receipt,request_id:'other'},{...receipt,title:'other'},{...receipt,portfolio_id:'source'}, {...receipt,status:'rejected'}])assert.deepEqual(parseActionReceipt(value,r),{status:'uncertain'});
 assert.deepEqual(parseActionReceipt({...receipt,status:'rejected',portfolio_id:null},r),{status:'rejected'});
});
test('persisted requests survive recreation, isolate owners and never clear a different request',()=>{
 const map=new Map<string,string>();const storage={getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v);},removeItem:(k:string)=>{map.delete(k);}};
 savePending(storage,r);assert.deepEqual(readPending(storage,'owner'),r);assert.equal(readPending(storage,'other'),null);
 clearPending(storage,{...r,requestId:'different'});assert.deepEqual(readPending(storage,'owner'),r);
 clearPending(storage,r);assert.equal(readPending(storage,'owner'),null);
 storage.setItem(actionStorageKey('owner'),'{bad');assert.throws(()=>readPending(storage,'owner'));
 assert.throws(()=>savePending({...storage,setItem:()=>{},getItem:()=>null},r));
});
