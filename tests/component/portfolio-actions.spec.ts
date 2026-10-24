import { test, expect, type Page } from '@playwright/test';
import type { HarnessAPI } from '../harness/portfolio-actions';

const snapshot = (page: Page) => page.evaluate(() => window.portfolioActions.snapshot());
async function mode(page: Page, value: Parameters<HarnessAPI['mode']>[0]) { await page.evaluate(value => window.portfolioActions.mode(value), value); }
test.beforeEach(async ({ page }) => { await page.goto('/'); await expect(page.getByRole('button', { name: 'เปิดทำสำเนา', exact: true })).toBeVisible(); });

for (const action of ['duplicate', 'delete'] as const) {
  const duplicate = action === 'duplicate';
  const open = (page: Page) => page.getByRole('button', { name: duplicate ? 'เปิดทำสำเนา' : 'เปิดลบ', exact: true }).click();
  const confirm = (page: Page) => page.getByRole('dialog').getByRole('button', { name: duplicate ? 'ทำสำเนา' : 'ลบพอร์ต', exact: true });

  test(`${action}: confirmed callback captures only the source ID and trimmed new name`, async ({ page }) => {
    await open(page);
    await expect(page.getByRole('dialog')).toContainText('พอร์ตภาษาไทย A');
    if (duplicate) {
      await expect(page.getByLabel('ชื่อพอร์ตใหม่')).toHaveValue('พอร์ตภาษาไทย A สำเนา');
      await page.getByLabel('ชื่อพอร์ตใหม่').fill('  สำเนาภาษาไทย English  ');
    }
    await confirm(page).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const state = await snapshot(page);
    expect(state.calls).toEqual([{ kind: action, args: duplicate ? { sourceId: 'portfolio-a', title: 'สำเนาภาษาไทย English' } : 'portfolio-a' }]);
    expect(state.successes).toEqual([{ portfolioId: duplicate ? 'copy-id' : 'portfolio-a' }]);
  });
  test(`${action}: cancel sends no mutation and restores trigger focus`, async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect((await snapshot(page)).calls).toEqual([]);
    await expect(page.getByRole('button', { name: duplicate ? 'เปิดทำสำเนา' : 'เปิดลบ', exact: true })).toBeFocused();
  });
  test(`${action}: confirmed rejection preserves target/draft and allows explicit retry`, async ({ page }) => {
    await mode(page, 'rejected'); await open(page);
    if (duplicate) await page.getByLabel('ชื่อพอร์ตใหม่').fill('ชื่อที่ต้องรักษา');
    await confirm(page).click();
    await expect(page.getByRole('alert')).toContainText('ยืนยัน');
    await expect(page.getByRole('dialog')).toContainText('พอร์ตภาษาไทย A');
    if (duplicate) await expect(page.getByLabel('ชื่อพอร์ตใหม่')).toHaveValue('ชื่อที่ต้องรักษา');
    await mode(page, 'confirmed'); await confirm(page).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect((await snapshot(page)).calls).toHaveLength(2);
    expect((await snapshot(page)).successes).toHaveLength(1);
  });
}

test('duplicate: blank names do not submit; null and blank originals get an editable fallback', async ({ page }) => {
  for (const title of [null, '', '  ']) {
    await page.evaluate(title => window.portfolioActions.target({ id: 'portfolio-a', title }), title);
    await page.getByRole('button', { name: 'เปิดทำสำเนา', exact: true }).click();
    await expect(page.getByLabel('ชื่อพอร์ตใหม่')).toHaveValue('พอร์ต สำเนา');
    await page.getByLabel('ชื่อพอร์ตใหม่').fill('  ');
    await page.getByRole('button', { name: 'ทำสำเนา', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveText('กรุณาตั้งชื่อพอร์ตใหม่');
    await page.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
  }
  expect((await snapshot(page)).calls).toEqual([]);
});
