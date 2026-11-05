# Deploy บน Vercel — ลำดับขั้นสำหรับเจ้าของโปรเจกต์

ฉบับ 6 พ.ย. 2569 • ใช้กับ branch `codex/portfolio-next-phase` ตั้งแต่ commit `3849f4c` (แอปไม่มี feature flag แล้ว)

> **ห้าม merge `main` หรือ deploy production จนกว่าเจ้าของสั่ง** เอกสารนี้พาไปถึง **Preview deployment** ของ branch งานและ smoke test เท่านั้น

## 0. ภาพรวม

| ขั้น | ใครทำ | ผลที่ต้องได้ |
| --- | --- | --- |
| 1. รอบทดสอบรวมบนเครื่อง | เจ้าของ (หรือ Claude ในแชตที่ติดตั้ง npm ได้) | lint / typecheck / unit / build / E2E ผ่านที่ commit เดียวกับที่จะ deploy |
| 2. ตั้งค่า Supabase Auth | เจ้าของ (Dashboard) | Redirect URLs รองรับโดเมน Vercel และ `/reset-password` |
| 3. สร้างโปรเจกต์ Vercel | เจ้าของ (Dashboard) | Preview ของ `codex/portfolio-next-phase` build ผ่าน |
| 4. Smoke test บน Preview | เจ้าของ | ทุกข้อในหัวข้อ 4 ผ่านกับข้อมูลสาธิต |
| 5. Production | หลังเจ้าของสั่งเท่านั้น | ดูหัวข้อ 5 |

## 1. รอบทดสอบรวม (ต้องผ่านก่อน deploy)

แชตวันที่ 6 พ.ย. ติดตั้ง npm ไม่ได้ จึง**ยังไม่ได้รัน** lint, build, E2E และ unit ที่ใช้ PGlite กับโค้ดชุดนี้ ให้รันจาก checkout ที่สะอาดของ commit ที่จะ deploy:

```bash
git switch codex/portfolio-next-phase && git pull --ff-only
npm ci
npm run lint
npx tsc --noEmit --incremental false
npm test
# E2E ใช้ mock Supabase: ค่า NEXT_PUBLIC_* ถูกฝังตอน build จึงต้อง build ด้วยค่า mock
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key npm run build
npm run test:e2e
```

- E2E ต้องมี Chrome/Chromium (ถ้าใช้ Chrome ของเครื่อง ตั้ง `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`), `pdfinfo` (poppler-utils) และ Python ที่มี `pypdf` กับ `Pillow` เพราะเทสต์ PDF เรียก `tests/pdf-inspect.py`
- ตั้งแต่ commit `3849f4c` ใช้ **build เดียว** สำหรับ E2E ทั้งชุด (416 เทสต์) ไม่ต้องสลับ flag
- E2E ชุดนี้ถูกปรับใหญ่ (UUID fixtures, mock RPC Snapshot/atomic/portfolio action) โดยยังไม่เคยรันจริง หากล้มเหลว ให้ส่ง log กลับมาแก้ก่อน deploy ไม่ข้ามเทสต์
- หลัง E2E ให้ build ใหม่ด้วยค่า Supabase จริงก่อน `npm start` บนเครื่อง เพราะ build ล่าสุดฝังค่า mock ไว้
- เทสต์ mock ไม่ยืนยัน Supabase จริง, RLS, Storage, อีเมล หรือมือถือจริง (ดูหัวข้อ 4)

## 2. ตั้งค่า Supabase (Authentication → URL Configuration)

แอปส่งลิงก์กู้รหัสผ่านไปที่ `${window.location.origin}/reset-password` (ดู `src/components/auth/PasswordRecovery.tsx`) โดเมนที่ใช้งานจึงต้องอยู่ใน allow list

| ช่อง | ค่าที่แนะนำ |
| --- | --- |
| Site URL | ช่วง Preview คงค่าที่ใช้อยู่ได้; เมื่อขึ้น production ให้เปลี่ยนเป็นโดเมน production เช่น `https://<project>.vercel.app` |
| Redirect URLs | `http://localhost:3000/**` (พัฒนา), `https://*-<team-slug>.vercel.app/**` (Preview ทุก branch ของทีม/บัญชี Vercel), และเมื่อมี production: `https://<production-domain>/reset-password` |

`<team-slug>` คือชื่อทีมหรือบัญชีที่อยู่ท้าย URL Preview ของ Vercel ตามรูปแบบ wildcard ใน [คู่มือ Supabase เรื่อง Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls) สำหรับ production แนะนำ path แบบเจาะจงแทน `**`

ทำพร้อมกัน (จาก [ทบทวนความปลอดภัย](docs/verification/SECURITY_REVIEW_2026_11_06.md)): เปิด **Prevent use of leaked passwords** ถ้าแผน Supabase รองรับ (Pro ขึ้นไป) และตัดสินใจเรื่องบังคับยืนยันอีเมลก่อนเปิดใช้สาธารณะ

**ข้อควรระวัง Storage:** ฐาน hosted ตั้ง private asset origin ไว้ตอนติดตั้ง 5 พ.ย. ให้ตรงกับ `https://<project-ref>.supabase.co/storage/v1/object/public/portfolio-images/` ค่า `NEXT_PUBLIC_SUPABASE_URL` บน Vercel ต้องเป็น URL โปรเจกต์เดียวกันแบบเดียวกันทุกตัวอักษร ไม่เช่นนั้นการอัปโหลดรูปเข้าคลังจะถูกปฏิเสธ (`Invalid upload reference`)

## 3. สร้างโปรเจกต์ Vercel (Dashboard)

1. **Add New → Project** แล้ว Import `zenecoil0-design/projectfinal`
2. Framework Preset: **Next.js**, Root Directory: `./` (ค่าเริ่มต้น)
3. Build Command: คงค่าเริ่มต้น (`npm run build`) ซึ่งเรียก `next build --webpack` — bundler เดียวกับที่ใช้ตรวจ build มาตลอด Output/Install Command: ค่าเริ่มต้น
4. **Environment Variables** (ติ๊กทั้ง Production, Preview, Development) — มีเพียงสองค่า ตาม `.env.example`:

   | Key | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon/publishable key ของโปรเจกต์ |

   ห้ามใส่ service_role/secret key และไม่ต้องใส่ `NEXT_PUBLIC_..._ENABLED` ใด ๆ (ไม่มีผลแล้ว) ค่าเหล่านี้ถูกฝังตอน build: แก้แล้วต้อง Redeploy
5. Settings → Build and Deployment → **Node.js Version: 22.x** ให้ตรงกับที่ใช้พัฒนา (Next.js 16 ต้องการ Node 20.9 ขึ้นไป; Vercel มี [20.x/22.x/24.x และค่าเริ่มต้น 24.x](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions))
6. ตอน Import ครั้งแรก Vercel จะ deploy branch production (`main`) ทันที **`main` ยังเป็นโค้ด 27 ต.ค. ที่มี flag และเขียนตารางคลังตรง ซึ่งใช้กับฐาน hosted หลังติดตั้ง Snapshot ไม่ได้** อย่าใช้หรือแชร์ URL production นั้น และอย่าเปลี่ยน Production Branch เป็น branch งาน
7. เปิด Deployment ของ branch `codex/portfolio-next-phase` (Deployments → เลือก Preview ล่าสุด หรือ push commit ใหม่เพื่อสร้าง) ตรวจ build log:
   - คาดว่าเห็นคำเตือน `middleware` deprecated ของ Next.js 16 ซึ่งยังทำงานได้ (ข้อเสนอ: เปลี่ยนเป็น `proxy.ts` ในรอบถัดไปพร้อมรันทดสอบ ไม่ทำในรอบนี้)
   - ไม่ควรมี error เรื่อง env หรือ TypeScript
8. Deployment Protection: คงค่าเริ่มต้น (Standard Protection / Vercel Authentication) เพื่อให้ Preview เปิดได้เฉพาะผู้ที่ล็อกอิน Vercel ที่มีสิทธิ์

## 4. Smoke test บน Preview (ข้อมูลสาธิตเท่านั้น)

ใช้บัญชีสาธิตและรายการชื่อขึ้นต้น `DEMO-` ไม่ใช้งานจริงของผู้อื่น บันทึก commit SHA, URL Preview, browser/อุปกรณ์ และผลแต่ละข้อ

| # | ขั้นตอน | ผ่านเมื่อ |
| --- | --- | --- |
| 1 | เปิด `/` แล้ว login | เข้า Dashboard ได้ ไม่มี error ใน console |
| 2 | `/my-data` เพิ่มการศึกษา 1 กิจกรรม 1 (มีรูป) เกียรติบัตร 1 (มีรูป) | บันทึกสำเร็จ รีเฟรชแล้วรายการและรูปอยู่ครบ |
| 3 | สร้างพอร์ต A, เลือกรายการทั้งสามหมวด บันทึกทีละหมวด | ข้อความยืนยันสำเร็จ Preview ตรงลำดับที่ติ๊ก |
| 4 | แก้รายการในคลัง แล้วเปิด A ใหม่ | A ยังแสดงฉบับเดิม และมี “มีฉบับใหม่” → กด **รับอัปเดตรายการนี้** ได้ |
| 5 | ทำสำเนา A เป็น B แล้วรับอัปเดตเฉพาะใน A | B ยังเป็นฉบับเดิม |
| 6 | พอร์ตเก่าที่ยังไม่เคยเตรียมฉบับ (ถ้ามี) | เห็นหน้า **ฉบับข้อมูลของพอร์ต** และกด **ยืนยันเตรียมฉบับเริ่มต้น** ได้ครั้งเดียว |
| 7 | ประวัติส่วนตัว: เลือก **กรอกอายุเอง** บันทึก แล้วเปิดใหม่ | ค่าอายุยังอยู่ |
| 8 | ดาวน์โหลด PDF ของ A และ B (desktop และมือถือจริงอย่างละครั้ง) | จำนวนหน้า/สารบัญ/เลขหน้า ตรง Preview รูปไม่หาย |
| 9 | ลบรายการทดสอบหนึ่งรายการจากคลัง (ที่อยู่ในทั้ง A และ B และซ่อนหมวดใน B) | รายการหายจากทั้งสองพอร์ต |
| 10 | ลบพอร์ต B | A และคลังยังอยู่ |
| 11 | ลืมรหัสผ่านด้วยอีเมลทดสอบที่รับได้ | ลิงก์พาไป `https://<preview-domain>/reset-password` และตั้งรหัสใหม่ได้ |
| 12 | บัญชีที่สองเปิด URL พอร์ตของบัญชีแรก | อ่าน/แก้ไม่ได้ |
| 13 | Logout | กลับหน้า login และเข้า `/dashboard` ไม่ได้ |

ข้อ 3–5, 9 และ 12 คือส่วนที่ยังค้างใน [ตาราง SNP](docs/FINAL_DELIVERY_SCOPE.md) (การศึกษา/เกียรติบัตร, หมวดซ่อน, สองบัญชี) ผลจาก Preview ที่ต่อฐานจริงใช้เป็นหลักฐานตรวจรับได้ ถ้าบันทึกครบ

## 5. Production (หลังเจ้าของสั่งเท่านั้น)

1. รอบทดสอบรวมและ smoke test ผ่านที่ commit เดียวกัน
2. เจ้าของสั่ง merge `codex/portfolio-next-phase` เข้า `main` (Vercel จะ deploy production จาก `main` อัตโนมัติ)
3. ปรับ Site URL / Redirect URL production ในหัวข้อ 2 แล้วทำ smoke test ข้อ 1, 3, 8, 11 ซ้ำบนโดเมน production
4. **Rollback:** ฐาน hosted ติดตั้ง Snapshot และถอนสิทธิ์เขียนตรงแล้ว การ Instant Rollback ไปยัง deployment ที่สร้างจากโค้ดก่อน `3849f4c` (รวม `main` เดิม) จะบันทึกคลังไม่ได้ ให้ย้อนได้เฉพาะ deployment ที่สร้างจาก commit ตั้งแต่ `3849f4c` ขึ้นไป หรือแก้ไปข้างหน้า ห้ามคืนสิทธิ์เดิมในฐานเพื่อให้โค้ดเก่าทำงาน (ตาม [release runbook](docs/SNAPSHOT_RELEASE_RUNBOOK.md))

## อ้างอิง

- [Supabase: Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase: Password security](https://supabase.com/docs/guides/auth/password-security)
- [Vercel: Supported Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
- [Vercel: Deployment Protection](https://vercel.com/docs/security/deployment-protection)
