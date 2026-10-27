# ตรวจรับเส้นทางหลัก localhost — 27 ตุลาคม 2026

ฐาน: `b3f8916808aace3be7532777dcfc7bef2e74b0fb` บน `codex/portfolio-next-phase` งานรอบนี้ไม่เปลี่ยน application source หรือฐานข้อมูล และไม่อัปเดต main

## ผลตรวจรอบนี้

- Production build: `npm run build -- --webpack` ผ่าน โดยใช้ localhost mock URL และเปิด flags PORTFOLIO_ACTIONS / MANUAL_AGE
- Full-repository TypeScript: `node_modules/.bin/tsc --noEmit --incremental false` ผ่านทั้งก่อนและหลังปรับ test
- Unit/PGlite: age, manual-age, page-numbers, pdf-result ผ่าน 12/12 ไม่มี skip
- Production browser: Dashboard load 15, manual age 5, palette 6, password recovery 18, portfolio actions 7, create 29, rename 20 รวม 100 กรณี รอบเต็มผ่าน 99 และไม่ผ่าน 1 ใช้เวลาประมาณ 2 นาที
- หลังแก้กรณี Dashboard retry: focused rerun ผ่าน 1/1 ใน 4.5 วินาที ไม่ใช่ผล 100/100 จากการรันครั้งเดียว
- focused rerun ก่อนรอบผ่านเปิด Chromium ไม่สำเร็จ (SIGSEGV ก่อนเริ่ม assertions) บันทึกเป็น runtime failure ไม่ใช่ผลผ่าน
- Scoped ESLint ของ test ที่แก้ และ git diff --check ผ่าน
- Palette tests สร้าง PDF จริงจาก Preview ซ่อนบนมือถือครบสามเทมเพลต ตรวจจำนวนหน้า/A4 ด้วยเครื่องมืออ่าน PDF ไม่ใช่หลักฐานภาพทุกหน้า/โทรศัพท์จริงหรือ hosted backend

คำสั่ง browser ชุดรวม:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chromium node_modules/.bin/playwright test tests/e2e/portfolio-create.spec.ts tests/e2e/dashboard-load.spec.ts tests/e2e/portfolio-rename.spec.ts tests/e2e/portfolio-actions-connected.spec.ts tests/e2e/password-recovery.spec.ts tests/e2e/manual-age.spec.ts tests/e2e/palette-save.spec.ts --reporter=line
```

## ข้อผิดพลาดและการแก้

`retry deduplicates before React commit...` ดัก GET portfolios กว้างเกินไป จึงดักคำขออ่านพอร์ตเดียวของ Editor หลังสร้างพอร์ตด้วย เมื่อจบ test ระหว่าง route.fetch/fulfill เกิด `Fetch response has been disposed` เพิ่มเงื่อนไขปล่อยคำขอที่มีตัวกรอง id ผ่านไปตามปกติ ตัวดักยังตรวจ owner ของ Dashboard และ assertions เดิมเรื่อง duplicate retry/draft/template/payload/navigation อยู่ครบ ไม่เพิ่ม timeout หรือ skip และไม่เปลี่ยนแอปเพื่อให้ test ผ่าน

แก้ AGENTS ให้ตรงกับสีพอร์ตสามสีที่เจ้าของยืนยัน และบันทึก checkpoint ที่เจ้าของอนุญาตให้นำงานสะสมเข้า main รอบก่อน งานต่อจาก checkpoint ยังต้องอยู่ codex ไม่ merge อัตโนมัติ

## สถานะที่ยังไม่ปิด

หลักฐานรอบนี้เป็น production Next.js + mock backend และ PGlite ไม่ได้รัน Docker/PostgREST ใหม่ ไม่ใช่การตรวจบัญชี/ข้อมูลจริงบนเครื่องเจ้าของ ไม่ได้ติดตั้ง migration หรือ deploy

- เนื้อหา/การ์ดที่ยาวเกินหนึ่งหน้ายังใช้ overflow guard; การแบ่งเนื้อหาข้ามหน้ายังไม่เสร็จ
- การลบไฟล์ Storage ที่หมด reference อย่างปลอดภัยยังไม่เสร็จ ไม่ลบไฟล์จริงจากรอบตรวจนี้
- การรับอีเมลกู้รหัสจริงและใช้รหัสใหม่ login ต้องตรวจกับบัญชีที่ได้รับอนุญาต
- การสาธิตครบขั้นบนเครื่องเจ้าของ/อุปกรณ์จริงยังต้องซ้อมตาม [checklist](../LOCALHOST_DEMO_CHECKLIST.md)
- Autosave, รูปย่อยรายพอร์ต, snapshot/version เป็น DEFERRED ตามขอบเขตเดิม

จึงปิดได้เฉพาะรอบตรวจเส้นทางหลักและแก้ test นี้ ไม่ประกาศว่าโปรเจกต์ทั้งหมดเสร็จ 100%
