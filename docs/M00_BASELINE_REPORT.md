# M00 — ผลตรวจตั้งต้นและงานที่ยังติดข้อมูลจริง

อัปเดต 15 ตุลาคม 2026 (Asia/Bangkok) • ผู้ดำเนินการ: ไค

**สถานะส่วนใหญ่: BLOCKED — สำเร็จเฉพาะ baseline ฝั่ง repository/mock ยังไม่ได้ตรวจ Supabase จริง**

## จุดอ้างอิง

- Branch `codex/portfolio-system-fixes`, baseline HEAD `957e35d020f6ea4a844a598e71e48e33e7155981`
- clone ใหม่แยกไว้ใน `portfolio-work` ไม่พบการแก้ค้างใน checkout ก่อนเริ่ม งานใหม่มีเฉพาะเอกสาร เครื่องมืออ่าน metadata และ fixture manifest
- remote `https://github.com/zenecoil0-design/projectfinal.git`; main ที่ตรวจ `a88f7043ccc9a7aa6b6e29c533a927164278a52f`
- อ่าน AGENTS และคู่มือ Next.js ที่ติดตั้ง: installation และ testing/playwright ก่อนเตรียมงาน
- Node 24.19.0, npm 11.9.0, Next.js 16.2.9; ใช้ package-lock เดิม ไม่มีการเพิ่ม dependency ในโปรเจกต์

## ผลรันจริงของ baseline

| งาน | คำสั่ง/วิธี | ผล | ขอบเขตหลักฐาน |
| --- | --- | --- | --- |
| Dependencies | `npm ci` | PASS ติดตั้ง 410 packages | checkout baseline ตาม lockfile |
| Lint | `npm run lint` | PASS exit 0; 0 errors, 20 warnings | warning เดิมเรื่อง `<img>`; ไม่ปิด lint เพื่อให้ผ่าน |
| Unit/database | `npm test` | PASS 2/2 | packing และ transaction/ownership ใน PGlite ไม่ใช่ฐาน Supabase จริง |
| Build | `npm run build` พร้อม mock URL/key | PASS | production build ชี้ localhost mock; ไม่ใช่ deploy จริง |
| E2E discovery | `npx playwright test --list` | พบ 9 tests ใน editor.spec.ts | แก้จำนวน 10 ที่นับผิดใน audit/plan ก่อนหน้า |
| E2E execution | `npm run test:e2e` พร้อม executable path | PASS ของการรันชุดเดิม | Chromium 153.0.8010.0 + mock Supabase; ดูหลักฐานด้านล่าง |
| Metadata SQL | รัน SQL บน PGlite ที่สร้าง storage.buckets จำลอง | PASS syntax/execution | ตรวจคืน 9 กลุ่ม metadata ได้ ไม่ใช่ผลตรวจ schema จริง |
| Fixture manifest | JSON parse และตรวจ limits/owners | PASS | บัญชี 2 กลุ่ม ภาพกิจกรรม 4/เกียรติบัตร 2; ยังไม่ใช่ seed จริง |

Build เตือนว่า middleware convention ถูกเลิกแนะนำให้ใช้ proxy; บันทึกไว้สำหรับงานปรับโค้ด ไม่ได้เปลี่ยน behavior ใน M00

### หลักฐาน E2E และข้อจำกัดการเก็บ log

การรันเริ่มในช่วงงานก่อนหน้าด้วยคำสั่งเต็ม ไม่มี filter:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/tmp/portfolio-browser/runtime/chromium \
LD_LIBRARY_PATH=/tmp/portfolio-browser/runtime \
npm run test:e2e
```

log ที่เห็นระหว่างทำงานระบุ `Running 9 tests using 1 worker` และเคสแรก ๆ ผ่าน หลังกลับมาทำงานต่อพบ [ผลจบของ Playwright](verification/M00-playwright-last-run.json) เป็น `passed` และ `failedTests: []` เวลาแก้ไขผล 2026-10-14 21:38:43 UTC (15 ต.ค. 04:38:43 เวลาไทย)

ไฟล์ stdout ชั่วคราวใน /tmp ไม่เหลือหลังกลับมาทำงานต่อ จึงเก็บผลจบที่ยังอยู่และสรุปจาก tool output ที่ได้อ่านจริง ไม่สร้างรายละเอียดรายเคส/เวลาทั้งชุดย้อนหลังขึ้นมาเอง ผลดังกล่าวเป็นการรัน baseline งานเดียวกัน ไม่ใช่การอ้างผลจาก audit เก่า

ตัวติดตั้ง browser มาตรฐานของ Playwright ดาวน์โหลด ZIP ไม่สมบูรณ์ จึงใช้ `@sparticuz/chromium@153.0.0` ติดตั้งแยกใน /tmp และใช้ executablePath ที่ config รองรับอยู่แล้ว แตกไฟล์ runtime โดยไม่เปลี่ยนเจ้าของไฟล์หลัง helper เจอ chown EINVAL ไม่มีการแก้ package.json/package-lock หรือ config แอป การรันนี้ไม่เทียบเท่า browser matrix ครบหรือโทรศัพท์จริง

เมื่อรันใหม่บนเครื่องปกติใช้ browser ที่ Playwright ติดตั้งได้และ build ด้วย mock config ที่ตรงกัน:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key npm run build
npx playwright install chromium
npm run test:e2e
```

## สิ่งที่พบเกี่ยวกับ Supabase

- ไม่พบ `.env` ของโปรเจกต์ใน checkout หรือ database/Supabase environment variables ที่ใช้เชื่อมต่อจริง
- ไม่มี Supabase connector ที่เรียกใช้ได้ในรอบตรวจนี้ ไม่ได้ขอหรือค้นหารหัสผ่านจากตำแหน่งอื่น
- พบ migration เฉพาะ RPC `replace_portfolio_selection` ที่ต้องอาศัยตารางเดิม ไม่ใช่ schema เต็มและไม่ยืนยันว่าติดตั้งใน remote แล้ว
- ภาพ schema แนบเปิดได้ในช่วงตรวจแรก แต่มีบางส่วนถูกตัดและไม่แสดงตารางคลังที่โค้ดอ้าง ไม่เพียงพอสำหรับเขียน migration
- ยังไม่ได้อ่านแถวข้อมูลจริง นับรูปเกินเพดาน สำรอง/กู้คืนข้อมูล หรือทดสอบ RLS/Storage/Auth จริง
- mock ไม่ใช้ยืนยัน email confirmation, password recovery, RLS หรือการเข้าถึง public URL

## งานที่ส่งมอบใน checkpoint นี้

1. [SQL อ่าน metadata](../scripts/inspection/supabase-metadata.sql): อ่าน table/column/constraint/index/RLS/policies/grants/RPC/buckets คืน JSON แถวเดียว ไม่แก้ schema หรือข้อมูล
2. [วิธีส่งข้อมูลกลับ](../scripts/inspection/README.md): SQL Editor → Run → export JSON/CSV และภาพ Auth settings ที่ไม่แสดง key
3. [Fixture manifest](../tests/fixtures/acceptance-data.json): ข้อมูลสังเคราะห์สองบัญชี ชื่อซ้ำข้ามบัญชี ชุดภาพและขอบเขต PDF/อายุสำหรับ mapping หลังทราบ schema จริง
4. อัปเดต IMPLEMENTATION_PLAN ให้ตรงผล ไม่อ้าง M00 เสร็จทั้งส่วน และแก้จำนวน E2E เป็น 9

## สถานะงานย่อยและวิธีปลดอุปสรรค

| Task | สถานะหลัง checkpoint ถูก push | สิ่งที่เหลือ |
| --- | --- | --- |
| M00.01 | DONE | ตรวจ HEAD ใหม่ก่อนเริ่มรอบถัดไปตามปกติ |
| M00.02 | DONE สำหรับ baseline repository/mock ตามผลด้านบน | staging integration ยังอยู่ใน M00.03/M00.05 ไม่อ้างผ่านจาก mock |
| M00.03 | BLOCKED | ต้องได้ metadata และค่า Auth จริงตาม README |
| M00.04 | BLOCKED | หลังทราบ schema จึงจัด query นับผลกระทบและหลักฐาน backup/restore |
| M00.05 | BLOCKED (เตรียม manifest แล้ว) | ยังไม่สร้างบัญชี staging/ไฟล์ภาพจริง/seed-reset ตาม schema และตรวจ integration |

**ยังไม่เริ่ม M01 implementation:** AGENTS ข้อ 6 ให้ตรวจ schema/RLS/Storage จริงก่อน migration และ dependency ในแผนให้ M00 ผ่านก่อน ไม่ข้ามเงื่อนไขเพื่อทำเครื่องหมายว่าเสร็จ

สิ่งที่ต้องการจากเจ้าของตอนนี้คือผล metadata SQL กับภาพ Auth settings ตาม README ไม่ต้องส่ง password, connection string หรือ service_role key เมื่อได้ข้อมูลแล้วจะตรวจ M00.03 ต่อ จากนั้นเตรียมการนับผลกระทบ/สำรองและ fixtures เพื่อปิด M00 ก่อน M01

## จุดส่งต่องานครั้งถัดไป

รับไฟล์ผล SQL → ตรวจเทียบตาราง/constraint/RLS กับ caller จริง → ตรวจ Auth → จัด query นับข้อมูลเก่าที่ไม่เผยข้อมูลส่วนตัว → ตรวจ backup/restore และ staging fixtures → อัปเดต M00 เป็น DONE เฉพาะเมื่อครบ → push ก่อนเริ่ม M01

เคส 100 ข้อใน SYSTEM_TEST_PLAN ยังคง NOT_RUN สำหรับระบบเป้าหมาย ชุดทดสอบเดิมผ่านไม่ได้แปลว่าฟีเจอร์ใหม่ผ่าน โดยเฉพาะเคสเดิมที่ยังคาดหวังเพดาน PDF 10 หน้า
