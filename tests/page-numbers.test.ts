import { test } from 'node:test';
import assert from 'node:assert/strict';
import { documentPageNumbers } from '../src/lib/editor/page-numbers';

test('physical pages include front matter; content numbers continue across real multi-page sections', () => {
  const pages = ['cover', 'preface', 'profile', 'education', 'education', 'activity', 'activity', 'activity', 'certificate'];
  const result = documentPageNumbers(pages.map((sectionId, index) => ({ sectionId, numbered: index > 1 })));
  assert.deepEqual(result.map(page => page.physical), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(result.map(page => page.printed), [null, null, 1, 2, 3, 4, 5, 6, 7]);
});

test('absent profile and extra unnumbered front matter require no offset formula changes', () => {
  const result = documentPageNumbers([
    { sectionId: 'cover', numbered: false },
    { sectionId: 'future-front-matter', numbered: false },
    { sectionId: 'education', numbered: true },
    { sectionId: 'education', numbered: true },
    { sectionId: 'certificate', numbered: true },
  ]);
  assert.deepEqual(result.map(page => page.printed), [null, null, 1, 2, 3]);
  assert.equal(result.at(-1)?.physical, 5);
  assert.deepEqual(documentPageNumbers([]), []);
});

test('each calculation is independent of previous portfolios and section availability', () => {
  documentPageNumbers(Array.from({ length: 20 }, () => ({ sectionId: 'activity', numbered: true })));
  assert.deepEqual(documentPageNumbers([{ sectionId: 'certificate', numbered: true }]), [{ sectionId: 'certificate', physical: 1, printed: 1 }]);
});
