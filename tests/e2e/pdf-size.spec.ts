import { test, expect, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

// Size mocks still rasterize seven pages at all three quality levels. Allow the
// real renderer to finish on slower workers; keep ordinary UI waits unchanged.
const PDF_CONFIRMATION_TIMEOUT = 30_000;

const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
test.beforeEach(async ({ context, request }) => {
  await request.get('http://127.0.0.1:54321/__reset');
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const session = { access_token: `${part({ alg: 'HS256' })}.${part({ sub: user.id, exp: 4102444800 })}.test`, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user };
  await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + part(session), domain: '127.0.0.1', path: '/' }]);
});

/** Component boundary mock: only reported PDF Blob size is mocked, not claimed as a real large file. */
async function sizeMock(page: Page, bytes: number) {
  await page.addInitScript(bytes => {
    const state = { bytes, builds: 0, last: null as Blob | null, same: false, urls: 0, revoked: [] as string[] };
    (window as unknown as { pdfSize: typeof state }).pdfSize = state;
    const NativeBlob = window.Blob;
    window.Blob = class extends NativeBlob {
      constructor(...args: ConstructorParameters<typeof Blob>) {
        super(...args);
        if (this.type === 'application/pdf') {
          state.builds++; state.last = this;
          Object.defineProperty(this, 'size', { value: state.bytes });
        }
      }
    };
    const create = URL.createObjectURL;
    URL.createObjectURL = blob => { if (blob === state.last) { state.same = true; state.urls++; } return create(blob); };
    const revoke = URL.revokeObjectURL;
    URL.revokeObjectURL = url => { state.revoked.push(url); return revoke(url); };
  }, bytes);
}

async function ready(page: Page) {
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
}

for (const bytes of [9_999_999, 10_000_000]) {
  test(`size mock ${bytes}: direct download at or below target, no confirmation`, async ({ page }, testInfo) => {
    await sizeMock(page, bytes); await ready(page);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true }).click();
    await (await download).saveAs(testInfo.outputPath('boundary.pdf'));
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(await page.evaluate(() => {
      const s = (window as unknown as { pdfSize: { builds: number; same: boolean; urls: number } }).pdfSize;
      return [s.builds, s.same, s.urls];
    })).toEqual([1, true, 1]);
  });
}

test('oversize mock waits, cancel/Escape do not download, confirm uses same Blob without rendering again', async ({ page }, testInfo) => {
  await sizeMock(page, 10_000_001); await ready(page);
  const picker = page.getByLabel('เทมเพลต', { exact: true });
  await picker.selectOption('minimal');
  await expect(page.locator('.minimal-cover')).toBeVisible();
  let downloads = 0; page.on('download', () => downloads++);
  const start = page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true });
  const dialog = page.getByRole('dialog', { name: 'ดาวน์โหลดไฟล์ PDF ขนาดใหญ่' });
  await start.click();
  await expect(picker).toBeDisabled();
  await expect(dialog).toBeVisible({ timeout: PDF_CONFIRMATION_TIMEOUT });
  expect(await page.locator('[role=switch]').evaluateAll(inputs => inputs.every(input => (input as HTMLInputElement).disabled))).toBe(true);
  await expect(picker).toBeDisabled();
  await expect(dialog).toContainText('10.000001 MB'); await expect(dialog).toContainText('10,000,001 bytes');
  await expect(dialog.getByRole('button', { name: 'ยกเลิก', exact: true })).toBeFocused();
  expect(downloads).toBe(0);
  await expect(page.getByLabel('ชื่อบนหน้าปก', { exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'กำลังส่งออก…', exact: true })).toBeDisabled();
  await dialog.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
  await expect(dialog).toHaveCount(0); await expect(start).toBeEnabled(); await expect(start).toBeFocused();
  await expect(picker).toBeEnabled(); await expect(picker).toHaveValue('minimal');
  expect(downloads).toBe(0);
  await start.click(); await expect(dialog).toBeVisible({ timeout: PDF_CONFIRMATION_TIMEOUT }); await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0); await expect(start).toBeFocused(); expect(downloads).toBe(0);
  await start.click(); await expect(dialog).toBeVisible({ timeout: PDF_CONFIRMATION_TIMEOUT });
  const builds = await page.evaluate(() => (window as unknown as { pdfSize: { builds: number } }).pdfSize.builds);
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'ดาวน์โหลดต่อ', exact: true }).evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
  await (await download).saveAs(testInfo.outputPath('confirmed-mock.pdf'));
  await expect(dialog).toHaveCount(0); await expect(start).toBeEnabled();
  expect(downloads).toBe(1);
  expect(await page.evaluate(() => {
    const s = (window as unknown as { pdfSize: { builds: number; same: boolean; urls: number } }).pdfSize;
    return [s.builds, s.same, s.urls];
  })).toEqual([builds, true, 1]);
});

test('confirmation keyboard/mobile layout, awaiting lock and URL cleanup after a completed download', async ({ page }, testInfo) => {
  await sizeMock(page, 12_340_000); await ready(page);
  const start = page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true });
  const dialog = page.getByRole('dialog', { name: 'ดาวน์โหลดไฟล์ PDF ขนาดใหญ่' });
  await start.click(); await expect(dialog).toBeVisible({ timeout: PDF_CONFIRMATION_TIMEOUT });
  const builds = await page.evaluate(() => (window as unknown as { pdfSize: { builds: number } }).pdfSize.builds);
  await page.getByRole('button', { name: 'กำลังส่งออก…', exact: true }).evaluate(button => { (button as HTMLButtonElement).click(); });
  expect(await page.evaluate(() => (window as unknown as { pdfSize: { builds: number } }).pdfSize.builds)).toBe(builds);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 720 });
    await expect(dialog.getByRole('button', { name: 'ยกเลิก', exact: true })).toBeFocused();
    await page.keyboard.press('Tab'); await expect(dialog.getByRole('button', { name: 'ดาวน์โหลดต่อ', exact: true })).toBeFocused();
    await page.keyboard.press('Tab'); await expect(dialog.getByRole('button', { name: 'ยกเลิก', exact: true })).toBeFocused();
    await page.keyboard.press('Shift+Tab'); await expect(dialog.getByRole('button', { name: 'ดาวน์โหลดต่อ', exact: true })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    const bounds = await dialog.boundingBox(); expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`large-dialog-${width}.png`) });
  }
  await page.keyboard.press('Enter'); await expect(dialog).toHaveCount(0); await expect(start).toBeFocused();
  await start.click(); await expect(dialog).toBeVisible({ timeout: PDF_CONFIRMATION_TIMEOUT });
  const download = page.waitForEvent('download'); await dialog.getByRole('button', { name: 'ดาวน์โหลดต่อ', exact: true }).click();
  await (await download).saveAs(testInfo.outputPath('cleanup.pdf'));
  await page.getByRole('link', { name: 'กลับ Dashboard', exact: true }).click(); await expect(page).toHaveURL(/dashboard/);
  await expect.poll(() => page.evaluate(() => (window as unknown as { pdfSize: { revoked: string[] } }).pdfSize.revoked.length)).toBe(1);
});

for (const navigation of ['portfolio', 'account'] as const) {
  for (const phase of ['generating', 'confirming'] as const) {
    test(`${navigation} change during ${phase} cancels old PDF results and dialog`, async ({ page }) => {
      await sizeMock(page, 12_340_000);
      await page.addInitScript(() => {
        const state = { armed: false, releases: [] as (() => void)[], staleLayouts: 0 };
        (window as unknown as { pdfDelay: typeof state }).pdfDelay = state;
        const decode = HTMLImageElement.prototype.decode;
        HTMLImageElement.prototype.decode = async function () {
          if (state.armed && this.closest('[data-portfolio-page]')) await new Promise<void>(resolve => { state.releases.push(resolve); });
          return decode.call(this);
        };
      });
      await ready(page);
      if (phase === 'generating') await page.evaluate(() => {
        const state = (window as unknown as { pdfDelay: { armed: boolean; staleLayouts: number } }).pdfDelay;
        const main = document.querySelector('main')!;
        const connected = Object.getOwnPropertyDescriptor(Node.prototype, 'isConnected')!.get!;
        // Observe the real detached-layout rejection without changing its result.
        Object.defineProperty(main, 'isConnected', { get() { const value = connected.call(main); if (!value) state.staleLayouts++; return value; } });
        state.armed = true;
      });
      await page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true }).click();
      if (phase === 'confirming') await expect(page.getByRole('dialog')).toBeVisible({ timeout: PDF_CONFIRMATION_TIMEOUT });
      else await expect.poll(() => page.evaluate(() => (window as unknown as { pdfDelay: { releases: (() => void)[] } }).pdfDelay.releases.length)).toBeGreaterThan(0);
      let downloads = 0; page.on('download', () => downloads++);
      if (navigation === 'portfolio') {
        await page.evaluate(() => history.pushState(null, '', '/editor?portfolio=b'));
        await expect(page.getByText('Portfolio B', { exact: true })).toBeVisible();
        await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
      } else {
        await page.evaluate(user => { const channel = new BroadcastChannel('sb-127-auth-token'); channel.postMessage({ event: 'SIGNED_IN', session: { user: { ...user, id: 'account-b' } } }); channel.close(); }, user);
        await expect(page.getByText('บัญชีผู้ใช้เปลี่ยนแล้ว', { exact: false })).toBeVisible();
      }
      if (phase === 'generating') {
        await page.evaluate(() => { const s = (window as unknown as { pdfDelay: { armed: boolean; releases: (() => void)[] } }).pdfDelay; s.armed = false; s.releases.splice(0).forEach(done => done()); });
        // Layout preparation now rejects the detached session before rendering.
        await expect.poll(() => page.evaluate(() => (window as unknown as { pdfDelay: { staleLayouts: number } }).pdfDelay.staleLayouts)).toBe(1);
        expect(await page.evaluate(() => (window as unknown as { pdfSize: { builds: number } }).pdfSize.builds)).toBe(0);
      }
      await expect(page.getByRole('dialog')).toHaveCount(0); expect(downloads).toBe(0);
      expect(await page.evaluate(() => (window as unknown as { pdfSize: { urls: number } }).pdfSize.urls)).toBe(0);
      if (navigation === 'portfolio') {
        const start = page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true }); await expect(start).toBeEnabled();
        await start.click(); await expect(page.getByRole('dialog')).toBeVisible({ timeout: PDF_CONFIRMATION_TIMEOUT });
        const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'ดาวน์โหลดต่อ', exact: true }).click();
        expect((await download).suggestedFilename()).toBe('Portfolio B.pdf');
      }
    });
  }
}

test('real oversized A4 PDF: confirm downloads exactly the offered Blob bytes and hash', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  // No size override, threshold override, padding or renderer stub in this test.
  await page.addInitScript(() => {
    const state = { builds: 0, last: null as Blob | null, same: false };
    (window as unknown as { actualPdf: typeof state }).actualPdf = state;
    const NativeBlob = window.Blob;
    window.Blob = class extends NativeBlob {
      constructor(...args: ConstructorParameters<typeof Blob>) { super(...args); if (this.type === 'application/pdf') { state.builds++; state.last = this; } }
    };
    const create = URL.createObjectURL;
    URL.createObjectURL = blob => { if (blob === state.last) state.same = true; return create(blob); };
  });
  await ready(page);
  const total = 32;
  // Bounded, high-detail test-only Preview fixture, with legible Thai page labels.
  // Existing real 12/20/25-page data fixtures remain in the regression suite.
  await page.evaluate(total => {
    const canvas = document.createElement('canvas'); canvas.width = 794; canvas.height = 1051;
    const context = canvas.getContext('2d')!; const pixels = context.createImageData(canvas.width, canvas.height);
    let seed = 7251;
    for (let index = 0; index < pixels.data.length; index += 4) {
      for (let channel = 0; channel < 3; channel++) { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; pixels.data[index + channel] = seed & 255; }
      pixels.data[index + 3] = 255;
    }
    context.putImageData(pixels, 0, 0); const source = canvas.toDataURL(); canvas.width = canvas.height = 0;
    const main = document.querySelector('main')!;
    const original = main.querySelector<HTMLElement>('[data-portfolio-page]')!;
    const template = original.cloneNode(false) as HTMLElement;
    main.querySelectorAll<HTMLElement>('[data-portfolio-page]').forEach(node => { node.removeAttribute('data-portfolio-page'); node.style.display = 'none'; });
    for (let index = 0; index < total; index++) {
      const paper = template.cloneNode(false) as HTMLElement;
      paper.style.cssText = 'position:relative;box-sizing:border-box;display:block;width:794px;height:1123px;margin:0;padding:0;border:0;transform:none;overflow:hidden;background:white';
      const title = document.createElement('h2'); title.textContent = `ภาพรายละเอียดสูง ทดสอบ PDF หน้า ${index + 1} / ${total}`;
      title.style.cssText = 'height:72px;margin:0;padding:18px;font-size:22px;color:black;background:white';
      const image = document.createElement('img'); image.src = source; image.alt = 'ภาพทดสอบรายละเอียดสูง';
      image.style.cssText = 'display:block;width:794px;height:1051px;object-fit:contain';
      paper.replaceChildren(title, image); main.appendChild(paper);
    }
  }, total);
  await expect(page.getByText(`${total} หน้า`, { exact: true })).toBeVisible();
  let downloads = 0; page.on('download', () => downloads++);
  await page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'ดาวน์โหลดไฟล์ PDF ขนาดใหญ่' });
  await expect(dialog).toBeVisible({ timeout: 150_000 }); expect(downloads).toBe(0);
  const offered = await page.evaluate(async () => {
    const s = (window as unknown as { actualPdf: { builds: number; last: Blob } }).actualPdf;
    const digest = await crypto.subtle.digest('SHA-256', await s.last.arrayBuffer());
    return { bytes: s.last.size, builds: s.builds, sha256: Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('') };
  });
  expect(offered.bytes).toBeGreaterThan(10_000_000); expect(offered.builds).toBe(3);
  await expect(dialog).toContainText(offered.bytes.toLocaleString('en-US'));
  await page.screenshot({ path: testInfo.outputPath('actual-large-confirmation.png') });
  const download = page.waitForEvent('download'); await dialog.getByRole('button', { name: 'ดาวน์โหลดต่อ', exact: true }).click();
  const path = testInfo.outputPath('actual-oversized.pdf'); await (await download).saveAs(path);
  const file = readFileSync(path); expect(file.length).toBe(offered.bytes);
  expect(createHash('sha256').update(file).digest('hex')).toBe(offered.sha256);
  expect(await page.evaluate(() => {
    const s = (window as unknown as { actualPdf: { builds: number; same: boolean } }).actualPdf;
    return [s.builds, s.same];
  })).toEqual([3, true]);
  const info = execFileSync('pdfinfo', [path], { encoding: 'utf8' });
  expect(Number(info.match(/^Pages:\s+(\d+)/m)?.[1])).toBe(total); expect(info).toContain('595.28 x 841.89 pts (A4)');
  await testInfo.attach('actual-large-audit', { body: JSON.stringify({ ...offered, pages: total }), contentType: 'application/json' });
});
