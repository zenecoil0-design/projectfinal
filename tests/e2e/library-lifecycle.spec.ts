import { test, expect, errors, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { openEditorSection } from './helpers/editor';
import { expectCurrentContents } from './helpers/toc';
const owner = '00000000-0000-0000-0000-000000000001';
const user = { id:owner,aud:'authenticated',role:'authenticated',email:'test@example.invalid',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z' };
test.beforeEach(async ({ context, request }) => {
  await request.get('http://127.0.0.1:54321/__reset');
  const part = (value:object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const session = {access_token:`${part({alg:'HS256'})}.${part({sub:owner,exp:4102444800})}.test`,refresh_token:'test-refresh',token_type:'bearer',expires_at:4102444800,expires_in:3600,user};
  await context.addCookies([{name:'sb-127-auth-token',value:'base64-'+part(session),domain:'127.0.0.1',path:'/'}]);
});
const sections = [
  {kind:'education',plural:'educations',tab:'ประวัติการศึกษา',title:'Saved School'},
  {kind:'activity',plural:'activities',tab:'ผลงานและกิจกรรม',title:'Saved Activity'},
  {kind:'certificate',plural:'certificates',tab:'เกียรติบัตร',title:'Saved Certificate'},
] as const;
const deletion = (page:Page) => page.getByRole('dialog',{name:'ลบรายการจากคลัง',exact:true});
const confirmDelete = (page:Page) => deletion(page).getByRole('button',{name:'ลบจากคลังและทุกพอร์ต',exact:true});
const api = 'http://127.0.0.1:54321/rest/v1';
for (const section of sections) test(`${section.kind}: failed tag removal retains draft until retry confirms save`, async ({page,request}) => {
  const relation = `user_library_${section.kind}_tags`;
  await request.post(`${api}/user_tags`, {data:{id:'tag-review',user_id:owner,name:'Review tag'}});
  await request.post(`${api}/${relation}`, {data:{[`${section.kind}_id`]:`${section.kind}-a`,tag_id:'tag-review'}});
  const card = await open(page,section);
  await card.getByRole('button',{name:/แก้ไข/}).click();
  const form = page.locator('main div[role=dialog]');
  await form.getByRole('button',{name:/Review tag/}).click();
  let fail = true, attempts = 0;
  await page.route(`**/rest/v1/${relation}?**`, route => {
    if(route.request().method() !== 'DELETE') return route.continue();
    attempts++;
    return fail ? route.fulfill({status:500,json:{message:'TAG_DELETE_FAILED'}}) : route.continue();
  });
  let alerts = 0;
  page.on('dialog', async dialog => { alerts++; await dialog.accept(); });
  await form.getByRole('button',{name:/^บันทึก/}).click();
  await expect.poll(()=>alerts).toBe(1);
  await expect(form).toBeVisible();
  await expect(form.getByRole('button',{name:'Review tag',exact:true})).toHaveAttribute('aria-pressed','false');
  expect(await (await request.get(`${api}/${relation}`)).json()).toHaveLength(1);
  fail = false;
  await form.getByRole('button',{name:/^บันทึก/}).click();
  await expect(form).toHaveCount(0);
  expect(await (await request.get(`${api}/${relation}`)).json()).toHaveLength(0);
  expect(attempts).toBe(2);
});
const gate = () => { let release = () => {}; const waiting = new Promise<void>(resolve => { release = resolve; }); return { waiting, release }; };
async function accountEvent(page:Page) {
  await page.evaluate(user => {
    const channel = new BroadcastChannel('sb-127-auth-token');
    channel.postMessage({event:'SIGNED_IN',session:{user:{...user,id:'00000000-0000-0000-0000-000000000002'}}});channel.close();
  },user);
}
async function open(page:Page, section:Omit<typeof sections[number], 'title'> & {title:string}) {
  await page.goto('/my-data');
  await page.getByRole('group',{name:'หมวดคลังข้อมูล'}).getByRole('button',{name:section.tab,exact:true}).click();
  await expect(page.getByRole('heading',{name:section.title,exact:true})).toBeVisible();
  return page.locator('article').filter({has:page.getByRole('heading',{name:section.title,exact:true})});
}

for (const section of sections) test(`${section.kind}: impact/cancel and same-turn delete use one owner-filtered returning request; files retained`, async ({page}) => {
  const card = await open(page,section); let deletes=0,storageDeletes=0;
  page.on('request',request=>{
    if(request.method()!=='DELETE')return;
    if(request.url().includes('/storage/v1/'))storageDeletes++;
    if(!request.url().includes(`/rest/v1/user_library_${section.plural}?`))return;
    deletes++;
    const url=new URL(request.url());expect(url.searchParams.get('id')).toBe(`eq.${section.kind}-a`);expect(url.searchParams.get('user_id')).toBe(`eq.${owner}`);
    expect(request.headers().prefer).toContain('return=representation');
  });
  await card.getByRole('button',{name:/ลบ/}).click();
  await expect(deletion(page)).toContainText('Portfolio A');
  await expect(deletion(page)).toContainText('พอร์ตที่ได้รับผลกระทบ 1 พอร์ต');
  await deletion(page).getByRole('button',{name:'ยกเลิก',exact:true}).click();
  await expect(card).toBeVisible();expect(deletes).toBe(0);
  await card.getByRole('button',{name:/ลบ/}).click();
  const confirm=deletion(page).getByRole('button',{name:'ลบจากคลังและทุกพอร์ต',exact:true});
  await expect(confirm).toBeVisible();
  await confirm.evaluate(button=>{if(!(button instanceof HTMLButtonElement))throw new Error('button');button.click();button.click();});
  await expect(deletion(page).getByRole('status')).toContainText('รูปใน Storage ยังไม่ได้ลบ');
  await expect(card).toHaveCount(0);expect(deletes).toBe(1);expect(storageDeletes).toBe(0);
  await deletion(page).getByRole('button',{name:'ปิด',exact:true}).click();
});

test('certificate: legacy four images remain visible/editable, cannot add, deliberate image removal needs confirmation',async ({page})=>{
  const pictures=Array.from({length:4},(_,sort_order)=>({id:`legacy-${sort_order}`,certificate_id:'certificate-a',image_url:'http://127.0.0.1:54321/sample.png',sort_order}));
  await page.route('**/rest/v1/user_library_certificate_images?**',route=>route.fulfill({json:pictures}));
  const card=await open(page,sections[2]);await card.getByRole('button',{name:/แก้ไข/}).click();
  const form=page.locator('main div[role=dialog]');await expect(form.locator('img')).toHaveCount(4);
  await expect(form.getByRole('button',{name:'เพิ่มรูปไม่ได้ (สูงสุด 2 รูป)',exact:true})).toBeDisabled();
  await form.getByLabel('ชื่อเกียรติบัตร / รางวัล *',{exact:true}).fill('Legacy text saved');
  await form.getByRole('button',{name:/^บันทึก/}).click();
  await expect(page.getByRole('heading',{name:'Legacy text saved',exact:true})).toBeVisible();
  await page.locator('article').getByRole('button',{name:/แก้ไข/}).click();await expect(form.locator('img')).toHaveCount(4);
  const warning=page.waitForEvent('dialog').then(dialog=>dialog.dismiss());
  await Promise.all([warning,form.getByRole('button',{name:'ลบรูป',exact:true}).nth(0).click()]);
  await expect(form.locator('img')).toHaveCount(4);
});

for (const section of sections) {
  const source = `user_library_${section.plural}`;
  test(`${section.kind}: failed/malformed impact cannot authorize delete; retry deduplicates; hidden B included; keyboard/mobile`,async({page,request},info)=>{
    const longTitle = section.title + ' ชื่อรายการภาษาไทยยาวไม่มีช่องว่าง'.repeat(3);
    await request.patch(`${api}/${source}?id=eq.${section.kind}-a`,{data:{[section.kind==='education'?'school_name':'title']:longTitle}});
    await request.post(`${api}/portfolio_${section.plural}`,{data:{portfolio_id:'b',[`${section.kind}_id`]:`${section.kind}-a`,sort_order:0}});
    await request.post(`${api}/portfolio_section_visibility`,{data:{portfolio_id:'b',section:section.kind,visible:false}});
    const held=gate();let reads=0,fail=true;let removes=0;
    page.on('request',r=>{if(r.method()==='DELETE')removes++;});
    await page.route(`**/rest/v1/portfolio_${section.plural}?**`,async route=>{
      reads++;if(fail)return route.fulfill({status:500,json:{message:'INTERNAL_IMPACT_CONSTRAINT'}});
      await held.waiting;return route.continue();
    });
    const card=await open(page,{...section,title:longTitle});await card.getByRole('button',{name:/ลบ/}).click();
    await expect(deletion(page).getByRole('alert')).toContainText('อ่านผลกระทบหรือยืนยันบัญชีไม่สำเร็จ');
    await expect(confirmDelete(page)).toHaveCount(0);await expect(page.locator('body')).not.toContainText('INTERNAL_IMPACT_CONSTRAINT');
    fail=false;const retry=deletion(page).getByRole('button',{name:'ลองใหม่',exact:true});
    await retry.evaluate(button=>{if(!(button instanceof HTMLButtonElement))throw new Error('button');button.click();button.click();});
    await expect.poll(()=>reads).toBe(2);await expect(deletion(page).getByRole('status')).toContainText('กำลังตรวจผลกระทบ');
    held.release();await expect(deletion(page)).toContainText('พอร์ตที่ได้รับผลกระทบ 2 พอร์ต');
    await expect(deletion(page)).toContainText('Portfolio B');
    for(const width of [1440,390]){
      await page.setViewportSize({width,height:844});
      expect(await deletion(page).evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
      await expect(confirmDelete(page)).toBeInViewport();
      await page.screenshot({path:info.outputPath(`delete-${section.kind}-${width}.png`)});
    }
    const cancel=deletion(page).getByRole('button',{name:'ยกเลิก',exact:true});await cancel.focus();
    await page.keyboard.press('Shift+Tab');await expect(confirmDelete(page)).toBeFocused();
    await page.keyboard.press('Tab');await expect(cancel).toBeFocused();
    await page.keyboard.press('Escape');await expect(deletion(page)).toHaveCount(0);await expect(card).toBeVisible();expect(removes).toBe(0);
    await page.unroute(`**/rest/v1/portfolio_${section.plural}?**`);
    await page.route(`**/rest/v1/portfolio_${section.plural}?**`,route=>route.fulfill({json:null}));
    await card.getByRole('button',{name:/ลบ/}).click();await expect(deletion(page).getByRole('alert')).toBeVisible();await expect(confirmDelete(page)).toHaveCount(0);
  });

  for(const committed of [true,false])test(`${section.kind}: ambiguous network delete (${committed?'committed':'not committed'}) requires status read, never automatic resend`,async({page})=>{
    const card=await open(page,section);let deletes=0;
    await page.route(`**/rest/v1/${source}?**`,async route=>{
      if(route.request().method()!=='DELETE')return route.continue();
      deletes++;if(committed)await route.fetch();return route.abort('failed');
    });
    await card.getByRole('button',{name:/ลบ/}).click();await confirmDelete(page).click();
    await expect(deletion(page).getByRole('alert')).toContainText('คำขออาจสำเร็จแล้ว');
    await expect(confirmDelete(page)).toHaveCount(0);expect(deletes).toBe(1);
    await deletion(page).getByRole('button',{name:'ตรวจสอบสถานะ',exact:true}).click();
    if(committed){
      await expect(deletion(page).getByRole('status')).toContainText('ยืนยันแล้วว่าไม่มีรายการนี้ในคลัง');await expect(card).toHaveCount(0);
    }else{
      await expect(confirmDelete(page)).toBeVisible();expect(deletes).toBe(1);
      await page.unroute(`**/rest/v1/${source}?**`);
      await confirmDelete(page).click();await expect(deletion(page).getByRole('status')).toContainText('ยืนยันแล้วว่าไม่มีรายการนี้ในคลัง');
    }
    expect(deletes).toBe(1);
  });

  for(const exit of ['account','unmount'] as const)test(`${section.kind}: late delete after ${exit} cannot restore old dialog or UI`,async({page})=>{
    const held=gate();let submitted=0,completed=false;
    await page.route(`**/rest/v1/${source}?**`,async route=>{
      if(route.request().method()!=='DELETE')return route.continue();
      submitted++;const response=await route.fetch();await held.waiting;await route.fulfill({response});completed=true;
    });
    const card=await open(page,section);await card.getByRole('button',{name:/ลบ/}).click();await confirmDelete(page).click();
    await expect.poll(()=>submitted).toBe(1);
    if(exit==='account'){await accountEvent(page);await expect(deletion(page)).toHaveCount(0);}
    else await page.goto('/dashboard');
    held.release();await expect.poll(()=>completed).toBe(true);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await expect(deletion(page)).toHaveCount(0);
    await expect(page.getByText('ยืนยันแล้วว่าไม่มีรายการนี้ในคลัง',{exact:false})).toHaveCount(0);
    if(exit==='unmount')await expect(page).toHaveURL(/dashboard$/);
  });

  test(`${section.kind}: deleted source rejects late manual save without false success and keeps dirty draft`,async({page,request})=>{
    const card=await open(page,section);await card.getByRole('button',{name:/แก้ไข/}).click();
    const form=page.locator('main div[role=dialog]');
    const title=form.getByLabel(section.kind==='education'?'ชื่อสถานศึกษา *':section.kind==='activity'?'ชื่อผลงาน / กิจกรรม *':'ชื่อเกียรติบัตร / รางวัล *',{exact:true});
    await title.fill('Late draft retained');const held=gate();let writes=0;
    await page.route(`**/rest/v1/${source}?**`,async route=>{
      if(route.request().method()!=='PATCH')return route.continue();
      writes++;await held.waiting;await route.continue();
    });
    await form.getByRole('button',{name:/^บันทึก/}).click();await expect.poll(()=>writes).toBe(1);
    await request.delete(`${api}/${source}?id=eq.${section.kind}-a&user_id=eq.${owner}`);
    page.once('dialog',dialog=>dialog.accept());held.release();
    await expect(form.getByRole('button',{name:/^บันทึก/})).toBeEnabled();await expect(title).toHaveValue('Late draft retained');
    await form.getByRole('button',{name:'ยกเลิก',exact:true}).click();
    await expect(page.getByRole('dialog',{name:'ข้อมูลยังไม่ได้บันทึก',exact:true})).toBeVisible();
    const rows=await (await request.get(`${api}/${source}?id=eq.${section.kind}-a`)).json();expect(rows).toEqual([]);
  });

  test(`${section.kind}: changed impact requires confirmation again before any delete`,async({page,request})=>{
    const card=await open(page,section);let deletes=0;
    page.on('request',r=>{if(r.method()==='DELETE')deletes++;});
    await card.getByRole('button',{name:/ลบ/}).click();await expect(deletion(page)).toContainText('พอร์ตที่ได้รับผลกระทบ 1 พอร์ต');
    await request.post(`${api}/portfolio_${section.plural}`,{data:{portfolio_id:'b',[`${section.kind}_id`]:`${section.kind}-a`,sort_order:0}});
    await confirmDelete(page).click();await expect(deletion(page)).toContainText('พอร์ตที่ได้รับผลกระทบ 2 พอร์ต');expect(deletes).toBe(0);
    await confirmDelete(page).click();await expect(deletion(page).getByRole('status')).toContainText('ยืนยันแล้วว่าไม่มีรายการนี้ในคลัง');expect(deletes).toBe(1);
  });
}

test('pending library delete composes the existing history/category busy guard',async({page})=>{
  await page.goto('/dashboard');await page.getByRole('link',{name:'คลังข้อมูลของฉัน',exact:true}).click();
  const held=gate();let submitted=0;
  await page.route('**/rest/v1/user_library_activities?**',async route=>{
    if(route.request().method()!=='DELETE')return route.continue();
    submitted++;await held.waiting;return route.continue();
  });
  await page.locator('article').filter({has:page.getByRole('heading',{name:'Saved Activity',exact:true})}).getByRole('button',{name:/ลบ/}).click();await confirmDelete(page).click();
  await expect.poll(()=>submitted).toBe(1);await expect(deletion(page).getByRole('button',{name:'ยกเลิก',exact:true})).toBeDisabled();
  for(const button of await page.getByRole('group',{name:'หมวดคลังข้อมูล'}).getByRole('button').all())await expect(button).toBeDisabled();
  try { await page.goBack({timeout:1000}); }
  catch(error) { if(!(error instanceof errors.TimeoutError))throw error; }
  await expect(page).toHaveURL(/my-data$/);await expect(deletion(page).getByRole('status')).toContainText('กำลังยืนยันการลบ');
  await expect(page.getByRole('dialog',{name:'ข้อมูลยังไม่ได้บันทึก',exact:true})).toHaveCount(0);
  held.release();await expect(deletion(page).getByRole('status')).toContainText('ยืนยันแล้วว่าไม่มีรายการนี้ในคลัง');
  await deletion(page).getByRole('button',{name:'ปิด',exact:true}).click();await page.goBack();await expect(page).toHaveURL(/dashboard$/);
});

for(const kind of ['activity','certificate'] as const)test(`${kind}: uploaded image whose database response failed is retained with dirty draft, never removed from Storage`,async({page,request})=>{
  const section=sections.find(row=>row.kind===kind)!;const card=await open(page,section);await card.getByRole('button',{name:/แก้ไข/}).click();
  const form=page.locator('main div[role=dialog]');let uploads=0,removes=0;
  await page.route('**/storage/v1/**',route=>{
    if(route.request().method()==='POST')uploads++;
    if(route.request().method()==='DELETE')removes++;
    return route.fulfill({json:{Key:'synthetic-image'}});
  });
  await page.route(`**/rest/v1/user_library_${kind}_images**`,async route=>{
    if(route.request().method()!=='POST')return route.continue();
    await route.fetch();return route.fulfill({status:500,json:{message:'INTERNAL_IMAGE_SAVE_RESPONSE'}});
  });
  const png=await(await request.get('http://127.0.0.1:54321/sample.png')).body();
  await form.locator('input[type=file]').setInputFiles({name:'retained.png',mimeType:'image/png',buffer:png});
  await page.getByRole('dialog',{name:'ปรับขอบเขตรูปภาพ'}).getByRole('button',{name:'ใช้รูปต้นฉบับ',exact:true}).click();
  const preview=await form.locator('img').getAttribute('src');
  page.once('dialog',async dialog=>{expect(dialog.message()).not.toContain('INTERNAL_IMAGE_SAVE_RESPONSE');await dialog.accept();});
  await form.getByRole('button',{name:/^บันทึก/}).click();await expect(form.getByRole('button',{name:/^บันทึก/})).toBeEnabled();
  await expect(form.locator('img')).toHaveAttribute('src',preview!);expect(uploads).toBe(1);expect(removes).toBe(0);
  const saved=await(await request.get(`${api}/user_library_${kind}_images?${kind}_id=eq.${kind}-a`)).json();expect(saved).toHaveLength(1);
  await form.getByRole('button',{name:'ยกเลิก',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'ข้อมูลยังไม่ได้บันทึก',exact:true})).toBeVisible();
});

for(const [kind,maximum] of [['activity',4],['certificate',2]] as const)test(`${kind}: current image limit rejects additional files without losing existing images`,async({page,request})=>{
  const section=sections.find(row=>row.kind===kind)!;
  await request.post(`${api}/user_library_${kind}_images`,{data:Array.from({length:maximum},(_,i)=>({id:`limit-${i}`,[`${kind}_id`]:`${kind}-a`,image_url:'http://127.0.0.1:54321/sample.png',sort_order:i}))});
  const card=await open(page,section);await card.getByRole('button',{name:/แก้ไข/}).click();const form=page.locator('main div[role=dialog]');
  await expect(form.locator('img')).toHaveCount(maximum);
  await expect(form.getByRole('button',{name:kind==='activity'?'ครบ 4 รูปแล้ว':`เพิ่มรูปไม่ได้ (สูงสุด ${maximum} รูป)`,exact:true})).toBeDisabled();
  const png=await(await request.get('http://127.0.0.1:54321/sample.png')).body();
  const warning=page.waitForEvent('dialog').then(async dialog=>{expect(dialog.message()).toContain(String(maximum));await dialog.accept();});
  await form.locator('input[type=file]').setInputFiles({name:'extra.png',mimeType:'image/png',buffer:png});
  await page.getByRole('dialog',{name:'ปรับขอบเขตรูปภาพ'}).getByRole('button',{name:'ใช้รูปต้นฉบับ',exact:true}).click();
  await warning;
  await expect(form.locator('img')).toHaveCount(maximum);await expect(page.getByRole('dialog',{name:'ปรับขอบเขตรูปภาพ'})).toHaveCount(0);
});

for(const template of ['classic','modern','minimal'])test(`${template}: shared deletion including hidden portfolio survives reload and real mobile PDF retains other sections`,async({page,request},info)=>{
  await request.patch(`${api}/portfolios?id=eq.a`,{data:{template_key:template}});
  await request.post(`${api}/portfolio_section_visibility`,{data:{portfolio_id:'b',section:'activity',visible:false}});
  for(const section of sections){
    const kind=section.kind;
    await request.post(`${api}/user_library_${section.plural}`,{data:{id:`${kind}-kept`,user_id:owner,school_name:'KEEP SCHOOL',title:`KEEP ${kind.toUpperCase()}`,level:'มัธยมศึกษา',gpa:null,study_plan:'',start_year:'',end_year:'',description:'ข้อมูลที่ต้องอยู่ครบหลังลบ',logo_url:'http://127.0.0.1:54321/sample.png',activity_date:null,issued_date:null}});
    if(kind!=='education')await request.post(`${api}/user_library_${kind}_images`,{data:[0,3].map((sort_order,i)=>({id:`keep-${kind}-${i}`,[`${kind}_id`]:`${kind}-kept`,image_url:`http://127.0.0.1:54321/sample.png?order=${i}`,sort_order}))});
    await request.post(`${api}/portfolio_${section.plural}`,{data:[{portfolio_id:'b',[`${kind}_id`]:`${kind}-a`,sort_order:0},{portfolio_id:'a',[`${kind}_id`]:`${kind}-kept`,sort_order:1}]});
    // Deselecting A changes only that portfolio; library and B stay intact.
    await request.post(`${api}/rpc/replace_portfolio_selection`,{data:{p_portfolio_id:'a',p_section:kind,p_item_ids:[`${kind}-kept`]}});
    expect(await(await request.get(`${api}/user_library_${section.plural}?id=eq.${kind}-a`)).json()).toHaveLength(1);
    expect(await(await request.get(`${api}/portfolio_${section.plural}?portfolio_id=eq.b`)).json()).toHaveLength(1);
    await request.post(`${api}/rpc/replace_portfolio_selection`,{data:{p_portfolio_id:'a',p_section:kind,p_item_ids:[`${kind}-a`,`${kind}-kept`]}});
    const card=await open(page,section);await card.getByRole('button',{name:/ลบ/}).click();
    await expect(deletion(page)).toContainText('พอร์ตที่ได้รับผลกระทบ 2 พอร์ต');await confirmDelete(page).click();
    await expect(deletion(page).getByRole('status')).toContainText('ยืนยันแล้วว่าไม่มีรายการนี้ในคลัง');await deletion(page).getByRole('button',{name:'ปิด',exact:true}).click();
    expect(await(await request.get(`${api}/portfolio_${section.plural}?portfolio_id=eq.b`)).json()).toEqual([]);
  }
  await page.setViewportSize({width:390,height:844});await page.goto('/editor?portfolio=b');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await expect(page.locator('[data-portfolio-page][data-page-section=activity]')).toHaveCount(0);
  for(const section of sections){await openEditorSection(page,section.kind);await expect(page.locator('form:visible').getByRole('checkbox',{name:section.title,exact:true})).toHaveCount(0);}
  await page.goto('/editor?portfolio=a');await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await expect(page.locator('[data-portfolio-page]')).toHaveCount(7);await expectCurrentContents(page);
  const papers=page.locator('main [data-portfolio-page]');await expect(papers).toHaveCount(7);
  for(const name of ['Saved School','Saved Activity','Saved Certificate'])await expect(papers.filter({hasText:name})).toHaveCount(0);
  for(const name of ['KEEP SCHOOL','KEEP ACTIVITY','KEEP CERTIFICATE'])await expect(papers.filter({hasText:name})).toHaveCount(1);
  for(const kind of ['activity','certificate']){
    const images=page.locator(`main [data-portfolio-page][data-page-section=${kind}] .document-images img`);
    await expect(images).toHaveCount(2);
    expect(await images.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('src')))).toEqual([0,1].map(i=>`http://127.0.0.1:54321/sample.png?order=${i}`));
  }
  await expect(page.locator('main')).toBeHidden();
  const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'ดาวน์โหลด PDF',exact:true}).click();
  const path=info.outputPath(`lifecycle-${template}.pdf`);await(await downloaded).saveAs(path);
  const audit=JSON.parse(execFileSync(process.env.CODEX_PRIMARY_RUNTIME_PYTHON||'python',['tests/pdf-inspect.py',path],{encoding:'utf8'}));
  expect(audit.pages).toBe(7);expect(audit.uniqueRasters).toBe(7);
  for(const [width,height] of audit.boxes){expect(width).toBeCloseTo(595.28,1);expect(height).toBeCloseTo(841.89,1);}
  await info.attach('actual-pdf-audit',{body:JSON.stringify(audit),contentType:'application/json'});
});
