import { expectCurrentContents } from './helpers/toc';
import { openEditorSection } from './helpers/editor';
import { test, expect } from '@playwright/test';

const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
test.beforeEach(async ({ context, request }) => {
  await request.get('http://127.0.0.1:54321/__reset');
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const session = { access_token: `${part({ alg: 'HS256' })}.${part({ sub: user.id, exp: 4102444800 })}.test`, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user };
  await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + part(session), domain: '127.0.0.1', path: '/' }]);
});


for(const template of ['classic','modern','minimal'])test(`${template}: profile columns continue without lost rows and export`,async({page,request},info)=>{
 const fields=Array.from({length:45},(_,i)=>({id:`field-${i}`,title:`หัวข้อ ${i}`,value:`รายละเอียดเพิ่มเติมลำดับ ${i}`}));
 const address='ที่อยู่ทดสอบภาษาไทย '.repeat(250);
 await request.patch('http://127.0.0.1:54321/rest/v1/profiles?portfolio_id=eq.a',{data:{custom_fields:fields,address}});
 await page.setViewportSize({width:390,height:900});await page.goto('/editor?portfolio=a');await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
 await page.getByLabel('เทมเพลต',{exact:true}).selectOption(template);
 const pages=page.locator('main [data-portfolio-page][data-page-section=profile]');
 await expect.poll(()=>pages.count()).toBeGreaterThan(1);
 const rows=await pages.locator('[data-flow-id]').evaluateAll(nodes=>nodes.map(node=>({id:node.getAttribute('data-flow-id'),text:node.textContent??''})));
 const grouped=new Map<string,string>();for(const row of rows)grouped.set(row.id!, (grouped.get(row.id!)??'')+row.text);
 expect(Array.from(grouped.values()).filter(text=>text.includes(address))).toHaveLength(1);
 for(const field of fields)expect(Array.from(grouped.values()).filter(text=>text.endsWith(field.value))).toHaveLength(1);
 if(template!=='classic')await expect(pages.locator('[data-profile-column=left]')).toHaveCount(await pages.count());
 await openEditorSection(page,'colors');await expectCurrentContents(page);const count=await page.locator('main [data-portfolio-page]').count();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'ดาวน์โหลด PDF',exact:true}).click();
 const result=await Promise.race([download,page.getByText(/เนื้อหาล้นหน้า/).waitFor().then(async()=>{throw new Error(await page.getByText(/เนื้อหาล้นหน้า/).innerText());})]);
 const path=info.outputPath(template+'.pdf');await result.saveAs(path);
 const {execFileSync}=await import('node:child_process');const audit=JSON.parse(execFileSync(process.env.CODEX_PRIMARY_RUNTIME_PYTHON||'python',['tests/pdf-inspect.py',path],{encoding:'utf8'}));expect(audit.pages).toBe(count);
 for(const [w,h] of audit.boxes){expect(w).toBeCloseTo(595.28,1);expect(h).toBeCloseTo(841.89,1);}
 await request.patch('http://127.0.0.1:54321/rest/v1/profiles?portfolio_id=eq.a',{data:{custom_fields:[],address:'ที่อยู่สั้น'}});
 await page.reload();await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();await expect(pages).toHaveCount(1);
 await expect(pages).toContainText('ที่อยู่สั้น');await expect(pages).not.toContainText(fields[44].value);
});
