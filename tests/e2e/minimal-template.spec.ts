import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { openEditorSection } from './helpers/editor';

const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
test.beforeEach(async ({ context, request }) => {
  await request.get('http://127.0.0.1:54321/__reset');
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const session = { access_token: `${part({ alg: 'HS256' })}.${part({ sub: user.id, exp: 4102444800 })}.test`, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user };
  await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + part(session), domain: '127.0.0.1', path: '/' }]);
});

for (const mobile of [false, true]) {
  test(`Minimal actual PDF matches ${mobile ? 'many-page hidden mobile' : 'six-section desktop'} Preview with long Thai and mixed images`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: mobile ? 390 : 1440, height: mobile ? 1000 : 1600 });
    const images = await page.evaluate(() => [[200, 320], [400, 200], [240, 240], [320, 180]].map(([width, height], index) => {
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = ['#ccdadd', '#e9dfcc', '#d5d8e9', '#dbdfcd'][index]; ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = '#202a2d'; ctx.lineWidth = 6; ctx.strokeRect(4, 4, width - 8, height - 8);
      ctx.font = 'bold 22px sans-serif'; ctx.fillStyle = '#202a2d'; ctx.fillText(`IMAGE ${index + 1}`, 15, 50);
      return canvas.toDataURL();
    }));
    await page.route('**/rest/v1/covers?**', route => route.fulfill({ json: [{ id: 'c', portfolio_id: 'a', title: 'PORTFOLIO / แฟ้มสะสมผลงาน', first_name: 'ปกทดสอบชื่อภาษาไทยยาว', last_name: 'นามสกุลสำหรับตรวจการจัดวาง', school_name: 'โรงเรียนตัวอย่างเพื่อทดสอบการจัดลำดับข้อมูลบนหน้าปก', cover_image_url: images[0] }] }));
    await page.route('**/rest/v1/prefaces?**', route => route.fulfill({ json: [{ id: 'p', portfolio_id: 'a', content: 'ย่อหน้าแรกสำหรับทดสอบภาษาไทยและความตั้งใจในการเรียนรู้\n\nย่อหน้าที่สองคงการขึ้นบรรทัดเดิม\nข้อความที่มีรายละเอียดอ่านง่ายและไม่ถูกตัดทิ้ง', signature_name: 'ผู้เขียนคำนำคนละชื่อกับหน้าปก' }] }));
    await page.route('**/rest/v1/profiles?**', route => route.fulfill({ json: [{ id: 'p', portfolio_id: 'a', first_name: 'ชื่อประวัติแยกจากหน้าปก', last_name: 'นามสกุลประวัติ', profile_image_url: images[1], address: 'บ้านเลขที่ 123 หมู่บ้านการเรียนรู้ ถนนวิทยาการ แขวงทดสอบ เขตทดสอบ กรุงเทพมหานคร '.repeat(2), talents: 'การสื่อสาร การเขียนโปรแกรม และการเรียนรู้ร่วมกับผู้อื่น', social_links: [{ id: 's', platform: 'website', link: 'https://example.invalid/' + 'long-address-'.repeat(7) }], custom_fields: [{ id: 'x', title: 'หัวข้อเพิ่มเติมที่มีข้อความยาว', value: 'รายละเอียดที่ผู้ใช้กำหนดเองต้องแสดงครบและตัดบรรทัดได้' }], gpax: 3.75 }] }));
    await page.route('**/rest/v1/user_library_educations?**', route => route.fulfill({ json: [
      { id: 'edu-a', level: 'ประถมศึกษา', school_name: 'โรงเรียนประถมศึกษาชื่อยาวสำหรับตรวจข้อมูลในเทมเพลต', logo_url: '', study_plan: '', gpa: null, start_year: '', end_year: '' },
      { id: 'edu-b', level: 'มัธยมศึกษา', school_name: 'โรงเรียนมัธยมศึกษาที่มีชื่อภาษาไทยยาวและรายละเอียดแผนการเรียน', logo_url: images[2], study_plan: 'วิทยาศาสตร์และคณิตศาสตร์', gpa: 3.5, start_year: '2566', end_year: '2569' },
    ] }));
    await page.route('**/rest/v1/portfolio_educations?**', route => route.fulfill({ json: [{ education_id: 'edu-b', sort_order: 0 }, { education_id: 'edu-a', sort_order: 1 }] }));
    const count = mobile ? 12 : 1;
    await page.route('**/rest/v1/user_library_activities?**', route => route.fulfill({ json: Array.from({ length: count }, (_, index) => ({ id: `act-${index}`, title: `ORDER ${String(index).padStart(2, '0')} ผลงานภาษาไทยที่มีชื่อยาวสำหรับตรวจการตัดบรรทัด`, description: mobile ? 'รายละเอียดภาษาไทยสำหรับตรวจลำดับหน้าและพื้นที่แสดงผลงาน\n'.repeat(14) : 'รายละเอียดผลงานที่มีภาพหลายแนว\nข้อมูลต้องแสดงครบตามเดิม', organization: 'โรงเรียนตัวอย่าง', activity_date: '2026-10-17' })) }));
    await page.route('**/rest/v1/portfolio_activities?**', route => route.fulfill({ json: Array.from({ length: count }, (_, index) => ({ activity_id: `act-${index}`, sort_order: index })) }));
    await page.route('**/rest/v1/user_library_activity_images?**', route => route.fulfill({ json: Array.from({ length: count }, (_, index) => (mobile ? [images[index % 4]] : images).map((image_url, imageIndex) => ({ id: `img-${index}-${imageIndex}`, activity_id: `act-${index}`, image_url, sort_order: imageIndex }))).flat() }));
    await page.route('**/rest/v1/user_library_certificate_images?**', route => route.fulfill({ json: images.map((image_url, index) => ({ id: `cert-img-${index}`, certificate_id: 'certificate-a', image_url, sort_order: index })) }));
    await page.goto('/editor?portfolio=a');
    await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
    await page.getByLabel('เทมเพลต', { exact: true }).selectOption('minimal');
    await expect(page.locator('.minimal-cover')).toBeAttached();
    const pages = page.locator('[data-portfolio-page]');
    if (mobile) await expect.poll(() => pages.count()).toBeGreaterThan(10);
    else await expect(pages).toHaveCount(7);
    await page.locator('#editor-heading-cover').click();
    await expect(page.locator('aside [aria-expanded=true]')).toHaveCount(0);
    if (mobile) await expect(page.locator('main')).toBeHidden();
    const total = await pages.count();
    const sections = await pages.evaluateAll(nodes => nodes.map(el => el.getAttribute('data-section')));
    expect(sections.slice(0, 5)).toEqual(['หน้าปก', 'คำนำ', 'สารบัญ', 'ประวัติส่วนตัว', 'ประวัติการศึกษา']);
    expect(sections.at(-1)).toBe('เกียรติบัตร');
    await expect(page.locator('main .activity-card h3')).toHaveText(Array.from({ length: count }, (_, index) => `ORDER ${String(index).padStart(2, '0')} ผลงานภาษาไทยที่มีชื่อยาวสำหรับตรวจการตัดบรรทัด`));
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true }).click();
    const pdfPath = testInfo.outputPath(`minimal-${mobile ? 'many' : 'six'}.pdf`);
    await (await download).saveAs(pdfPath);
    const audit = JSON.parse(execFileSync(process.env.CODEX_PRIMARY_RUNTIME_PYTHON || 'python', ['tests/pdf-inspect.py', pdfPath], { encoding: 'utf8' }));
    expect(audit.pages).toBe(total);
    expect(audit.uniqueRasters).toBe(total);
    for (const [width, height] of audit.boxes) { expect(width).toBeCloseTo(595.28, 1); expect(height).toBeCloseTo(841.89, 1); }
    await testInfo.attach('minimal-pdf-audit', { body: JSON.stringify({ ...audit, sections }), contentType: 'application/json' });
    if (mobile) await page.getByRole('button', { name: 'ดูตัวอย่าง', exact: true }).click();
    const geometry = await page.locator('main .document-card').evaluateAll(cards => cards.map(card => {
      const source = Array.from(document.querySelectorAll('body > [data-template=minimal] .document-card')).find(el => el.textContent === card.textContent)! as HTMLElement;
      const actual = card as HTMLElement;
      return [source.offsetWidth, actual.offsetWidth, source.offsetHeight, actual.offsetHeight];
    }));
    for (const [measuredWidth, width, measuredHeight, height] of geometry) { expect(measuredWidth).toBe(width); expect(Math.abs(measuredHeight - height)).toBeLessThanOrEqual(1); }
    await expect(page.locator('.minimal-cover img')).toHaveAttribute('src', images[0]);
    await expect(page.locator('[data-section="ประวัติส่วนตัว"] img')).toHaveAttribute('src', images[1]);
    await expect(page.locator('[data-section="ประวัติส่วนตัว"]')).toContainText('การสื่อสาร การเขียนโปรแกรม และการเรียนรู้ร่วมกับผู้อื่น');
    await expect(page.locator('main .education-card h3')).toHaveText(['โรงเรียนมัธยมศึกษาที่มีชื่อภาษาไทยยาวและรายละเอียดแผนการเรียน', 'โรงเรียนประถมศึกษาชื่อยาวสำหรับตรวจข้อมูลในเทมเพลต']);
    expect(await page.locator('.profile-social-row .capitalize').evaluate(el => getComputedStyle(el).flexShrink)).toBe('0');
    for (const img of await page.locator('main .document-images img').all()) expect(await img.evaluate(el => getComputedStyle(el).objectFit)).toBe('contain');
    for (const section of ['หน้าปก', 'คำนำ', 'ประวัติส่วนตัว', 'ประวัติการศึกษา', 'ผลงานและกิจกรรม', 'เกียรติบัตร']) {
      await page.locator(`.paper-frame:has([data-section="${section}"])`).first().screenshot({ path: testInfo.outputPath(`${mobile ? 'mobile' : 'desktop'}-${section}.png`) });
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (mobile) {
      await page.getByRole('button', { name: 'กรอกข้อมูล', exact: true }).click();
      await expect(page.locator('aside [aria-expanded=true]')).toHaveCount(0);
    }
  });
}

test('Minimal without photos stays compact; genuine long preface overflow is still blocked on hidden mobile Preview', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/rest/v1/covers?**', route => route.fulfill({ json: [{ id: 'c', portfolio_id: 'a', title: 'หัวเรื่องของฉัน', first_name: 'ชื่อจริง', last_name: 'ไม่มีรูป', school_name: '' }] }));
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await page.getByLabel('เทมเพลต', { exact: true }).selectOption('minimal');
  await expect(page.locator('.minimal-cover')).toBeAttached();
  await expect(page.locator('.minimal-cover img')).toHaveCount(0);
  await page.getByRole('button', { name: 'ดูตัวอย่าง', exact: true }).click();
  await expect(page.locator('main .document-no-image')).toHaveCount(2);
  for (const placeholder of await page.locator('main .document-no-image').all()) await expect(placeholder).toBeHidden();
  await page.getByRole('button', { name: 'กรอกข้อมูล', exact: true }).click();
  await page.route('**/rest/v1/prefaces?**', route => route.fulfill({ json: [{ id: 'p', portfolio_id: 'a', content: 'ข้อความยาวมาก '.repeat(3000), signature_name: 'A' }] }));
  await page.reload();
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  let downloads = 0; page.on('download', () => downloads++);
  await page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true }).click();
  await expect(page.getByText('เนื้อหาล้นหน้า', { exact: false })).toBeVisible();
  expect(downloads).toBe(0);
});

test('Editor template selector is readable and touch-sized on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  const picker = page.getByLabel('เทมเพลต', { exact: true });
  await expect(picker).toBeVisible();
  await expect(picker).toHaveCSS('font-size', '16px');
  const rect = await picker.boundingBox();
  expect(rect).not.toBeNull();
  expect(rect!.height).toBeGreaterThanOrEqual(44);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(picker).toHaveCSS('font-size', '14px');
});

test('Minimal has six distinct section styles; switching preserves drafts, selection and dirty baseline', async ({ page }) => {
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await page.locator('form:visible input').first().fill('ร่างหัวเรื่องที่ยังไม่บันทึก');
  await openEditorSection(page, 'activity');
  const checkbox = page.locator('form:visible input[type=checkbox]').first();
  await checkbox.uncheck();
  const picker = page.getByLabel('เทมเพลต', { exact: true });
  for (const key of ['minimal', 'modern', 'classic', 'minimal']) {
    await picker.selectOption(key);
    await expect(page.locator(`[data-portfolio-page][data-template="${key}"]`)).toHaveCount(7);
    await expect(checkbox).not.toBeChecked();
    await expect(page.getByText('ยังไม่บันทึก:', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true })).toBeDisabled();
  }
  const cover = page.locator('.minimal-cover');
  await expect(cover.locator('h1')).toHaveText('ร่างหัวเรื่องที่ยังไม่บันทึก');
  await expect(cover.locator('h2')).toHaveText('Alpha Student');
  await expect(cover.locator('img')).toHaveAttribute('alt', 'รูปหน้าปก');
  await expect(page.locator('[data-template=minimal] .document-card')).toHaveCount(4); // education/certificate + their measurement copies
  expect(await cover.evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(255, 255, 255)');
  await openEditorSection(page, 'cover');
  await expect(page.locator('form:visible input').first()).toHaveValue('ร่างหัวเรื่องที่ยังไม่บันทึก');
});

test('Minimal persists on reload, failed changes preserve saved design, portfolio switch resets it and unknown keys keep fallback', async ({ page }) => {
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  const picker = page.getByLabel('เทมเพลต', { exact: true });
  await picker.selectOption('minimal');
  await expect(page.locator('.minimal-cover')).toBeVisible();
  await page.reload();
  await expect(picker).toHaveValue('minimal');
  await expect(page.locator('[data-portfolio-page][data-template=minimal]')).toHaveCount(7);
  await page.route('**/rest/v1/portfolios?**', route => route.request().method() === 'PATCH' ? route.fulfill({ status: 500, json: { message: 'template save failed' } }) : route.continue());
  await picker.selectOption('modern');
  await expect(page.getByText('template save failed')).toBeVisible();
  await expect(picker).toHaveValue('minimal');
  await expect(page.locator('.minimal-cover')).toBeVisible();
  await page.goto('/editor?portfolio=b');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await expect(picker).toHaveValue('classic');
  await expect(page.locator('.minimal-cover')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText('Alpha Student');
  await page.unroute('**/rest/v1/portfolios?**');
  await page.route('**/rest/v1/portfolios?**', route => route.fulfill({ json: { id: 'b', title: 'Legacy portfolio', template_key: 'legacy-key', user_id: user.id } }));
  await page.reload();
  await expect(picker).toHaveValue('legacy-key');
  await expect(page.locator('[data-portfolio-page][data-template=legacy-key]')).toHaveCount(7);
  await expect(page.locator('.minimal-cover, .editorial-cover')).toHaveCount(0);
});
