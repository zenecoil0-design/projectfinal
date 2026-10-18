import { test, expect, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { openEditorSection } from './helpers/editor';

const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
test.beforeEach(async ({ context, request }) => {
  await request.get('http://127.0.0.1:54321/__reset');
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const session = { access_token: `${part({ alg: 'HS256' })}.${part({ sub: user.id, exp: 4102444800 })}.test`, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user };
  await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + part(session), domain: '127.0.0.1', path: '/' }]);
});

async function ready(page: Page) {
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
}

for (const total of [13, 21]) {
  test(`actual ${total}-page PDF matches Preview, all page markers and A4; hidden mobile Preview exports too`, async ({ page }, testInfo) => {
    const cards = total - 6;
    const pictures = await page.evaluate(count => Array.from({ length: count }, (_, index) => {
      const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 160;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = `rgb(${55 + index * 10},150,50)`; ctx.fillRect(0, 0, 320, 160);
      ctx.strokeStyle = 'black'; ctx.lineWidth = 4; ctx.strokeRect(4, 4, 312, 152);
      ctx.beginPath(); ctx.arc(80, 80, 40, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'white'; ctx.font = 'bold 32px sans-serif'; ctx.fillText(`M${index}`, 150, 90);
      return canvas.toDataURL();
    }), cards);
    await page.route('**/rest/v1/user_library_activities?**', route => route.fulfill({ json: pictures.map((_, index) => ({ id: `long-${index}`, title: `ORDER ${String(index).padStart(2, '0')} ผลงานทดสอบภาษาไทย`, description: 'ข้อความภาษาไทยสำหรับตรวจความชัดเจนและลำดับหน้า\n'.repeat(14), organization: '', activity_date: null })) }));
    await page.route('**/rest/v1/user_library_activity_images?**', route => route.fulfill({ json: pictures.map((image_url, index) => ({ id: `image-${index}`, activity_id: `long-${index}`, image_url, sort_order: 0 })) }));
    await page.route('**/rest/v1/portfolio_activities?**', route => route.fulfill({ json: pictures.map((_, index) => ({ activity_id: `long-${index}`, sort_order: index })) }));
    await page.setViewportSize({ width: total === 13 ? 390 : 1440, height: 1000 }); await ready(page);
    await expect(page.locator('[data-portfolio-page]')).toHaveCount(total);
    await expect(page.getByText(`${total} หน้า`, { exact: true })).toBeVisible();
    const sections = await page.locator('[data-portfolio-page]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-section')));
    expect(sections.slice(5, -1)).toEqual(Array(cards).fill('ผลงานและกิจกรรม'));
    await page.locator('#editor-heading-cover').click();
    await expect(page.locator('aside [aria-expanded=true]')).toHaveCount(0);
    if (total === 13) {
      await page.setViewportSize({ width: 390, height: 1000 });
      await expect(page.locator('main')).toBeHidden();
    }
    const progress: string[] = [];
    await page.exposeFunction('recordPdfProgress', (value: string) => { if (value.includes('กำลังสร้าง PDF หน้า')) progress.push(value); });
    await page.evaluate(() => {
      new MutationObserver(() => {
        document.querySelectorAll('[role=status]').forEach(node => {
          if (node.textContent?.includes('กำลังสร้าง PDF หน้า')) void (window as unknown as { recordPdfProgress: (value: string) => Promise<void> }).recordPdfProgress(node.textContent);
        });
      }).observe(document.body, { subtree: true, childList: true, characterData: true });
    });
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true }).click();
    await expect(page.getByRole('button', { name: 'กำลังส่งออก…', exact: true })).toBeDisabled();
    const path = testInfo.outputPath(`portfolio-${total}.pdf`);
    await (await download).saveAs(path);
    const audit = JSON.parse(execFileSync(process.env.CODEX_PRIMARY_RUNTIME_PYTHON || 'python', ['tests/pdf-inspect.py', path], { encoding: 'utf8' }));
    expect(audit.pages).toBe(total); expect(audit.bytes).toBeLessThanOrEqual(10_000_000);
    expect(audit.markers).toEqual([null, null, null, null, null, ...pictures.map((_, index) => index), null]);
    expect(audit.uniqueRasters).toBe(total);
    for (const [width, height] of audit.boxes) { expect(width).toBeCloseTo(595.28, 1); expect(height).toBeCloseTo(841.89, 1); }
    expect(progress.some(value => value.includes(`หน้า 11 / ${total}`))).toBe(true);
    expect(progress.some(value => value.includes(`หน้า ${total} / ${total}`))).toBe(true);
    await expect(page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true })).toBeEnabled();
    expect(await page.evaluate(() => Array.from(document.body.children).filter(node => node instanceof HTMLElement && node.style.left === '-10000px').length)).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`export-${total}-toolbar.png`) });
    await testInfo.attach(`pdf-${total}-audit`, { body: JSON.stringify({ ...audit, sections, progress }, null, 2), contentType: 'application/json' });
  });
}

test('synchronous duplicate clicks share one export and canvas failure restores retry without changing selection', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const state = { decodes: 0, releases: [] as (() => void)[], fail: false, armed: false, failedCanvas: null as HTMLCanvasElement | null };
    (window as unknown as { pdfTest: typeof state }).pdfTest = state;
    const decode = HTMLImageElement.prototype.decode;
    HTMLImageElement.prototype.decode = async function () {
      if (state.armed && this.closest('[data-portfolio-page]') && this.src.includes('/sample.png')) { state.decodes++; await new Promise<void>(resolve => { state.releases.push(resolve); }); }
      return decode.call(this);
    };
    const toDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function (...args) {
      if (state.fail && args[0] === 'image/jpeg' && this.width >= 794 && this.height >= 1123) { state.fail = false; state.failedCanvas = this; throw new Error('SIMULATED CANVAS FAILURE'); }
      return toDataURL.apply(this, args);
    };
  });
  await ready(page);
  const before = await page.locator('main').innerText();
  const images = await page.locator('[data-portfolio-page] img').count();
  await page.evaluate(() => { (window as unknown as { pdfTest: { armed: boolean } }).pdfTest.armed = true; });
  await page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true }).evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
  await expect.poll(() => page.evaluate(() => (window as unknown as { pdfTest: { decodes: number } }).pdfTest.decodes)).toBe(images);
  await page.evaluate(() => { const s = (window as unknown as { pdfTest: { fail: boolean; releases: (() => void)[] } }).pdfTest; s.fail = true; s.releases.splice(0).forEach(done => done()); });
  await expect(page.getByText('SIMULATED CANVAS FAILURE', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true })).toBeEnabled();
  expect(await page.locator('main').innerText()).toBe(before);
  expect(await page.evaluate(() => {
    const canvas = (window as unknown as { pdfTest: { failedCanvas: HTMLCanvasElement } }).pdfTest.failedCanvas;
    return [canvas.width, canvas.height];
  })).toEqual([0, 0]);
  expect(await page.evaluate(() => Array.from(document.body.children).filter(node => node instanceof HTMLElement && node.style.left === '-10000px').length)).toBe(0);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { pdfTest: { decodes: number } }).pdfTest.decodes)).toBe(images * 2);
  await page.evaluate(() => (window as unknown as { pdfTest: { releases: (() => void)[] } }).pdfTest.releases.splice(0).forEach(done => done()));
  await (await download).saveAs(testInfo.outputPath('retry-success.pdf'));
  await openEditorSection(page, 'activity'); await expect(page.locator('form:visible input[type=checkbox]').first()).toBeChecked();
});

test('image decode, image fetch and no-page errors never download silently and allow retry', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const state = { mode: '' };
    (window as unknown as { pdfFailure: typeof state }).pdfFailure = state;
    const decode = HTMLImageElement.prototype.decode;
    HTMLImageElement.prototype.decode = async function () {
      if (state.mode === 'decode' && this.src.includes('/sample.png')) throw new Error('DECODE TEST');
      return decode.call(this);
    };
    const fetchImage = window.fetch;
    window.fetch = async (...args) => {
      if (state.mode === 'fetch' && String(args[0]).includes('/sample.png')) return new Response('', { status: 403 });
      return fetchImage(...args);
    };
  });
  await ready(page);
  let downloads = 0; page.on('download', () => downloads++);
  const submit = page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true });
  for (const [mode, message] of [['decode', 'มีรูปภาพโหลดไม่สำเร็จ'], ['fetch', 'ไม่สามารถนำรูปภาพบางรูปใส่ PDF ได้']]) {
    await page.evaluate(mode => { (window as unknown as { pdfFailure: { mode: string } }).pdfFailure.mode = mode; }, mode);
    await submit.click();
    await expect(page.getByText(message, { exact: false })).toBeVisible();
    await expect(submit).toBeEnabled(); expect(downloads).toBe(0);
  }
  await page.evaluate(() => {
    (window as unknown as { pdfFailure: { mode: string } }).pdfFailure.mode = '';
    document.querySelectorAll('[data-portfolio-page]').forEach(node => { node.setAttribute('data-test-page', ''); node.removeAttribute('data-portfolio-page'); });
    // Actual application page-count changes are child-list changes, not attribute edits.
    const tick = document.createElement('i'); document.querySelector('main')!.appendChild(tick); tick.remove();
  });
  await expect(page.getByText('0 หน้า', { exact: true })).toBeVisible();
  await submit.click(); await expect(page.getByText('ยังไม่มีหน้าสำหรับส่งออก', { exact: true })).toBeVisible();
  await expect(submit).toBeEnabled(); expect(downloads).toBe(0);
  await page.evaluate(() => document.querySelectorAll('[data-test-page]').forEach(node => { node.setAttribute('data-portfolio-page', ''); node.removeAttribute('data-test-page'); }));
  const download = page.waitForEvent('download'); await submit.click();
  await (await download).saveAs(testInfo.outputPath('images-retry-success.pdf'));
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await expect(page.getByText('ยังไม่บันทึก:', { exact: false })).toHaveCount(0);
  expect(downloads).toBe(1);
});
