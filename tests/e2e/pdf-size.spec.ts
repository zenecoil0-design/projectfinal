import { test, expect, type Page } from '@playwright/test';

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
  let downloads = 0; page.on('download', () => downloads++);
  const start = page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true });
  const dialog = page.getByRole('dialog', { name: 'ดาวน์โหลดไฟล์ PDF ขนาดใหญ่' });
  await start.click(); await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('10.000001 MB'); await expect(dialog).toContainText('10,000,001 bytes');
  await expect(dialog.getByRole('button', { name: 'ยกเลิก', exact: true })).toBeFocused();
  expect(downloads).toBe(0);
  await expect(page.getByLabel('ชื่อบนหน้าปก', { exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'กำลังส่งออก…', exact: true })).toBeDisabled();
  await dialog.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
  await expect(dialog).toHaveCount(0); await expect(start).toBeEnabled(); await expect(start).toBeFocused();
  expect(downloads).toBe(0);
  await start.click(); await expect(dialog).toBeVisible(); await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0); await expect(start).toBeFocused(); expect(downloads).toBe(0);
  await start.click(); await expect(dialog).toBeVisible();
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
