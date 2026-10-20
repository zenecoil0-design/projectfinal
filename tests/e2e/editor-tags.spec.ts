import { test, expect, type Page } from '@playwright/test';
import { openEditorSection } from './helpers/editor';
import { formSaveError } from '../../src/lib/editor/form-errors';

const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const configs = [
  { section: 'education', plural: 'educations', title: 'school_name' },
  { section: 'activity', plural: 'activities', title: 'title' },
  { section: 'certificate', plural: 'certificates', title: 'title' },
] as const;
type Config = typeof configs[number];
test.beforeEach(async ({ context, request }) => {
  await request.get('http://127.0.0.1:54321/__reset');
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const session = { access_token: `${part({ alg: 'HS256' })}.${part({ sub: user.id, exp: 4102444800 })}.test`, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user };
  await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + part(session), domain: '127.0.0.1', path: '/' }]);
});

async function fixtures(page: Page, config: Config, failure: 'tags' | 'relations' | 'both' | 'empty') {
  const state = { fail: failure !== 'empty', hold: false, release: () => {}, tagReads: 0, relationReads: 0, mainReads: 0 };
  await page.route(`**/rest/v1/user_library_${config.plural}?**`, route => {
    state.mainReads++;
    return route.fulfill({ json: ['a', 'b', 'c'].map(suffix => ({ id: `${config.section}-${suffix}`, [config.title]: `ITEM ${suffix}`, level: 'มัธยมศึกษา', description: 'รายละเอียด', gpa: null })) });
  });
  await page.route('**/rest/v1/user_tags?**', route => {
    state.tagReads++;
    if (state.fail && (failure === 'tags' || failure === 'both')) return route.fulfill({ status: 500, json: { message: 'INTERNAL DATABASE SECRET' } });
    return route.fulfill({ json: failure === 'empty' ? [] : [{ id: 'tag-1', name: 'TAG MATCH' }, { id: 'tag-2', name: 'TAG EMPTY' }] });
  });
  await page.route(`**/rest/v1/user_library_${config.section}_tags?**`, async route => {
    state.relationReads++;
    if (state.hold) await new Promise<void>(resolve => { state.release = resolve; });
    if (state.fail && (failure === 'relations' || failure === 'both')) return route.fulfill({ status: 500, json: { message: 'INTERNAL RELATION SECRET' } });
    return route.fulfill({ json: failure === 'empty' ? [] : [{ [`${config.section}_id`]: `${config.section}-b`, tag_id: 'tag-1' }] });
  });
  return state;
}

for (const config of configs) {
  for (const failure of ['tags', 'relations', 'both'] as const) {
    test(`${config.section}: ${failure} failure is explicit; metadata retry preserves order, dirty baseline and payload`, async ({ page }) => {
      const state = await fixtures(page, config, failure);
      await page.goto('/editor?portfolio=a'); await openEditorSection(page, config.section);
      const form = page.locator('form:visible');
      await expect(form.getByRole('alert')).toContainText('ไม่สำเร็จ');
      await expect(form.getByRole('checkbox')).toHaveCount(3);
      await expect(page.locator('body')).not.toContainText('INTERNAL');
      await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว', { exact: true })).toHaveCount(0);
      await expect(page.locator(`#editor-heading-${config.section}`)).toContainText('Tags โหลดไม่ครบ');
      await expect(form.getByText('Tag นี้', { exact: false })).toHaveCount(0);
      await expect(form.locator('button[type=submit]')).toBeEnabled();
      const boxes = form.getByRole('checkbox');
      await boxes.nth(0).uncheck(); await boxes.nth(2).check(); await boxes.nth(1).check(); await boxes.nth(0).check();
      const assertOrder = async () => {
        for (const [index, order] of [[2, 1], [1, 2], [0, 3]]) {
          await expect(form.locator('label').filter({ has: page.getByRole('checkbox', { name: `ITEM ${'abc'[index]}`, exact: true }) })).toContainText(`ลำดับ ${order}`);
        }
      };
      await assertOrder();
      const pages = await page.locator('[data-portfolio-page]').count();
      const reads = state.mainReads;
      await form.getByRole('button', { name: 'ลองใหม่', exact: true }).click();
      await expect(form.getByRole('alert')).toContainText('ไม่สำเร็จ'); await assertOrder();
      state.fail = false; state.hold = true;
      const before = state.relationReads;
      await form.getByRole('button', { name: 'ลองใหม่', exact: true }).click();
      await expect.poll(() => state.relationReads).toBe(before + 1);
      await expect(form.getByRole('button', { name: 'กำลังลองใหม่…', exact: true })).toBeDisabled();
      // Dispatching repeated clicks still cannot bypass the synchronous in-flight guard.
      await form.getByRole('button', { name: 'กำลังลองใหม่…', exact: true }).evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
      expect(state.relationReads).toBe(before + 1);
      state.release();
      await expect(form.getByRole('button', { name: 'TAG MATCH', exact: true })).toBeEnabled();
      await expect(form.getByRole('alert')).toHaveCount(0); await assertOrder();
      expect(state.mainReads).toBe(reads);
      await expect(page.locator('[data-portfolio-page]')).toHaveCount(pages);
      await expect(page.getByText('ยังไม่บันทึก:', { exact: false })).toBeVisible();
      page.once('dialog', dialog => dialog.dismiss());
      await page.getByRole('link', { name: 'กลับ Dashboard', exact: true }).click(); await expect(page).toHaveURL(/editor/);
      await form.getByRole('button', { name: 'TAG MATCH', exact: true }).click();
      await expect(boxes).toHaveCount(1); await expect(boxes.first()).toHaveAccessibleName('ITEM b');
      await form.getByRole('button', { name: 'ทั้งหมด', exact: true }).click();
      const save = page.waitForRequest(request => request.url().endsWith('/rpc/replace_portfolio_selection') && request.method() === 'POST');
      await form.locator('button[type=submit]').click();
      expect((await save).postDataJSON()).toEqual({ p_portfolio_id: 'a', p_section: config.section, p_item_ids: [`${config.section}-c`, `${config.section}-b`, `${config.section}-a`] });
    });
  }
  test(`${config.section}: successful empty tags are not a load error`, async ({ page }) => {
    await fixtures(page, config, 'empty');
    await page.goto('/editor?portfolio=a'); await openEditorSection(page, config.section);
    const form = page.locator('form:visible');
    await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
    await expect(form.getByRole('alert')).toHaveCount(0);
    await expect(form.getByRole('button', { name: 'ลองใหม่', exact: true })).toHaveCount(0);
    await expect(form.getByRole('checkbox')).toHaveCount(3);
    await expect(form.locator('button[type=submit]')).toBeEnabled();
  });
}

for (const config of configs) {
  test(`${config.section}: error survives Accordion/mobile; retry never saves; incomplete tags cannot damage a manual save`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 1000 });
    const state = await fixtures(page, config, 'relations');
    await page.goto('/editor?portfolio=a'); await openEditorSection(page, config.section);
    const form = page.locator('form:visible');
    await expect(form.getByRole('alert')).toContainText('โหลดความสัมพันธ์ Tags ไม่สำเร็จ');
    await expect(form.getByRole('checkbox').first()).toBeEnabled();
    await expect(page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true })).toBeEnabled();
    await form.getByRole('checkbox').nth(0).uncheck(); await form.getByRole('checkbox').nth(1).check(); await form.getByRole('checkbox').nth(2).check();
    await expect(page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true })).toBeDisabled();
    let writes = 0;
    page.on('request', request => { if (request.url().includes('/rest/v1/') && request.method() !== 'GET') writes++; });
    const reads = [state.mainReads, state.relationReads, state.tagReads];
    await page.locator(`#editor-heading-${config.section}`).click();
    await expect(page.locator('aside [aria-expanded=true]')).toHaveCount(0);
    await openEditorSection(page, config.section);
    expect([state.mainReads, state.relationReads, state.tagReads]).toEqual(reads); expect(writes).toBe(0);
    await expect(form.getByRole('alert')).toContainText('โหลดความสัมพันธ์ Tags ไม่สำเร็จ');
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await form.getByRole('button', { name: 'ลองใหม่', exact: true }).scrollIntoViewIfNeeded();
      expect(await form.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`${config.section}-tag-error-${width}.png`) });
    }
    const count = await page.locator('[data-portfolio-page]').count();
    await page.getByRole('button', { name: 'ดูตัวอย่าง', exact: true }).click();
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('[data-portfolio-page]')).toHaveCount(count);
    await page.getByRole('button', { name: 'กรอกข้อมูล', exact: true }).click();
    await expect(page.locator(`#editor-heading-${config.section}`)).toHaveAttribute('aria-expanded', 'true');
    await expect(form.getByRole('checkbox').nth(1)).toBeChecked(); await expect(form.getByRole('checkbox').nth(2)).toBeChecked();
    const submit = form.locator('button[type=submit]');
    await page.route('**/rest/v1/rpc/replace_portfolio_selection', route => route.fulfill({ status: 500, json: { message: 'SAVE FAIL TEST' } }));
    await submit.click();
    await expect(form.getByRole('alert').filter({ hasText: formSaveError(config.section, null) })).toBeVisible();
    await expect(page.locator('body')).not.toContainText('SAVE FAIL TEST');
    await expect(page.locator(`#editor-heading-${config.section}`)).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByText('ยังไม่บันทึก:', { exact: false })).toBeVisible();
    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('link', { name: 'กลับ Dashboard', exact: true }).click(); await expect(page).toHaveURL(/editor/);
    const writesBeforeRetry = writes;
    state.hold = true;
    const before = state.relationReads;
    await form.getByRole('button', { name: 'ลองใหม่', exact: true }).click();
    await expect.poll(() => state.relationReads).toBe(before + 1);
    await openEditorSection(page, 'cover');
    await page.getByRole('button', { name: 'ดูตัวอย่าง', exact: true }).click();
    state.release();
    await page.getByRole('button', { name: 'กรอกข้อมูล', exact: true }).click();
    await expect(page.locator('#editor-heading-cover')).toHaveAttribute('aria-expanded', 'true');
    await openEditorSection(page, config.section);
    await expect(form.getByRole('alert').filter({ hasText: 'โหลดความสัมพันธ์ Tags ไม่สำเร็จ' })).toBeVisible();
    await expect(form.getByRole('checkbox').nth(1)).toBeChecked(); await expect(form.getByRole('checkbox').nth(2)).toBeChecked();
    expect(writes).toBe(writesBeforeRetry); expect(state.mainReads).toBe(reads[0]);
    await page.unroute('**/rest/v1/rpc/replace_portfolio_selection');
    const save = page.waitForRequest(request => request.url().endsWith('/rpc/replace_portfolio_selection') && request.method() === 'POST');
    await submit.click();
    expect((await save).postDataJSON()).toEqual({ p_portfolio_id: 'a', p_section: config.section, p_item_ids: [`${config.section}-b`, `${config.section}-c`] });
    const next = config.section === 'education' ? 'activity' : 'certificate';
    await expect(page.locator(`#editor-heading-${next}`)).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByText('ยังไม่บันทึก:', { exact: false })).toHaveCount(0);
    await openEditorSection(page, config.section);
    await expect(form.getByRole('alert').filter({ hasText: 'โหลดความสัมพันธ์ Tags ไม่สำเร็จ' })).toBeVisible();
    await expect(form.getByRole('checkbox').nth(0)).not.toBeChecked();
    await expect(form.getByRole('checkbox').nth(1)).toBeChecked(); await expect(form.getByRole('checkbox').nth(2)).toBeChecked();
  });

  for (const navigation of ['portfolio', 'account'] as const) {
    test(`${config.section}: a pending tag retry cannot publish after ${navigation} changes`, async ({ page }) => {
      const state = await fixtures(page, config, 'relations');
      await page.goto('/editor?portfolio=a'); await openEditorSection(page, config.section);
      const form = page.locator('form:visible');
      await expect(form.getByRole('alert')).toContainText('โหลดความสัมพันธ์ Tags ไม่สำเร็จ');
      let release = () => {}; let held = false;
      await page.route(`**/rest/v1/user_library_${config.section}_tags?**`, async route => {
        if (held) return route.fallback();
        held = true;
        await new Promise<void>(resolve => { release = resolve; });
        await route.fulfill({ json: [{ [`${config.section}_id`]: `${config.section}-a`, tag_id: 'tag-1' }] });
      });
      const request = page.waitForRequest(request => request.url().includes(`/user_library_${config.section}_tags?`));
      await form.getByRole('button', { name: 'ลองใหม่', exact: true }).click(); await request;
      if (navigation === 'portfolio') {
        await page.getByRole('link', { name: 'กลับ Dashboard', exact: true }).click(); await expect(page).toHaveURL(/dashboard/);
        state.fail = false;
        await page.locator('a[href="/editor?portfolio=b"]').click();
        await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
        await openEditorSection(page, config.section);
        await form.getByRole('button', { name: 'TAG MATCH', exact: true }).click();
        await expect(form.getByRole('checkbox')).toHaveCount(1);
        await expect(form.getByRole('checkbox').first()).toHaveAccessibleName('ITEM b');
      } else {
        // Simulate the existing Supabase cross-tab auth event, without changing real accounts.
        await page.evaluate(user => {
          const channel = new BroadcastChannel('sb-127-auth-token');
          channel.postMessage({ event: 'SIGNED_IN', session: { user: { ...user, id: 'account-b' } } }); channel.close();
        }, user);
        await expect(page.getByText('บัญชีผู้ใช้เปลี่ยนแล้ว', { exact: false })).toBeVisible();
      }
      const response = page.waitForResponse(response => response.url().includes(`/user_library_${config.section}_tags?`));
      release(); await (await response).finished();
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      if (navigation === 'portfolio') {
        await expect(form.getByRole('checkbox')).toHaveCount(1);
        await expect(form.getByRole('checkbox').first()).toHaveAccessibleName('ITEM b');
        await expect(form.getByRole('checkbox').first()).not.toBeChecked();
        await expect(page.locator(`#editor-heading-${config.section}`)).toHaveAttribute('aria-expanded', 'true');
        await expect(form.getByRole('alert')).toHaveCount(0);
      } else {
        await expect(page.locator('aside form')).toHaveCount(0);
        await expect(page.getByText('บัญชีผู้ใช้เปลี่ยนแล้ว', { exact: false })).toBeVisible();
        await expect(page.getByText('TAG MATCH', { exact: true })).toHaveCount(0);
      }
    });
  }
}
