import test from 'node:test';
import assert from 'node:assert/strict';
import {splitText} from '../src/lib/editor/split-text';
test('Thai marks, emoji and whitespace survive splitting exactly',()=>{
 const text='กิ้ 👩‍👩‍👧‍👦\nทดสอบ\n'.repeat(10);
 const pages=splitText(text,p=>Array.from(new Intl.Segmenter('th',{granularity:'grapheme'}).segment(p)).length<=10);
 assert.ok(pages.length>1);assert.equal(pages.join(''),text);
 for(const page of pages)assert.ok(!page.startsWith('\u200d'));
});
test('empty and unfit content retain input for overflow validation',()=>{
 assert.deepEqual(splitText('',()=>true),['']);assert.deepEqual(splitText('กิ้👩‍👩‍👧‍👦',()=>false),['กิ้👩‍👩‍👧‍👦']);
});
