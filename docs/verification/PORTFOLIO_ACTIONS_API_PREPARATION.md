# เตรียม API acceptance สำหรับทำสำเนา/ลบ — 26 ต.ค. 2026

เพิ่ม runner ใช้ Docker local ชั่วคราวด้วย compose เดิมที่แก้ networking แล้ว ไม่รับ hosted URL ใช้ JWT สังเคราะห์สองบัญชี แยก project สุ่มและ cleanup เฉพาะรอบ

เตรียม 8 กลุ่ม: concurrent duplicate/replay, เนื้อหา/สีสามสี, selection order/visibility, key เดิมกับ args ใหม่, cross-owner, anon/receipt write, rollback/retry, delete replay/cascade และรักษาคลัง

ผลที่รัน: fixture+migrations PGlite และ actions tests เดิมรวม 4/4 ผ่าน; syntax/scoped lint/diff check ผ่าน; full TypeScript ผ่านก่อนเพิ่ม SQL seed ที่ไม่มี TypeScript เปลี่ยน

--check ได้ NOT_RUN เนื่องจากไม่มี Docker ใน environment นี้ ไม่อ้าง API ผ่าน ไม่มี apply migration/deploy/ลบข้อมูลจริง ยังต้องรับผล --run จากเครื่องเจ้าของ แล้วตรวจความต่าง fixture กับ hosted ก่อนเสนอ migration

ขั้นตอน: tests/integration/actions/README.md
