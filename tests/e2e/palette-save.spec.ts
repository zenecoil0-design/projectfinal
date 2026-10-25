import { test, expect } from '@playwright/test';

const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
test.beforeEach(async ({ context, request }) => {
  await request.get('http://127.0.0.1:54321/__reset');
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const session = { access_token: `${part({ alg: 'HS256' })}.${part({ sub: user.id, exp: 4102444800 })}.test`, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user };
  await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + part(session), domain: '127.0.0.1', path: '/' }]);
});


test('palette saves only its field, retries failures and survives cleared browser cache', async ({ page }) => {
 await page.goto('/editor?portfolio=a');
 await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
 await page.getByRole('button',{name:'ขั้นตอนสุดท้าย · เลือกสีและดาวน์โหลด'}).click();
 await page.getByLabel('รหัสสี HEX').fill('#A13A50');
 await expect(page.getByRole('button',{name:'ดาวน์โหลด PDF',exact:true})).toBeDisabled();
 let calls=0;
 await page.route('**/rest/v1/portfolios?**',async route=>{
  if(route.request().method()!=='PATCH')return route.continue();
  calls++; expect(Object.keys(route.request().postDataJSON())).toEqual(['theme_color']);
  if(calls===1)return route.fulfill({status:500,json:{message:'RAW_ERROR'}});
  return route.continue();
 });
 await page.getByRole('button',{name:'บันทึกสีพอร์ต',exact:true}).click();
 await expect(page.getByText(/ยืนยันการบันทึกสีไม่สำเร็จ/)).toBeVisible();
 await expect(page.getByText('RAW_ERROR')).toHaveCount(0);
 await page.getByRole('button',{name:'บันทึกสีพอร์ต',exact:true}).evaluate(el=>{if(el instanceof HTMLButtonElement){el.click();el.click();}});
 await expect(page.getByText('บันทึกสีพอร์ตแล้ว',{exact:true})).toBeVisible(); expect(calls).toBe(2);
 await page.evaluate(()=>localStorage.clear()); await page.reload();
 await expect(page.locator('main [data-portfolio-page]').first()).toHaveCSS('--portfolio-primary','#A13A50');
 await page.goto('/editor?portfolio=b');
 await expect(page.locator('main [data-portfolio-page]').first()).toHaveCSS('--portfolio-primary','#1D416D');
});
for(const template of ['classic','modern','minimal'])test(`${template}: saved palette exports actual PDF from hidden mobile Preview`,async({page},info)=>{
 await page.setViewportSize({width:390,height:900});
 await page.goto('/editor?portfolio=a');
 await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
 await page.getByLabel('เทมเพลต',{exact:true}).selectOption(template);
 await page.getByRole('button',{name:'ขั้นตอนสุดท้าย · เลือกสีและดาวน์โหลด'}).click();
 await page.getByLabel('รหัสสี HEX').fill('#A13A50');
 await page.getByRole('button',{name:'บันทึกสีพอร์ต',exact:true}).click();
 await expect(page.getByText('บันทึกสีพอร์ตแล้ว',{exact:true})).toBeVisible();
 await expect(page.locator('main')).toBeHidden();
 const count=await page.locator('[data-portfolio-page]').count();
 const download=page.waitForEvent('download');
 await page.getByRole('button',{name:'ดาวน์โหลด PDF',exact:true}).click();
 await expect(page.getByLabel('รหัสสี HEX')).toBeDisabled();
 const path=info.outputPath(template+'.pdf');await(await download).saveAs(path);
 const {execFileSync}=await import('node:child_process');
 const audit=JSON.parse(execFileSync(process.env.CODEX_PRIMARY_RUNTIME_PYTHON||'python',['tests/pdf-inspect.py',path],{encoding:'utf8'}));
 expect(audit.pages).toBe(count);expect(count).toBeGreaterThanOrEqual(7);
 for(const [w,h] of audit.boxes){expect(w).toBeCloseTo(595.28,1);expect(h).toBeCloseTo(841.89,1);}
 await page.getByRole('button',{name:'ดูตัวอย่าง',exact:true}).click();
 for(const kind of ['education','activity','certificate']){
  const dimensions=(el:Element)=>({w:(el as HTMLElement).offsetWidth,h:(el as HTMLElement).offsetHeight});
  const actual=await page.locator(`main .${kind}-card`).first().evaluate(dimensions);
  const measured=await page.locator(`body > [data-template] .${kind}-card`).first().evaluate(dimensions);
  expect(measured.w).toBe(actual.w);expect(Math.abs(measured.h-actual.h)).toBeLessThanOrEqual(1);
 }
});

test('account change discards late save UI and releases the return-home guard',async({page})=>{
 await page.goto('/editor?portfolio=a');await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
 await page.getByRole('button',{name:'ขั้นตอนสุดท้าย · เลือกสีและดาวน์โหลด'}).click();await page.getByLabel('รหัสสี HEX').fill('#A13A50');
 let release!:()=>void;const barrier=new Promise<void>(resolve=>release=resolve);
 let start!:()=>void;const started=new Promise<void>(resolve=>start=resolve);
 await page.route('**/rest/v1/portfolios?**',async route=>{
  if(route.request().method()!=='PATCH')return route.continue();
  start();await barrier;await route.fulfill({json:{id:'a',user_id:user.id,...route.request().postDataJSON()}});
 });
 await page.getByRole('button',{name:'บันทึกสีพอร์ต',exact:true}).click();await started;
 await page.evaluate(user=>{const c=new BroadcastChannel('sb-127-auth-token');c.postMessage({event:'SIGNED_IN',session:{user:{...user,id:'account-b'}}});c.close();},user);
 await expect(page.getByText('บัญชีผู้ใช้เปลี่ยนแล้ว กรุณากลับหน้าแรกและเปิดพอร์ตอีกครั้ง')).toBeVisible();release();
 await expect(page.getByText('บันทึกสีพอร์ตแล้ว',{exact:true})).toHaveCount(0);
 await page.getByRole('link',{name:'กลับหน้าแรก',exact:true}).click();await expect(page).toHaveURL('http://127.0.0.1:3000/');
});
