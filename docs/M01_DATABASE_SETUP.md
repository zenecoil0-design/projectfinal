# เริ่มฐานข้อมูลใหม่โดยเก็บบัญชี

เจ้าของอนุญาตวันที่ 15 ตุลาคม 2026 ให้ลบข้อมูลทดลองและรูป โดยเก็บบัญชีล็อกอิน ไม่ต้องสำรองข้อมูลทดลองชุดนี้ ข้อมูล metadata/inventory/trigger functions ได้ครบสำหรับขั้นตอนนี้แล้ว

## สถานะจริง

- main รับงานเดิมที่ c1cca0a แล้ว งานใหม่อยู่ codex/portfolio-next-phase
- ชุด reset พร้อมและทดสอบใน PostgreSQL จำลองด้วย PGlite; ยังไม่ได้รันบน Supabase จริง
- บัญชี auth.users และ public.users รวมถึง trigger สมัคร/เปลี่ยนอีเมลจะถูกเก็บไว้
- schema, RLS, bucket และ Auth settings ไม่ถูกลบโดย reset
- รูปใน Storage ไม่ถูกลบด้วย SQL ต้องใช้ Storage UI/API

## ขั้นตอนของเจ้าของโปรเจกต์

1. ปิดเว็บแอปทุกแท็บและหยุด dev server/งานที่เขียนฐาน รวมแท็บในมือถือ เพื่อไม่ให้ autosave ส่งข้อมูลทดลองกลับมา
2. เปิด Supabase โปรเจกต์ Portfolio → SQL Editor → New query คัดลอกไฟล์ `scripts/maintenance/reset-test-data.sql` ทั้งไฟล์แล้ว Run ด้วยสิทธิ์เจ้าของ คำสั่งนี้ลบข้อมูลใน 19 ตารางแอปอย่างถาวร แต่เก็บสองตารางบัญชีไว้
3. ผล `reset_report`: portfolios/activities/certificates/educations/tags ต้องเป็น 0; public_users_kept ควรเป็น 2 ตาม inventory เดิม ส่วน auth_users_kept เป็นจำนวนบัญชีจริงที่คงอยู่ หากมี error ให้หยุดและส่งข้อความ error ไม่ต้องแก้เป็น TRUNCATE CASCADE
4. ไป Storage → portfolio-images ลบไฟล์ทดลองทั้งหมดผ่านหน้าจัดการไฟล์ รวมในโฟลเดอร์ย่อย เก็บ bucket ไว้ ไม่ลบแถวจาก storage.objects ด้วย SQL
5. เปิด SQL Editor → New query รัน `supabase/migrations/202610130001_atomic_portfolio_selection.sql` ทั้งไฟล์ เพื่อเพิ่ม RPC บันทึกการเลือกรายการที่ inventory เดิมยังไม่มี
6. เปิด query ใหม่ รัน `supabase/migrations/202610150001_portfolio_foundation.sql` ทั้งไฟล์ เพื่อแก้ ownership, constraints และ grants
7. รัน `scripts/inspection/verify-foundation.sql` ส่งผล `foundation_report` กลับมาตรวจ ค่า remaining ทั้งหมดต้องเป็น 0 หลังลบรูป; public_users ควรเป็น 2 และ auth_without_public_user ต้องเป็น 0; foundation ควรได้ safe_table_grants=true, rpc_installed=true, restrictive_relation_policies=3, single_section_constraints=3, section_cascade_constraints=6, title_constraints=2
8. เปิดแอปด้วยบัญชีเดิม ตรวจล็อกอินและสร้างพอร์ต/บันทึกปกได้ ยังไม่ใช้ข้อมูลจริงจนจบงานพัฒนาและตรวจ integration

SQL ตรวจว่าชุดข้อมูลไม่โตเกิน inventory ที่ได้รับ และยกเลิก transaction หากพบ foreign key จากตารางนอกขอบเขต หาก SQL Editor ค้างใน failed transaction ให้ Run `ROLLBACK;` ก่อนรันคำสั่งอื่น

## หลักฐานทดสอบ reset

`node --import tsx --test tests/reset.test.ts` ผ่าน 2 เคส: ล้างทุกตารางแอปโดยบัญชีและ trigger sync อีเมลคงอยู่; ยกเลิกเมื่อ inventory โตหรือมี foreign key นอกขอบเขตโดยข้อมูลไม่หาย

Fixture เป็น schema จำลองเฉพาะส่วนที่ใช้ทดสอบ ไม่แทนการตรวจ Auth/Storage API บน Supabase จริง ไม่มีการนำข้อมูลหรือรหัสผ่านจริงเข้า repository


## Migration พื้นฐานรอบแรก

- เพิ่ม restrictive policy ให้ relations ทั้งสามตรวจเจ้าของทั้งพอร์ตและรายการในคลัง จึงไม่ถูก policy ALL เดิมที่ใช้ OR ข้ามเงื่อนไข
- บังคับพอร์ตมีเจ้าของ และปก/ประวัติ/คำนำมี portfolio_id ที่ไม่ว่างและไม่ซ้ำ
- เปลี่ยน FK ส่วนประกอบ 6 ตารางเป็น ON DELETE CASCADE; ลบพอร์ตไม่ลบคลัง
- ปฏิเสธชื่อกิจกรรม/เกียรติบัตรที่เป็นข้อความว่างหรือ whitespace ล้วน
- เพิ่ม UPDATE policy รูปกิจกรรมของตนเอง เพื่อให้เรียงรูปได้และย้ายไปข้อมูลคนอื่นไม่ได้
- ถอนสิทธิ์ anon ของ 20 ตารางแอป และถอน TRUNCATE/REFERENCES/TRIGGER ของ authenticated โดยไม่แก้ Storage/Auth grants
- กำหนด search_path ว่างให้ trigger functions เดิมสามตัว และถอนสิทธิ์เรียกโดยตรง ตัว trigger ยังทำงานตามเดิม
- เพิ่มดัชนีเจ้าของและ FK ที่ใช้ค้น/ลบตาม source

การรัน migration ไม่ลบแถวและไม่แก้ไฟล์ Storage หากพบข้อมูลขัดกับ constraint หรือความเป็นเจ้าของ จะ rollback ทั้ง migration ไม่แก้ข้อมูลให้เงียบ ๆ รันซ้ำได้บน schema ที่ได้รับและเปลี่ยนแล้วโดย migration นี้

## ผลทดสอบและขอบเขต

`npm test`: 10/10 ผ่าน ประกอบด้วยของเดิม 2, reset 2, foundation 6 รวมทดสอบลำดับ reset → RPC → foundation → verification และสร้างพอร์ตใหม่ด้วยบัญชีเดิม

`npm run lint`: 0 errors, 20 warnings เดิมเกี่ยวกับ img ไม่มีการแก้ frontend ใน checkpoint นี้ จึงยังไม่ใช้ผลทดสอบนี้อ้างว่า browser/Auth/Storage integration ผ่าน

ยังไม่จบ M01 ทั้งส่วน: snapshot แบบ B, revision/conflict, เพดานรูปที่บังคับในฐาน และวงจร asset/cleanup ยังเป็นงานถัดไป ไม่ได้เพิ่มเพดานรูปลงฐานก่อนแก้ caller ให้ตรงกัน รูปใน bucket ยังเป็น public ตามค่าปัจจุบัน

หลักอ้างอิง: [PostgreSQL CREATE POLICY](https://www.postgresql.org/docs/current/sql-createpolicy.html), [Supabase Storage schema](https://supabase.com/docs/guides/storage/schema/design)
