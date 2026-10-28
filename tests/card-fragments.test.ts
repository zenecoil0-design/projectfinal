import test from 'node:test';
import assert from 'node:assert/strict';
import { splitCardFields } from '../src/lib/editor/card-fragments';

test('fields flow in order without losing Thai graphemes, whitespace or values', () => {
  const fields = [{key:'title',text:' กิ้👩‍👩‍👧‍👦\n'.repeat(8)}, {key:'detail',text:'รายละเอียด\n'.repeat(9)}, {key:'zero',text:'0'}];
  const segmenter = new Intl.Segmenter('th', {granularity:'grapheme'});
  const size = (text: string) => Array.from(segmenter.segment(text)).length;
  const parts = splitCardFields(fields, values => size(Object.values(values).join('')) <= 20, false);
  assert.ok(parts.length > 1);
  assert.equal(parts[0].continuation, false);
  assert.ok(parts.slice(1).every(part => part.continuation));
  for (const field of fields) assert.equal(parts.map(part => part.fields[field.key] ?? '').join(''), field.text);
  assert.equal(parts.flatMap(part => Object.values(part.fields)).join(''), fields.map(field => field.text).join(''));
  assert.ok(parts.every(part => size(Object.values(part.fields).join('')) <= 20));
});

test('media can occupy the first fragment while text starts on the next', () => {
  const parts = splitCardFields([{key:'title',text:'ชื่อ'}], (_values, continuation) => continuation, true);
  assert.deepEqual(parts, [{fields:{},continuation:false}, {fields:{title:'ชื่อ'},continuation:true}]);
});

test('unfit non-text layout terminates and retains every field for overflow validation', () => {
  const parts = splitCardFields([{key:'title',text:'ชื่อ'}, {key:'detail',text:'รายละเอียด'}], () => false, false);
  assert.equal(parts.map(part => part.fields.title ?? '').join(''), 'ชื่อ');
  assert.equal(parts.map(part => part.fields.detail ?? '').join(''), 'รายละเอียด');
  assert.equal(parts.length, 2);
  assert.deepEqual(splitCardFields([], () => true, false), [{fields:{},continuation:false}]);
});
