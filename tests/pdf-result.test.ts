import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatPdfMegabytes, MAX_PDF_BYTES, pdfResult } from '../src/lib/editor/export-pdf';

test('PDF size boundary retains <= target and the identical Blob', () => {
  for (const size of [MAX_PDF_BYTES - 1, MAX_PDF_BYTES, MAX_PDF_BYTES + 1]) {
    const blob = new Blob([new Uint8Array(size)], { type: 'application/pdf' });
    const result = pdfResult(blob);
    assert.equal(result.blob, blob);
    assert.equal(result.exceedsTarget, size > MAX_PDF_BYTES);
  }
});

test('near-target formatting never displays an oversized file as within target', () => {
  assert.equal(formatPdfMegabytes(MAX_PDF_BYTES), '10.00');
  assert.equal(formatPdfMegabytes(MAX_PDF_BYTES + 1), '10.000001');
  assert.equal(formatPdfMegabytes(MAX_PDF_BYTES + 4999), '10.004999');
  assert.equal(formatPdfMegabytes(12_340_000), '12.34');
});
