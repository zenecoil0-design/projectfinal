import { test, expect, type Page } from '@playwright/test';
import { expectCurrentContents } from './helpers/toc';
import { openEditorSection } from './helpers/editor';
import { execFileSync } from 'node:child_process';

const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
test.beforeEach(async ({ context, request }) => {
  await request.get('http://127.0.0.1:54321/__reset');
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const session = { access_token: `${part({ alg: 'HS256' })}.${part({ sub: user.id, exp: 4102444800 })}.test`, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user };
  await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + part(session), domain: '127.0.0.1', path: '/' }]);
});

const cards = (page: Page, section: string) => page.locator(`main .${section}-card`);
async function ready(page: Page) {
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
}

test('title-only and whitespace-only secondary data omit rows and image placeholders in every template without removing items', async ({ page, request }) => {
  await request.patch('http://127.0.0.1:54321/rest/v1/user_library_educations?id=eq.education-a', { data: { level: '  ', study_plan: '\t', gpa: null, start_year: '', end_year: ' ', logo_url: '' } });
  await request.patch('http://127.0.0.1:54321/rest/v1/user_library_activities?id=eq.activity-a', { data: { description: ' \n ', organization: '\t', activity_date: ' ' } });
  await request.patch('http://127.0.0.1:54321/rest/v1/user_library_certificates?id=eq.certificate-a', { data: { description: ' ', issued_by: '\n', issued_date: ' ' } });
  await ready(page);
  for (const template of ['classic', 'modern', 'minimal']) {
    await page.getByLabel('เทมเพลต', { exact: true }).selectOption(template);
    for (const [section, name] of [['education', 'Saved School'], ['activity', 'Saved Activity'], ['certificate', 'Saved Certificate']]) {
      await expect(cards(page, section)).toHaveCount(1);
      await expect(cards(page, section).locator('h3')).toHaveText(name);
      await expect(cards(page, section).locator('p, img, .education-logo, .document-images, .document-no-image')).toHaveCount(0);
      await expect(cards(page, section).locator('.document-card-heading > span')).toHaveCount(0);
    }
    await expect(page.locator('main [data-portfolio-page]')).toHaveCount(7);
    await expectCurrentContents(page);
    await expect(page.locator('main [data-page-number]')).toHaveText(['1', '2', '3', '4']);
  }
  await expect(page.getByText('ยังไม่บันทึก:', { exact: false })).toHaveCount(0);
  await openEditorSection(page, 'colors');
  await expect(page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true })).toBeEnabled();
});

test('education years show only actual endpoints, and zero remains data', async ({ page, request }) => {
  const years = [['2563', '2566'], ['2563', ' '], [' ', '2566'], [' ', '\t']];
  const rows = years.map(([start_year, end_year], index) => ({ id: `edu-${index}`, user_id: user.id, school_name: `โรงเรียน ${index}`, level: '0', study_plan: '0', gpa: 0, start_year, end_year, logo_url: '' }));
  await request.post('http://127.0.0.1:54321/rest/v1/user_library_educations', { data: rows });
  await request.delete('http://127.0.0.1:54321/rest/v1/portfolio_educations?portfolio_id=eq.a');
  await request.post('http://127.0.0.1:54321/rest/v1/portfolio_educations', { data: rows.map((row, index) => ({ portfolio_id: 'a', education_id: row.id, sort_order: index })) });
  await ready(page);
  for (const template of ['classic', 'modern', 'minimal']) {
    await page.getByLabel('เทมเพลต', { exact: true }).selectOption(template);
    await expect(cards(page, 'education').locator('h3')).toHaveText(rows.map(row => row.school_name));
    for (const card of await cards(page, 'education').all()) {
      await expect(card).toContainText(template === 'minimal' ? 'ระดับการศึกษา0' : 'ระดับการศึกษา: 0');
      await expect(card).toContainText(template === 'minimal' ? 'สาขา0' : 'สาขา: 0');
      await expect(card).toContainText(template === 'minimal' ? 'GPAX0' : 'GPAX: 0');
      await expect(card).not.toContainText(/ปัจจุบัน|\?/);
    }
    await expect(cards(page, 'education').nth(0)).toContainText(template === 'minimal' ? '2563 – 2566' : 'ช่วงปีการศึกษา: 2563 - 2566');
    await expect(cards(page, 'education').nth(1)).toContainText(template === 'minimal' ? '2563' : 'ปีเริ่มต้น: 2563');
    await expect(cards(page, 'education').nth(1)).not.toContainText('2566');
    await expect(cards(page, 'education').nth(2)).toContainText(template === 'minimal' ? '2566' : 'ปีสิ้นสุด: 2566');
    await expect(cards(page, 'education').nth(2)).not.toContainText('2563');
    await expect(cards(page, 'education').nth(3).locator('p')).toHaveCount(3);
    await expectCurrentContents(page);
  }
});

test('zero and nonblank secondary text remain visible without normalizing stored whitespace', async ({ page, request }) => {
  await request.patch('http://127.0.0.1:54321/rest/v1/user_library_activities?id=eq.activity-a', { data: { description: '  0  ', organization: '0', activity_date: '0' } });
  await request.patch('http://127.0.0.1:54321/rest/v1/user_library_certificates?id=eq.certificate-a', { data: { description: '  0  ', issued_by: '0', issued_date: '0' } });
  await ready(page);
  for (const section of ['activity', 'certificate']) {
    await expect(cards(page, section).locator(':scope > p')).toHaveText('0');
    expect(await cards(page, section).locator(':scope > p').textContent()).toBe('  0  ');
    await expect(cards(page, section).locator('.document-card-heading p')).toHaveText('0');
    await expect(cards(page, section).locator('.document-card-heading > span')).toHaveText('0');
  }
  await expect(page.getByText('ยังไม่บันทึก:', { exact: false })).toHaveCount(0);
});

async function mixedFixture(page: Page) {
  const images = await page.evaluate(() => [[80, 160], [200, 100], [120, 120], [160, 80]].map(([width, height], index) => {
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d')!;
    context.fillStyle = ['#cce5ff', '#ffe0a3', '#d0eccd', '#e0d4ee'][index]; context.fillRect(0, 0, width, height);
    context.strokeStyle = '#173742'; context.lineWidth = 4; context.strokeRect(2, 2, width - 4, height - 4);
    context.fillStyle = '#173742'; context.font = '16px sans-serif'; context.fillText(`IMG ${index + 1}`, 8, 30);
    return canvas.toDataURL();
  }));
  const educations = [
    { id: 'edu-plain', school_name: 'โรงเรียนไม่มีโลโก้', logo_url: '', level: '', study_plan: '', gpa: null, start_year: '', end_year: '' },
    { id: 'edu-logo', school_name: 'โรงเรียนมีโลโก้', logo_url: images[0], level: 'มัธยมศึกษา', study_plan: '', gpa: 0, start_year: '2566', end_year: '' },
  ];
  await page.request.post('http://127.0.0.1:54321/rest/v1/user_library_educations', { data: educations.map(row => ({ ...row, user_id: user.id })) });
  await page.request.delete('http://127.0.0.1:54321/rest/v1/portfolio_educations?portfolio_id=eq.a');
  await page.request.post('http://127.0.0.1:54321/rest/v1/portfolio_educations', { data: educations.map((row, index) => ({ portfolio_id: 'a', education_id: row.id, sort_order: index })) });
  for (const [section, plural, counts] of [['activity', 'activities', [0, 1, 4]], ['certificate', 'certificates', [0, 1, 2, 3]]] as const) {
    const rows = counts.map(count => ({ id: `${section}-${count}`, user_id: user.id, title: `${section === 'activity' ? 'กิจกรรม' : 'เกียรติบัตร'} ${count} รูป`, description: count === 0 ? '  ' : `รายละเอียด ${count} รูป`, organization: '', issued_by: '', activity_date: '', issued_date: '' }));
    await page.request.post(`http://127.0.0.1:54321/rest/v1/user_library_${plural}`, { data: rows });
    await page.request.delete(`http://127.0.0.1:54321/rest/v1/portfolio_${plural}?portfolio_id=eq.a`);
    await page.request.post(`http://127.0.0.1:54321/rest/v1/portfolio_${plural}`, { data: rows.map((row, index) => ({ portfolio_id: 'a', [`${section}_id`]: row.id, sort_order: index })) });
    // Deliberately reverse delivery order; persisted sort_order remains the source of image order.
    await page.request.post(`http://127.0.0.1:54321/rest/v1/user_library_${section}_images`, { data: counts.flatMap(count => images.slice(0, count).map((image_url, index) => ({ id: `${section}-${count}-${index}`, [`${section}_id`]: `${section}-${count}`, image_url, sort_order: index })).reverse()) });
  }
  return images;
}

async function expectMixedCards(page: Page, images: string[]) {
  await expect(cards(page, 'education').locator('h3')).toHaveText(['โรงเรียนไม่มีโลโก้', 'โรงเรียนมีโลโก้']);
  await expect(cards(page, 'education').nth(0).locator('p, .education-logo')).toHaveCount(0);
  await expect(cards(page, 'education').nth(1).locator('img')).toHaveAttribute('src', images[0]);
  for (const [section, counts] of [['activity', [0, 1, 4]], ['certificate', [0, 1, 2, 3]]] as const) {
    await expect(cards(page, section).locator('h3')).toHaveText(counts.map(count => `${section === 'activity' ? 'กิจกรรม' : 'เกียรติบัตร'} ${count} รูป`));
    for (const [index, count] of counts.entries()) {
      const card = cards(page, section).nth(index);
      await expect(card.locator('img')).toHaveCount(count);
      expect(await card.locator('img').evaluateAll(nodes => nodes.map(image => image.getAttribute('src')))).toEqual(images.slice(0, count));
      await expect(card.locator('.document-no-image, .document-card-heading p, .document-card-heading > span')).toHaveCount(0);
      if (count === 0) await expect(card.locator('.document-images, :scope > p')).toHaveCount(0);
    }
  }
  for (const image of await page.locator('main .document-card img').all()) expect(await image.evaluate(element => getComputedStyle(element).objectFit)).toBe('contain');
  await expectCurrentContents(page);
}

test('mixed cards retain every image/order including legacy certificates, match measurement in all templates, and export a real hidden-mobile PDF', async ({ page }, info) => {
  const images = await mixedFixture(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await ready(page);
  for (const template of ['classic', 'modern', 'minimal']) {
    await page.getByLabel('เทมเพลต', { exact: true }).selectOption(template);
    await expectMixedCards(page, images);
    await expect.poll(() => page.locator('main .document-card img').evaluateAll(nodes => nodes.every(node => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0))).toBe(true);
    const geometry = () => page.locator('main .document-card').evaluateAll(cards => cards.map(card => {
      const actual = card as HTMLElement;
      const template = actual.closest('[data-template]')!.getAttribute('data-template');
      const measured = Array.from(document.querySelectorAll<HTMLElement>(`body > [data-template=${template}] .document-card`)).find(node => node.textContent === actual.textContent);
      return { title: actual.querySelector('h3')?.textContent, template, html: measured?.innerHTML === actual.innerHTML, width: [measured?.offsetWidth, actual.offsetWidth], height: [measured?.offsetHeight, actual.offsetHeight] };
    }));
    await expect.poll(async () => (await geometry()).every(card => card.html && card.width[0] === card.width[1] && Math.abs(card.height[0]! - card.height[1]!) <= 1)).toBe(true);
    for (const section of ['education', 'activity', 'certificate']) {
      await page.locator(`.paper-frame:has([data-page-section=${section}])`).nth(0).screenshot({ path: info.outputPath(`${template}-${section}-1440.png`) });
    }
  }
  await page.setViewportSize({ width: 390, height: 1000 });
  await expect(page.locator('main')).toBeHidden();
  const mapping = await page.locator('main [data-portfolio-page]').evaluateAll(nodes => nodes.map(node => ({ section: node.getAttribute('data-page-section'), number: node.querySelector('[data-page-number]')?.textContent ?? null })));
  await openEditorSection(page, 'colors');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true }).click();
  const path = info.outputPath('section-optional.pdf');
  await (await download).saveAs(path);
  const audit = JSON.parse(execFileSync(process.env.CODEX_PRIMARY_RUNTIME_PYTHON || 'python', ['tests/pdf-inspect.py', path], { encoding: 'utf8' }));
  expect(audit.pages).toBe(mapping.length); expect(audit.uniqueRasters).toBe(mapping.length);
  for (const [width, height] of audit.boxes) { expect(width).toBeCloseTo(595.28, 1); expect(height).toBeCloseTo(841.89, 1); }
  await info.attach('section-pdf-audit', { body: JSON.stringify({ ...audit, mapping }), contentType: 'application/json' });
  await page.getByRole('button', { name: 'ดูตัวอย่าง', exact: true }).click();
  await expectMixedCards(page, images);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const section of ['education', 'activity', 'certificate']) {
    await page.locator(`.paper-frame:has([data-page-section=${section}])`).nth(0).screenshot({ path: info.outputPath(`minimal-${section}-390.png`) });
  }
  // Hiding the section removes its actual papers, not its selections or stored preference.
  await page.getByRole('button', { name: 'กรอกข้อมูล', exact: true }).click();
  await openEditorSection(page, 'activity');
  await page.getByRole('switch', { name: 'แสดงผลงานและกิจกรรมบน A4', exact: true }).click();
  await expect(cards(page, 'activity')).toHaveCount(0);
  await expect(page.locator('main [data-toc-section=activity]')).toHaveCount(0);
  await expect(page.locator('#editor-panel-activity input[type=checkbox]:checked')).toHaveCount(3);
  await ready(page);
  await expect(cards(page, 'activity')).toHaveCount(0);
  await openEditorSection(page, 'activity');
  await expect(page.getByRole('switch', { name: 'แสดงผลงานและกิจกรรมบน A4', exact: true })).not.toBeChecked();
});

test('missing-image URLs stay rendered and block export in all three sections rather than becoming empty images', async ({ page, request }) => {
  let downloads = 0; page.on('download', () => downloads++);
  for (const section of ['education', 'activity', 'certificate'] as const) {
    await request.get('http://127.0.0.1:54321/__reset');
    const bad = `http://127.0.0.1:54321/broken-${section}.png`;
    await page.route(bad, route => route.fulfill({ status: 404, contentType: 'text/plain', body: 'not an image' }));
    if (section === 'education') await request.patch('http://127.0.0.1:54321/rest/v1/user_library_educations?id=eq.education-a', { data: { logo_url: bad } });
    else await request.post(`http://127.0.0.1:54321/rest/v1/user_library_${section}_images`, { data: { id: 'bad', [`${section}_id`]: `${section}-a`, image_url: bad, sort_order: 0 } });
    await ready(page);
    await expect(cards(page, section).locator('img')).toHaveAttribute('src', bad);
    await openEditorSection(page, 'colors');
    await page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true }).click();
    await expect(page.getByText('มีรูปภาพโหลดไม่สำเร็จ', { exact: false })).toBeVisible();
    await openEditorSection(page, 'colors');
  await expect(page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true })).toBeEnabled();
    expect(downloads).toBe(0);
  }
});
