import { test, expect, type Page } from '@playwright/test';
import type { HarnessAPI } from '../harness/portfolio-actions';

const snapshot = (page: Page) => page.evaluate(() => window.portfolioActions.snapshot());
async function mode(page: Page, value: Parameters<HarnessAPI['mode']>[0]) { await page.evaluate(value => window.portfolioActions.mode(value), value); }
async function submitInTurn(page: Page, repeats: 1 | 2 = 1) {
  await page.getByRole('dialog').locator('form').evaluate((element, repeats) => {
    if (!(element instanceof HTMLFormElement)) throw Error('Expected a form');
    for (let index = 0; index < repeats; index++) element.requestSubmit();
  }, repeats);
}
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
    await page.getByRole('button', { name: 'ยกเลิก', exact: true }).evaluate(button => {
      if (!(button instanceof HTMLButtonElement)) throw Error('Expected Cancel button');
      button.click(); button.click();
    });
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect((await snapshot(page)).calls).toEqual([]);
    expect((await snapshot(page)).closes).toBe(1);
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

  test(`${action}: synchronous double submit, pending Escape/Cancel and repeat success never create overlapping work`, async ({ page }) => {
    await mode(page, 'pending'); await page.evaluate(() => window.portfolioActions.autoClose(false));
    await open(page);
    if (duplicate) await page.getByLabel('ชื่อพอร์ตใหม่').fill('  ชื่อรอบส่ง  ');
    await submitInTurn(page, 2);
    await expect.poll(async () => (await snapshot(page)).calls.length).toBe(1);
    await expect(confirm(page)).toHaveCount(0); // pending label replaces the original label
    await expect(page.getByRole('button', { name: 'กำลังยืนยัน…', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'ยกเลิก', exact: true })).toBeDisabled();
    if (duplicate) await expect(page.getByLabel('ชื่อพอร์ตใหม่')).toBeDisabled();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'ยกเลิก', exact: true }).evaluate(button => (button as HTMLButtonElement).click());
    await expect(page.getByRole('dialog')).toBeVisible();
    expect((await snapshot(page)).closes).toBe(0);
    expect((await snapshot(page)).calls[0]).toEqual({ kind: action, args: duplicate ? { sourceId: 'portfolio-a', title: 'ชื่อรอบส่ง' } : 'portfolio-a' });
    await page.evaluate(duplicate => window.portfolioActions.resolve(0, { status: 'confirmed', portfolioId: duplicate ? 'copy-held' : 'portfolio-a' }), duplicate);
    await expect(page.getByRole('status')).toContainText('แล้ว');
    await submitInTurn(page, 2);
    expect((await snapshot(page)).calls).toHaveLength(1);
    expect((await snapshot(page)).successes).toHaveLength(1);
  });

  test(`${action}: uncertainty requires verification before explicit retry and never displays raw exceptions`, async ({ page }) => {
    await mode(page, 'undefined'); await open(page);
    if (duplicate) await page.getByLabel('ชื่อพอร์ตใหม่').fill('ชื่อผลไม่แน่นอน');
    await confirm(page).click();
    await expect(page.getByRole('alert')).toContainText('ยังไม่ทราบผล');
    await expect(confirm(page)).toBeDisabled();
    await submitInTurn(page);
    expect((await snapshot(page)).calls).toHaveLength(1);
    expect((await snapshot(page)).successes).toEqual([]);
    await mode(page, 'throw');
    await page.getByRole('button', { name: 'ตรวจสอบผล', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('ยังไม่ทราบผล');
    await expect(page.locator('body')).not.toContainText('INTERNAL_SQL_AUTH_CONSTRAINT');
    await expect(confirm(page)).toBeDisabled();
    await mode(page, 'rejected');
    await page.getByRole('button', { name: 'ตรวจสอบผล', exact: true }).click();
    await expect(confirm(page)).toBeEnabled();
    if (duplicate) await expect(page.getByLabel('ชื่อพอร์ตใหม่')).toHaveValue('ชื่อผลไม่แน่นอน');
    await mode(page, 'confirmed'); await confirm(page).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const state = await snapshot(page);
    expect(state.calls.map(call => call.kind)).toEqual([action, 'verify', 'verify', action]);
    expect(state.calls[1].args).toEqual(state.calls[0].args);
    expect(state.calls[2].args).toEqual(state.calls[0].args);
    expect(state.successes).toHaveLength(1);
  });

  test(`${action}: verifying an uncertain success does not resubmit the mutation`, async ({ page }) => {
    await mode(page, 'uncertain'); await open(page); await confirm(page).click();
    await expect(page.getByRole('alert')).toContainText('ยังไม่ทราบผล');
    await mode(page, 'confirmed');
    await page.getByRole('button', { name: 'ตรวจสอบผล', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect((await snapshot(page)).calls.map(call => call.kind)).toEqual([action, 'verify']);
    expect((await snapshot(page)).successes).toHaveLength(1);
  });

  test(`${action}: rejected promises are uncertain, preserve the draft and never expose internal errors`, async ({ page }) => {
    await mode(page, 'throw'); await open(page);
    if (duplicate) await page.getByLabel('ชื่อพอร์ตใหม่').fill('draft ไม่หาย');
    await confirm(page).click();
    await expect(page.getByRole('alert')).toContainText('ยังไม่ทราบผล');
    await expect(page.locator('body')).not.toContainText('INTERNAL_SQL_AUTH_CONSTRAINT');
    await expect(confirm(page)).toBeDisabled();
    if (duplicate) await expect(page.getByLabel('ชื่อพอร์ตใหม่')).toHaveValue('draft ไม่หาย');
    expect((await snapshot(page)).calls).toHaveLength(1);
    expect((await snapshot(page)).successes).toEqual([]);
  });

  test(`${action}: malformed and mismatched confirmations remain uncertain`, async ({ page }) => {
    const results: unknown[] = [null, {}, { status: 'confirmed' }, { status: 'confirmed', portfolioId: ' ' }, { status: 'confirmed', portfolioId: duplicate ? 'portfolio-a' : 'another-portfolio' }];
    for (const [index, result] of results.entries()) {
      await mode(page, 'pending'); await open(page); await confirm(page).click();
      await page.evaluate(({ index, result }) => window.portfolioActions.resolve(index, result), { index, result });
      await expect(page.getByRole('alert')).toContainText('ยังไม่ทราบผล');
      await expect(confirm(page)).toBeDisabled();
      expect((await snapshot(page)).successes).toEqual([]);
      await page.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
    }
    expect((await snapshot(page)).calls).toHaveLength(results.length);
  });

  for (const change of ['close', 'unmount', 'target', 'owner'] as const) {
    test(`${action}: late result after ${change} cannot affect the next dialog lifetime`, async ({ page }) => {
      await mode(page, 'pending'); await open(page);
      if (duplicate) await page.getByLabel('ชื่อพอร์ตใหม่').fill('draft บัญชีเดิม');
      await confirm(page).click();
      if (change === 'close') {
        await page.evaluate(() => window.portfolioActions.open(false));
        await expect(page.getByRole('dialog')).toHaveCount(0);
        await page.evaluate(() => window.portfolioActions.open(true));
      } else if (change === 'unmount') {
        await page.evaluate(() => window.portfolioActions.mounted(false));
        await expect(page.getByRole('dialog')).toHaveCount(0);
        await page.evaluate(() => window.portfolioActions.mounted(true));
      } else if (change === 'target') await page.evaluate(() => window.portfolioActions.target({ id: 'portfolio-b', title: 'พอร์ต B ใหม่' }));
      else await page.evaluate(() => window.portfolioActions.owner('owner-b'));
      await expect(confirm(page)).toBeEnabled();
      if (duplicate) await expect(page.getByLabel('ชื่อพอร์ตใหม่')).toHaveValue(change === 'target' ? 'พอร์ต B ใหม่ สำเนา' : 'พอร์ตภาษาไทย A สำเนา');
      // The next lifetime is itself pending when the previous success arrives.
      await confirm(page).click();
      await page.evaluate(duplicate => window.portfolioActions.resolve(0, { status: 'confirmed', portfolioId: duplicate ? 'old-copy' : 'portfolio-a' }), duplicate);
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('button', { name: 'กำลังยืนยัน…', exact: true })).toBeDisabled();
      expect((await snapshot(page)).successes).toEqual([]);
      // A failure from the new attempt is shown only in that lifetime, with its own draft.
      await page.evaluate(() => window.portfolioActions.resolve(1, { status: 'rejected' }));
      await expect(page.getByRole('alert')).toContainText('ยืนยัน');
      expect((await snapshot(page)).calls[1].args).toEqual(duplicate
        ? { sourceId: change === 'target' ? 'portfolio-b' : 'portfolio-a', title: change === 'target' ? 'พอร์ต B ใหม่ สำเนา' : 'พอร์ตภาษาไทย A สำเนา' }
        : change === 'target' ? 'portfolio-b' : 'portfolio-a');
      expect((await snapshot(page)).closes).toBe(0);
    });
  }

  test(`${action}: Escape, Enter, Tab and Shift+Tab keep focus contained and restore the trigger`, async ({ page }) => {
    await open(page);
    const cancel = page.getByRole('button', { name: 'ยกเลิก', exact: true });
    if (duplicate) await expect(page.getByLabel('ชื่อพอร์ตใหม่')).toBeFocused();
    else await expect(cancel).toBeFocused();
    await page.keyboard.press('Shift+Tab'); await expect(confirm(page)).toBeFocused();
    await page.keyboard.press('Tab'); await expect(duplicate ? page.getByLabel('ชื่อพอร์ตใหม่') : cancel).toBeFocused();
    await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: duplicate ? 'เปิดทำสำเนา' : 'เปิดลบ', exact: true })).toBeFocused();
    expect((await snapshot(page)).calls).toEqual([]);
    await open(page); await confirm(page).focus(); await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect((await snapshot(page)).successes).toHaveLength(1);
  });

  test(`${action}: long Thai titles, pending/error content and controls fit 1440px and 390px`, async ({ page }, info) => {
    const long = 'ชื่อพอร์ตภาษาไทยยาวสำหรับตรวจสอบการแสดงผล'.repeat(12);
    await page.evaluate(title => window.portfolioActions.target({ id: 'portfolio-a', title }), long);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await mode(page, 'pending'); await open(page);
      if (duplicate) {
        await expect(page.getByLabel('ชื่อพอร์ตใหม่')).toHaveValue(`${long} สำเนา`);
        await expect(page.getByLabel('ชื่อพอร์ตใหม่')).not.toHaveAttribute('maxlength');
      }
      await confirm(page).click();
      await expect(page.getByRole('dialog')).toHaveAttribute('aria-busy', 'true');
      await page.getByRole('dialog').screenshot({ path: info.outputPath(`${action}-${width}-pending.png`) });
      await page.evaluate(index => window.portfolioActions.resolve(index, { status: 'rejected' }), width === 1440 ? 0 : 1);
      await expect(page.getByRole('alert')).toBeVisible();
      expect(await page.getByRole('dialog').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
      for (const control of await page.getByRole('dialog').locator('button, input').all()) {
        const box = await control.boundingBox(); expect(box).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      }
      await page.getByRole('dialog').screenshot({ path: info.outputPath(`${action}-${width}-error.png`) });
      await page.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
    }
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
