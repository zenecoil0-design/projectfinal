# /my-data: load failures และ unsaved drafts

เริ่มจาก local/remote `14530925400fd65efb2620bdf0e49933319f1ec6` บน `codex/portfolio-next-phase`, working tree สะอาด อ่าน AGENTS/PRD/ARCHITECTURE/DESIGN_SYSTEM และคู่มือ Link ของ Next ที่ติดตั้ง ใช้ repository ปัจจุบัน ไม่ใช้ไฟล์แนบเก่าทับ ไม่แก้ main

## ส่วน 1 — โหลดและ retry

สาเหตุเดิม: loader ใช้ `data ?? []` หลัง error ทั้งรายการหลัก/Tags/ความสัมพันธ์ ทำให้ error กลายเป็น empty และอาจเปิดให้บันทึก Tag selection ว่าง

- เพิ่ม `useLibraryLoad.ts`: แยก loading/loaded/loadError/tagsError, deduplicate คำขอที่ยังไม่เสร็จ และเพิกเฉยผลคำขอเก่าหลัง unmount หรือ supersede
- เพิ่ม `LibraryLoadStatus.tsx`: ข้อความทั่วไป ไม่มีรายละเอียดฐานข้อมูล ปุ่มลองใหม่โหลดทั้งข้อมูลของหมวด (รวมส่วนที่ล้มเหลว) ไม่ reload หน้า
- EducationLibrary/ActivityLibrary/CertificateLibrary ไม่ publish ข้อมูลทดแทนเมื่อ load error และเก็บรายการก่อนหน้าหาก refresh ล้มเหลว พร้อมข้อความข้อมูลเก่า; รูปโหลดไม่ครบถือว่ารายการยังไม่พร้อม ไม่แทนด้วยชุดรูปว่าง
- Tags และความสัมพันธ์ต้องสำเร็จทั้งคู่ก่อน publish; ถ้าล้มเหลวยังดูรายการหลักได้ แต่ไม่อ้างว่าไม่มี Tags และปิดแก้ไข/บันทึก/สร้าง Tag ชั่วคราว รวม guard ใน handlers
- retry ไม่ reset ฟอร์ม, selected Tags หรือภาพ; ไม่เปิดแก้ไขรายการที่ไม่ทราบ Tags จนโหลดครบ
- หน้า /my-data ส่ง owner ที่ตรวจด้วย getUser ให้คลังและ remount ตามบัญชี; auth events ใช้เพียง invalidate UI และตรวจ getUser ใหม่เมื่อบัญชีเปลี่ยน ไม่เปลี่ยน auth policies/ขั้นตอน login; event ของบัญชีเดิมไม่ล้างฟอร์ม

ผลตรวจส่วน 1: mock Playwright ครบ 24 tests ผ่าน (56.2s) ที่ 1440px/390px ครอบคลุม load error ไม่เป็น empty, retry/dedup, Tags และความสัมพันธ์ล้มเหลวไม่เขียนทับ, retry รักษา draft/Tags เดิม, stale refresh รักษารายการ, ผลล่าช้าหลังเปลี่ยนหมวด/บัญชี และเส้นทาง CRUD เดิม; eslint เฉพาะไฟล์ที่แก้ 0 errors/6 warning img เดิม, git diff --check ผ่าน

หลังทำให้การปล่อย pending request รองรับ synchronous exception ด้วย ตรวจ load/retry/Tags ที่เกี่ยวข้องอีก 9 tests ผ่าน (25.9s)

## ข้อจำกัด/งานเดิมนอกขอบเขต

- เกียรติบัตรยังเป็น 4 รูปในโค้ดเดิม เป้าหมาย 2 รูปเป็นงานแยก ไม่เปลี่ยนเพดาน/validation หรือรูปเก่า
- ปัญหา Tags loadError ใน Editor อยู่นอกขอบเขต ไม่แก้ Editor
- `npx tsc --noEmit` ทั้ง repo พบ TS2571 ในไฟล์ทดสอบที่ไม่ได้แก้ 9 จุด: cover-names.test.ts (2), foundation.test.ts (4), inspection/supabase-baseline.test.ts (1), reset.test.ts (2); ไม่แก้เพื่อกลบผลตรวจ และไม่รันฐานข้อมูลทั้งชุด

การทดสอบรอบนี้ใช้ mock เท่านั้น ไม่ใช่ Supabase/Storage จริง ไม่รัน migration/reset และไม่ทดสอบลบข้อมูลจริง
