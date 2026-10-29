import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePortfolioSnapshots, type SnapshotSection } from '../src/lib/editor/snapshot-reader';
import { A, B, PA, PB, LA } from './helpers/baseline';
const context={portfolioId:PA,ownerId:A};
const revision='a'.repeat(32);
function fixture(section: SnapshotSection) {
  return {format_version:1,portfolio_id:PA,section,items:[{
    item_id:LA,sort_order:3,revision,latest_revision:revision,version:1,
    data:{item:{id:LA,user_id:A,title:'  0  ',description:null,activity_date:null,organization:'',
      issued_date:null,issued_by:null,image_url:null,level:'',school_name:'School',study_plan:null,
      start_year:null,end_year:null,gpa:0,logo_url:null}, images:[]},
  }]};
}
function image(index: number, section='certificate') {
  return {id:`40000000-0000-0000-0000-${String(index).padStart(12,'0')}`,
    [`${section}_id`]:LA,image_url:`https://example.invalid/${index}.png`,sort_order:index};
}

test('reader maps nullable text and zero without trimming or modifying the response',()=>{
  const activity=fixture('activity');
  const before=structuredClone(activity);
  assert.deepEqual(parsePortfolioSnapshots(activity,'activity',context)[0].item,{
    id:LA,title:'  0  ',description:'',activityDate:'',organization:'',images:[],
  });
  assert.deepEqual(activity,before);
  const education=parsePortfolioSnapshots(fixture('education'),'education',context)[0];
  assert.equal(education.item.gpa,'0');
  assert.equal(education.item.logoUrl,'');
  assert.equal(education.hasUpdate,false);
});

test('reader keeps every accepted image including legacy excess, legacy single URL and broken URLs',()=>{
  const value=fixture('certificate');
  const input={...value,items:[{...value.items[0],data:{...value.items[0].data,images:[image(1),image(2),image(3)]}}]};
  assert.deepEqual(parsePortfolioSnapshots(input,'certificate',context)[0].item.images,
    ['https://example.invalid/1.png','https://example.invalid/2.png','https://example.invalid/3.png']);
  const legacy={...value,items:[{...value.items[0],data:{...value.items[0].data,item:{...value.items[0].data.item,image_url:'legacy-broken.png'}}}]};
  assert.deepEqual(parsePortfolioSnapshots(legacy,'certificate',context)[0].item.images,['legacy-broken.png']);
  input.items[0].data.images[0].image_url='broken-url';
  assert.equal(parsePortfolioSnapshots(input,'certificate',context)[0].item.images[0],'broken-url');
});

test('reader rejects malformed/foreign responses instead of reporting an empty selection',()=>{
  const value=fixture('activity');
  for(const bad of [null,{},[],{...value,items:null},{...value,format_version:2},
    {...value,portfolio_id:PB},{...value,section:'certificate'}]) {
    assert.throws(()=>parsePortfolioSnapshots(bad,'activity',context));
  }
  assert.throws(()=>parsePortfolioSnapshots(value,'activity',{...context,ownerId:B}));
  assert.deepEqual(parsePortfolioSnapshots({...value,items:[]},'activity',context),[]);
  for(const patch of [{data:null},{version:0},{version:1.5},{version:Number.MAX_SAFE_INTEGER+1},
    {revision:null},{latest_revision:null},{revision:revision+'\n'},{sort_order:-1},{item_id:'wrong'}]) {
    assert.throws(()=>parsePortfolioSnapshots({...value,items:[{...value.items[0],...patch}]},'activity',context));
  }
  for(const patch of [{id:'wrong'},{user_id:B},{title:undefined},{description:{message:'raw backend error'}}]) {
    assert.throws(()=>parsePortfolioSnapshots({...value,items:[{...value.items[0],data:{
      ...value.items[0].data,item:{...value.items[0].data.item,...patch}}}]},'activity',context));
  }
});

test('reader rejects duplicate/unordered selections and foreign, duplicate or incomplete image rows',()=>{
  const value=fixture('activity');
  assert.throws(()=>parsePortfolioSnapshots({...value,items:[value.items[0],value.items[0]]},'activity',context));
  const later={...value.items[0],item_id:'20000000-0000-0000-0000-000000000004',sort_order:2,
    data:{...value.items[0].data,item:{...value.items[0].data.item,id:'20000000-0000-0000-0000-000000000004'}}};
  assert.throws(()=>parsePortfolioSnapshots({...value,items:[value.items[0],later]},'activity',context));
  for(const images of [null,{},[image(1)], // certificate parent is not an activity parent
    [image(1,'activity'),image(1,'activity')],[image(2,'activity'),image(1,'activity')],
    [{...image(1,'activity'),image_url:null}],[{...image(1,'activity'),activity_id:PB}]]) {
    assert.throws(()=>parsePortfolioSnapshots({...value,items:[{...value.items[0],data:{...value.items[0].data,images}}]},'activity',context));
  }
});

test('update marker compares revisions without changing the accepted content or version',()=>{
  const value=fixture('education');
  value.items[0].latest_revision='b'.repeat(32);
  value.items[0].version=2;
  const result=parsePortfolioSnapshots(value,'education',context)[0];
  assert.equal(result.hasUpdate,true);
  assert.equal(result.version,2);
  assert.equal(result.item.schoolName,'School');
  for(const gpa of [undefined,'0',NaN,Infinity]) {
    const bad={...value,items:[{...value.items[0],data:{...value.items[0].data,item:{...value.items[0].data.item,gpa}}}]};
    assert.throws(()=>parsePortfolioSnapshots(bad,'education',context));
  }
});
