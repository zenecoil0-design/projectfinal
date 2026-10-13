import { test, expect } from '@playwright/test';

const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
test.beforeEach(async ({ context, request }) => {
  await request.get('http://127.0.0.1:54321/__reset');
  const jwtPart = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const session = { access_token: `${jwtPart({alg:'HS256'})}.${jwtPart({sub:user.id,exp:4102444800})}.test`, refresh_token:'test-refresh',token_type:'bearer',expires_at:4102444800,expires_in:3600,user };
  await context.addCookies([{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify(session)).toString('base64url'),domain:'127.0.0.1',path:'/'}]);
});

test('all sections load without opening their forms; drafts survive step switches; PDF downloads', async ({ page }) => {
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await expect(page.locator('main')).toContainText('Saved Activity');
  await expect(page.locator('main')).toContainText('Saved Certificate');
  await expect(page.locator('main')).toContainText('Saved School');
  await expect(page.locator('main')).toContainText('Alpha Student');
  const title = page.locator('input').filter({visible:true}).first();
  await title.fill('DRAFT TITLE');
  // Click the second step, then return to cover.
  await page.locator('aside button').filter({hasText:'คำนำ'}).first().click();
  await page.locator('aside button').filter({hasText:'ปก'}).first().click();
  await expect(title).toHaveValue('DRAFT TITLE');
  await expect(page.getByText('ยังไม่บันทึก:',{exact:false})).toBeVisible();
  await expect(page.getByRole('button',{name:'ดาวน์โหลด PDF'})).toBeDisabled();
  await page.locator('form:visible button[type="submit"]').click();
  await expect(page.getByRole('button',{name:'ดาวน์โหลด PDF'})).toBeEnabled();
  const download = page.waitForEvent('download');
  await page.getByRole('button',{name:'ดาวน์โหลด PDF'}).click();
  const file = await download;
  await file.saveAs('/tmp/portfolio-e2e.pdf');
  expect(file.suggestedFilename()).toBe('Portfolio A.pdf');
  await page.screenshot({path:'/tmp/portfolio-editor.png',fullPage:true});
});

test('switching portfolio clears every section and failed loads cannot be saved', async ({ page }) => {
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await page.goto('/editor?portfolio=b');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await expect(page.locator('main')).not.toContainText('Saved Activity');
  await expect(page.locator('main')).not.toContainText('Alpha Student');
  await page.route('**/rest/v1/profiles?**',route=>route.fulfill({status:500,json:{message:'simulated load failure'}}));
  await page.reload();
  await expect(page.getByText('โหลดไม่สำเร็จ:',{exact:false})).toBeVisible();
  await expect(page.getByRole('button',{name:'ดาวน์โหลด PDF'})).toBeDisabled();
  await page.locator('aside button').filter({hasText:'ข้อมูลส่วนตัว'}).first().click();
  await expect(page.locator('form:visible button[type="submit"]')).toBeDisabled();
});

test('failed atomic save retains selection and warns before leaving', async ({page}) => {
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await page.locator('aside button').filter({hasText:'กิจกรรม'}).first().click();
  await page.getByText('Saved Activity',{exact:true}).first().click();
  await page.route('**/rest/v1/rpc/replace_portfolio_selection',route=>route.fulfill({status:500,json:{message:'simulated save failure'}}));
  await page.locator('form:visible button[type="submit"]').click();
  await expect(page.getByText('simulated save failure')).toBeVisible();
  page.once('dialog',dialog=>dialog.dismiss());
  await page.getByRole('link',{name:'กลับ Dashboard'}).click();
  await expect(page).toHaveURL(/editor/);
});

test('cropped image remains selected after changing steps on a phone viewport', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  const data = await page.evaluate(() => { const c=document.createElement('canvas'); c.width=400;c.height=200; const ctx=c.getContext('2d')!; ctx.fillStyle='#2563eb';ctx.fillRect(0,0,200,200);ctx.fillStyle='#f59e0b';ctx.fillRect(200,0,200,200);return c.toDataURL('image/png').split(',')[1]; });
  await page.locator('form:visible input[type="file"]').setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from(data,'base64')});
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('สัดส่วนรูป').selectOption('1');
  await page.getByRole('button',{name:'ตัดรูปและใช้รูปนี้'}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('form:visible img')).toHaveAttribute('src',/^blob:/);
  await page.locator('aside button').filter({hasText:'คำนำ'}).first().click();
  await page.locator('aside button').filter({hasText:'ปก'}).first().click();
  await expect(page.locator('form:visible img')).toHaveAttribute('src',/^blob:/);
  await page.screenshot({path:'/tmp/portfolio-mobile.png',fullPage:true});
  await page.getByRole('button',{name:'ดูตัวอย่าง',exact:true}).click();
  await expect(page.locator('main')).toBeVisible();
  await page.getByRole('button',{name:'กรอกข้อมูล',exact:true}).click();
  await expect(page.locator('form:visible img')).toHaveAttribute('src',/^blob:/);
});

test('PDF blocks overflowing text and portfolios over ten pages', async ({page}) => {
  await page.route('**/rest/v1/prefaces?**',route=>route.fulfill({json:[{id:'p',portfolio_id:'a',content:'ข้อความยาว '.repeat(3000),signature_name:'A'}]}));
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await page.getByRole('button',{name:'ดาวน์โหลด PDF'}).click();
  await expect(page.getByText('เนื้อหาล้นหน้า',{exact:false})).toBeVisible();
  await page.unroute('**/rest/v1/prefaces?**');
  await page.route('**/rest/v1/user_library_activities?**',route=>route.fulfill({json:Array.from({length:20},(_,i)=>({id:`a-${i}`,title:`Activity ${i}`,description:'Description '.repeat(90),activity_date:'2026-01-01',organization:'School'}))}));
  await page.route('**/rest/v1/portfolio_activities?**',route=>route.fulfill({json:Array.from({length:20},(_,i)=>({activity_id:`a-${i}`,sort_order:i}))}));
  await page.reload();
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await expect.poll(() => page.locator('[data-portfolio-page]').count()).toBeGreaterThan(10);
  await expect(page.getByRole('button',{name:'ดาวน์โหลด PDF'})).toBeDisabled();
  expect(await page.locator('[data-portfolio-page]').count()).toBeGreaterThan(10);
});

test('a late response from the previous portfolio cannot overwrite the current one', async ({page}) => {
  let finishOld: () => void = () => {};
  const oldFinished = new Promise<void>(resolve => { finishOld = resolve; });
  await page.route('**/rest/v1/profiles?**',async route => {
    if (!route.request().url().includes('portfolio_id=eq.a')) return route.continue();
    await new Promise(resolve => setTimeout(resolve, 800));
    try { await route.fulfill({json:[{id:'old-profile',portfolio_id:'a',first_name:'STALE RESPONSE',social_links:[],custom_fields:[]}]}); } finally { finishOld(); }
  });
  const oldRequest = page.waitForRequest(request => request.url().includes('/profiles?') && request.url().includes('portfolio_id=eq.a'));
  await page.goto('/editor?portfolio=a');
  await oldRequest;
  await page.evaluate(() => history.pushState(null,'','/editor?portfolio=b'));
  await expect(page.getByText('Portfolio B',{exact:true})).toBeVisible();
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await oldFinished;
  await expect(page.locator('main')).not.toContainText('STALE RESPONSE');
  await expect(page.locator('main')).not.toContainText('Saved Activity');
});
