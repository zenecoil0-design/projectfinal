import { test, expect, type Page } from '@playwright/test';

const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
test.beforeEach(async ({ context, request }) => {
  await request.get('http://127.0.0.1:54321/__reset');
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const session = { access_token: `${part({ alg: 'HS256' })}.${part({ sub: user.id, exp: 4102444800 })}.test`, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user };
  await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + part(session), domain: '127.0.0.1', path: '/' }]);
});
async function openAction(page:Page, action:'duplicate'|'delete') {
 await page.goto('/dashboard');
 const panel=page.locator('article[data-portfolio-id="a"]');
 await panel.getByRole('button',{name:action==='duplicate'?'ทำสำเนาพอร์ต':'ลบพอร์ต',exact:true}).click();
 return page.getByRole('dialog');
}
test('confirmed delete uses one RPC and removes target card, preserving another',async({page})=>{
 let calls=0;
 await page.route('**/rest/v1/rpc/perform_portfolio_action',async route=>{
  calls++;const r=route.request().postDataJSON();
  expect(r.p_action).toBe('delete');expect(r.p_title).toBe('');
  await route.fulfill({json:{request_id:r.p_request_id,action:r.p_action,source_id:r.p_source_id,title:r.p_title,status:'confirmed',portfolio_id:r.p_source_id}});
 });
 const dialog=await openAction(page,'delete');
 await dialog.getByRole('button',{name:'ลบพอร์ต',exact:true}).click();
 await expect(page.locator('article[data-portfolio-id="a"]')).toHaveCount(0);
 await expect(page.locator('article[data-portfolio-id="b"]')).toBeVisible();
 expect(calls).toBe(1);
 expect(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('portfolio-action:')))).toEqual([]);
});
test('uncertain copy survives reload, verification is read-only, explicit replay uses same key and title',async({page})=>{
 const calls:Record<string,string>[]=[];
 await page.route('**/rest/v1/rpc/perform_portfolio_action',async route=>{
  const r=route.request().postDataJSON();calls.push(r);
  if(calls.length===1)return route.fulfill({status:503,json:{message:'PRIVATE_ERROR'}});
  await route.fulfill({json:{request_id:r.p_request_id,action:r.p_action,source_id:r.p_source_id,title:r.p_title,status:'confirmed',portfolio_id:'b'}});
 });
 await page.route('**/rest/v1/portfolio_action_receipts?**',route=>route.fulfill({json:null}));
 const dialog=await openAction(page,'duplicate');
 await dialog.getByLabel('ชื่อพอร์ตใหม่').fill('สำเนาที่ต้องคงเดิม');
 await dialog.getByRole('button',{name:'ทำสำเนา',exact:true}).click();
 await expect(dialog.getByRole('alert')).toBeVisible();
 await expect(page.getByText('PRIVATE_ERROR')).toHaveCount(0);
 await page.reload();
 await page.getByRole('button',{name:'ตรวจสอบผลคำขอค้าง'}).click();
 await expect(page.getByRole('button',{name:'ส่งคำขอเดิมซ้ำ'})).toBeEnabled();
 expect(calls).toHaveLength(1);
 await page.getByRole('button',{name:'ส่งคำขอเดิมซ้ำ'}).click();
 await expect(page).toHaveURL(/editor\?portfolio=b/);
 expect(calls).toHaveLength(2);expect(calls[1]).toEqual(calls[0]);
});
test('cancel never sends mutation and unavailable persistence prevents mutation',async({page})=>{
 let calls=0;await page.route('**/rest/v1/rpc/perform_portfolio_action',route=>{calls++;return route.fulfill({json:null});});
 let dialog=await openAction(page,'delete');await dialog.getByRole('button',{name:'ยกเลิก'}).click();expect(calls).toBe(0);
 await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw new Error('unavailable');};});
 await page.locator('article[data-portfolio-id="a"]').getByRole('button',{name:'ลบพอร์ต',exact:true}).click();
 dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'ลบพอร์ต',exact:true}).click();
 await expect(dialog.getByRole('alert')).toBeVisible();expect(calls).toBe(0);
});
test('account change during pending request cannot navigate or consume old request',async({page})=>{
 let release!:()=>void;const hold=new Promise<void>(r=>{release=r;});let started!:()=>void;const entered=new Promise<void>(r=>{started=r;});
 await page.route('**/rest/v1/rpc/perform_portfolio_action',async route=>{
  const r=route.request().postDataJSON();started();await hold;
  await route.fulfill({json:{request_id:r.p_request_id,action:r.p_action,source_id:r.p_source_id,title:r.p_title,status:'confirmed',portfolio_id:'b'}});
 });
 const dialog=await openAction(page,'duplicate');await dialog.getByRole('button',{name:'ทำสำเนา',exact:true}).click();await entered;
 await page.evaluate(user=>{const c=new BroadcastChannel('sb-127-auth-token');c.postMessage({event:'SIGNED_IN',session:{user:{...user,id:'account-b'}}});c.close();},user);
 await expect(page.getByText('บัญชีผู้ใช้เปลี่ยนแล้ว', {exact:false})).toBeVisible();release();
 await expect(page).toHaveURL(/dashboard$/);
 expect(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('portfolio-action:')).length)).toBe(1);
});
test('mobile recovery controls fit viewport and confirmed receipt avoids another mutation',async({page})=>{
 await page.setViewportSize({width:390,height:900});
 const pending={owner:user.id,requestId:'30000000-0000-0000-0000-000000000001',action:'delete',sourceId:'a',title:''};
 await page.goto('/dashboard');await page.evaluate(p=>localStorage.setItem(`portfolio-action:v1:${p.owner}`,JSON.stringify(p)),pending);
 let mutations=0;page.on('request',r=>{if(r.url().includes('/rpc/perform_portfolio_action'))mutations++;});
 await page.route('**/rest/v1/portfolio_action_receipts?**',route=>route.fulfill({json:{request_id:pending.requestId,action:'delete',source_id:'a',title:'',status:'confirmed',portfolio_id:'a'}}));
 await page.reload();await page.getByRole('button',{name:'ตรวจสอบผลคำขอค้าง'}).click();
 await expect(page.locator('article[data-portfolio-id="a"]')).toHaveCount(0);expect(mutations).toBe(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

for (const width of [1440, 390]) {
 test(`card icon actions target their own portfolio at ${width}px`, async ({page}) => {
  await page.setViewportSize({width, height: 1000});
  await page.goto('/dashboard');
  const card = page.locator('article[data-portfolio-id="b"]');
  const group = card.getByRole('group', {name:'จัดการพอร์ต'});
  await expect(group.getByRole('button', {name:'ทำสำเนาพอร์ต',exact:true})).toBeEnabled();
  await expect(page.getByRole('combobox')).toHaveCount(0);
  const controls = group.locator('a, button');
  await expect(controls).toHaveCount(4);
  const boxes = await controls.evaluateAll(nodes => nodes.map(node => {
   const {x,y,width,height}=node.getBoundingClientRect();
   return {x,y,width,height,icon:!!node.querySelector('svg'),label:node.getAttribute('aria-label')};
  }));
  for (const [i,box] of boxes.entries()) {
   expect(box.width).toBe(44); expect(box.height).toBe(44);
   expect(box.icon).toBe(true); expect(box.label).toBeTruthy();
   expect(box.y).toBe(boxes[0].y);
   if(i) expect(box.x).toBeGreaterThan(boxes[i-1].x+boxes[i-1].width);
  }
  await expect(group.getByRole('link')).toHaveAttribute('href','/editor?portfolio=b');
  const copy = group.getByRole('button',{name:'ทำสำเนาพอร์ต',exact:true});
  await copy.focus(); await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('ชื่อพอร์ตใหม่')).toHaveValue('Portfolio B สำเนา');
  await page.keyboard.press('Escape');
  await expect(copy).toBeFocused();
  await page.screenshot({path:`test-results/card-actions-${width}.png`,fullPage:true});
  let source='';
  await page.route('**/rest/v1/rpc/perform_portfolio_action',async route=>{
   const r=route.request().postDataJSON();source=r.p_source_id;
   await route.fulfill({json:{request_id:r.p_request_id,action:r.p_action,source_id:r.p_source_id,title:r.p_title,status:'confirmed',portfolio_id:r.p_source_id}});
  });
  await group.getByRole('button',{name:'ลบพอร์ต',exact:true}).click();
  await dialog.getByRole('button',{name:'ลบพอร์ต',exact:true}).click();
  await expect(card).toHaveCount(0); expect(source).toBe('b');
  await expect(page.locator('article[data-portfolio-id="a"]')).toBeVisible();
 });
}
