# Auto Portfolio — เว็บแอปพลิเคชันจัดทำแฟ้มสะสมผลงาน

เว็บสำหรับนักเรียนสร้างและจัดเก็บ Portfolio โดยรวบรวมประวัติการศึกษา ผลงาน/กิจกรรม และเกียรติบัตรไว้ในคลังส่วนตัว จากนั้นเลือกข้อมูลมาใช้กับ Portfolio หลายฉบับได้ ระบบใช้ **Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Zustand และ Supabase** ตาม `package.json`.

> โปรเจกต์ยังอยู่ระหว่างพัฒนาและทดสอบ ไม่ควรถือว่าฟีเจอร์ทุกส่วนผ่านการทดสอบกับฐานข้อมูลจริงแล้ว ตรวจสถานะและข้อจำกัดใน [แผนพัฒนา](docs/IMPLEMENTATION_PLAN.md) และ [รายงานการทดสอบ](docs/verification/TEST_TYPES_AND_STATUS_REVIEW.md)

## เริ่มใช้งานบนเครื่อง

ต้องมี Node.js/npm ที่รองรับ Next.js เวอร์ชันในโปรเจกต์ และมีโปรเจกต์ Supabase สำหรับการใช้งานที่ต้องเข้าสู่ระบบ/บันทึกข้อมูล

```bash
git clone https://github.com/zenecoil0-design/projectfinal.git
cd projectfinal
git switch codex/portfolio-next-phase
npm ci
```

สร้างไฟล์ `.env.local` ไว้ที่โฟลเดอร์หลัก (อย่า commit ค่า credentials):

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-publishable-or-anon-key>
```

ค่าทั้งสองถูกอ่านจาก `src/lib/supabase/client.ts`, `server.ts` และ `src/middleware.ts` และมีคำนำหน้า `NEXT_PUBLIC_` จึงไม่ใช่ตำแหน่งสำหรับใส่ **service_role key หรือข้อมูลลับของฝั่งเซิร์ฟเวอร์** ห้ามนำคีย์ลับใส่ไฟล์/โค้ดที่ส่งไปยังเบราว์เซอร์

เปิดเว็บสำหรับพัฒนา:

```bash
npm run dev
```

เปิด http://localhost:3000

## หน้าและการใช้งาน

| เส้นทาง | หน้าที่ |
| --- | --- |
| `/` | หน้าแรกและรายการ Portfolio ล่าสุด |
| `/register`, `/login` | สมัครสมาชิก / เข้าสู่ระบบ |
| `/dashboard` | รายการ Portfolio ของบัญชี |
| `/my-data` | คลังประวัติการศึกษา ผลงาน/กิจกรรม และเกียรติบัตร |
| `/editor?portfolio=<id>` | แก้ไข Portfolio ที่สร้างแล้วและดูตัวอย่าง A4 |

`/dashboard`, `/my-data` และ `/editor` เป็นเส้นทางที่ต้องเข้าสู่ระบบตาม `src/middleware.ts`. สร้าง Portfolio ผ่านปุ่มสร้างพอร์ตบนหน้าแรกหรือ Dashboard ก่อนเข้า Editor; การเปิด `/editor` โดยไม่มี `portfolio` ID ไม่ใช่เส้นทางสร้างพอร์ตใหม่

## คำสั่งตรวจและทดสอบ

```bash
npm run lint
npm test
npm run build
npx tsc --noEmit --incremental false
npm run test:e2e
```

- `npm test` ใช้ชุด unit tests ที่ `tests/*.test.ts`
- `npm run test:e2e` ใช้ Playwright กับ **mock Supabase** ใน `tests/mock-supabase.mjs` และเปิด **production server** ตาม `playwright.config.ts` จึงต้อง `npm run build` ก่อน
- หากไม่มี Chromium ที่ Playwright ใช้งานได้ ให้ติดตั้ง/กำหนด browser runner ตามสภาพแวดล้อมทดสอบก่อน ไม่ถือว่าทดสอบผ่านหากยังรันไม่ได้
- การทดสอบกับ mock ไม่เท่ากับการยืนยัน Supabase จริง, RLS, Storage, การส่งอีเมล หรือการติดตั้ง migrations

## เอกสารสำหรับพัฒนา

- [ข้อกำหนดผลิตภัณฑ์](PRD.md)
- [สถาปัตยกรรม](ARCHITECTURE.md)
- [กติกาการทำงานและข้อควรระวัง](AGENTS.md)
- [ระบบการออกแบบ](DESIGN_SYSTEM.md)
- [แผนและงานคงเหลือ](docs/IMPLEMENTATION_PLAN.md)
- [สถานะการตรวจสอบและชนิดของ Tests](docs/verification/TEST_TYPES_AND_STATUS_REVIEW.md)
- [คู่มือการตรวจ Supabase](scripts/inspection/README.md)

**การทำงานกับ Git:** ใช้ branch `codex/portfolio-next-phase` ตามกติกาปัจจุบัน ตรวจ HEAD จริงก่อนเริ่มงานใหม่ ไม่ reset/force-push และไม่ merge เข้าสู่ `main` โดยไม่ได้รับคำสั่ง การ migration หรือ reset ข้อมูลทดลองในเอกสารเก่าไม่ใช่คำสั่งให้รันซ้ำ
