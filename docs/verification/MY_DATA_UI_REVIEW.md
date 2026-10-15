# ตรวจ UI คลังข้อมูล /my-data

ฐานก่อนเริ่ม: local/remote `codex/portfolio-next-phase` ตรงกันที่ `1e43a74cca5e614f7da67527c9ed3672623c1eee`, working tree สะอาด ไม่แก้ main

## ส่วน 1 — หน้าและการศึกษา

- `src/app/my-data/page.tsx`: หัวหน้า/เมนูหมวดรองรับพื้นที่แคบ ไม่มี horizontal overflow; ปุ่มหมวดมี aria-pressed และ focus
- `src/components/my-data/EducationLibrary.tsx`: การ์ดจัดลำดับข้อความ/ข้อมูลรอง ปุ่มแยกจากชื่อยาว; label เชื่อม input, ช่องกรอก 16px บนมือถือ, สองคอลัมน์ตามพื้นที่ฟอร์ม; modal เลื่อน body และมีปุ่มท้ายฟอร์มคงที่ ปุ่มหลักชื่อบันทึก ปุ่มไอคอนมี accessible name
- เพิ่ม `tests/e2e/my-data.spec.ts` เนื่องจาก tests เดิมครอบคลุม Editor แต่ไม่มีเส้นทางคลัง CRUD
- Mock Playwright 2 tests ผ่าน: desktop 1440x1000/mobile 390x568, ข้อความ/Tags ยาว ไม่มี logo/ข้อมูลรอง, คลังว่าง, เพิ่ม/แก้ไข/โหลดกลับ, บันทึกล้มเหลวข้อมูลยังอยู่แล้วลองใหม่สำเร็จ, ยกเลิกแบบร่าง, ยกเลิกลบและเลือกภาพแล้วยกเลิก crop; ภาพหน้าจอตรวจด้วยตา
- eslint เฉพาะ 3 ไฟล์: 0 errors, warning img เดิม 2; git diff --check ผ่าน
- dev server Turbopack cache เริ่มไม่ได้หนึ่งรอบ ใช้ --webpack ใน config ชั่วคราวนอก repo แล้วผ่าน ไม่แก้ configuration โปรเจกต์

## ข้อจำกัด/logic เดิมที่พบ (ไม่แก้ในงาน UI)

- ฟอร์มคลังปิดผ่าน resetForm โดยตรง และหน้าเปลี่ยนหมวดผ่าน setActiveTab: ไม่มี dirty-state warning เดิมให้รักษา การทดสอบยืนยันเพียงยกเลิก/เปิดใหม่ตามพฤติกรรมปัจจุบัน ไม่ถือว่าคำเตือนข้อมูลค้างผ่าน
- การศึกษาไม่มี loadError state: loadData log error แล้วใช้ข้อมูล fallback; ไม่สามารถแยกโหลดล้มเหลวจากคลังว่างด้วย JSX อย่างเดียวโดยไม่เปลี่ยน logic จึงไม่สร้างสถานะใหม่มาปิดบัง
- บันทึกล้มเหลวใช้ alert เดิม สำเร็จโหลดรายการและปิดฟอร์ม ไม่มี success banner; ไม่เพิ่มข้อความสำเร็จปลอม
- คงคำยืนยันลบเดิมและ handlers เดิม ไม่ทดสอบลบข้อมูลจริง/Storage และไม่รับรองผลกระทบการลบทุกพอร์ตจากงานนี้
- ปัญหา Tags loadError ใน Editor ที่ส่งต่อมาอยู่นอกขอบเขต ไม่แก้ Editor

การตรวจทั้งหมดข้างต้นเป็น mock ใน Chromium บนเครื่องทดสอบ ไม่ใช่ Supabase จริงหรือโทรศัพท์จริง ไม่รัน migration/reset/ฐานข้อมูลทั้งชุด
