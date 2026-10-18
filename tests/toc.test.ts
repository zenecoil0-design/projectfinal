import { test } from 'node:test';
import assert from 'node:assert/strict';
import { documentContents, documentPageNumbers } from '../src/lib/editor/page-numbers';

test('TOC groups actual content pages and uses printed starts, not physical pages', () => {
  const order = ['cover', 'preface', 'toc', 'profile', 'education', 'education', 'education', ...Array(10).fill('activity'), 'certificate'];
  const pages = documentPageNumbers(order.map(sectionId => ({ sectionId, numbered: !['cover', 'preface', 'toc'].includes(sectionId) })));
  assert.deepEqual(documentContents(pages, { profile: 'ประวัติส่วนตัว', education: 'ประวัติการศึกษา', activity: 'ผลงานและกิจกรรม', certificate: 'เกียรติบัตร' }), [
    { sectionId: 'profile', title: 'ประวัติส่วนตัว', page: 1 },
    { sectionId: 'education', title: 'ประวัติการศึกษา', page: 2 },
    { sectionId: 'activity', title: 'ผลงานและกิจกรรม', page: 5 },
    { sectionId: 'certificate', title: 'เกียรติบัตร', page: 15 },
  ]);
  assert.equal(pages.at(-1)?.physical, 18);
});

test('missing content sections and extra front matter produce only the actual section starts', () => {
  const pages = documentPageNumbers([{ sectionId: 'extra-front', numbered: false }, { sectionId: 'toc', numbered: false }, { sectionId: 'education', numbered: true }, { sectionId: 'education', numbered: true }, { sectionId: 'certificate', numbered: true }]);
  assert.deepEqual(documentContents(pages, { education: 'ชื่อหมวดจากเอกสาร', certificate: 'เกียรติบัตร' }), [{ sectionId: 'education', title: 'ชื่อหมวดจากเอกสาร', page: 1 }, { sectionId: 'certificate', title: 'เกียรติบัตร', page: 3 }]);
  assert.deepEqual(documentContents([], {}), []);
});

test('a fresh layout recalculates without retaining entries from a previous portfolio', () => {
  documentContents(documentPageNumbers(Array.from({ length: 20 }, () => ({ sectionId: 'activity', numbered: true }))), {});
  assert.deepEqual(documentContents(documentPageNumbers([{ sectionId: 'profile', numbered: true }]), { profile: 'ประวัติส่วนตัว' }), [{ sectionId: 'profile', title: 'ประวัติส่วนตัว', page: 1 }]);
});
