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
5. ยังไม่เริ่มกรอกข้อมูลใหม่จนรัน migration และตรวจผลในขั้นถัดไปครบ

SQL ตรวจว่าชุดข้อมูลไม่โตเกิน inventory ที่ได้รับ และยกเลิก transaction หากพบ foreign key จากตารางนอกขอบเขต หาก SQL Editor ค้างใน failed transaction ให้ Run `ROLLBACK;` ก่อนรันคำสั่งอื่น

## หลักฐานทดสอบ reset

`node --import tsx --test tests/reset.test.ts` ผ่าน 2 เคส: ล้างทุกตารางแอปโดยบัญชีและ trigger sync อีเมลคงอยู่; ยกเลิกเมื่อ inventory โตหรือมี foreign key นอกขอบเขตโดยข้อมูลไม่หาย

Fixture เป็น schema จำลองเฉพาะส่วนที่ใช้ทดสอบ ไม่แทนการตรวจ Auth/Storage API บน Supabase จริง ไม่มีการนำข้อมูลหรือรหัสผ่านจริงเข้า repository
