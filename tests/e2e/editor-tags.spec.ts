import { test, expect, type Page } from '@playwright/test';
import { openEditorSection } from './helpers/editor';

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
