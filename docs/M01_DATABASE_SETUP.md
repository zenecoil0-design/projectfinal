# เริ่มฐานข้อมูลใหม่โดยเก็บบัญชี

เจ้าของอนุญาตวันที่ 15 ตุลาคม 2026 ให้ลบข้อมูลทดลองและรูป โดยเก็บบัญชีล็อกอิน ไม่ต้องสำรองข้อมูลทดลองชุดนี้ ข้อมูล metadata/inventory/trigger functions ได้ครบสำหรับขั้นตอนนี้แล้ว

## สถานะจริง

- main รับงานเดิมที่ c1cca0a แล้ว งานใหม่อยู่ codex/portfolio-next-phase
- เจ้าของรัน reset และ migrations 202610130001/202610150001 บน Supabase แล้ว ผลตรวจ 2026-10-15 19:06 ไทยตรงค่าที่คาด
- บัญชี auth.users และ public.users รวมถึง trigger สมัคร/เปลี่ยนอีเมลจะถูกเก็บไว้
- schema, RLS, bucket และ Auth settings ไม่ถูกลบโดย reset
- เจ้าของลบรูปผ่าน Storage แล้ว ผลรายการคงเหลือ 15 เป็น .emptyFolderPlaceholder ทั้งหมด ไม่มีรายการรูปในผลที่ส่งมา

## ขั้นตอน reset รอบแรก (เจ้าของทำแล้ว ไม่ต้องรันซ้ำ)

1. ปิดเว็บแอปทุกแท็บและหยุด dev server/งานที่เขียนฐาน รวมแท็บในมือถือ เพื่อไม่ให้ autosave ส่งข้อมูลทดลองกลับมา
2. เปิด Supabase โปรเจกต์ Portfolio → SQL Editor → New query คัดลอกไฟล์ `scripts/maintenance/reset-test-data.sql` ทั้งไฟล์แล้ว Run ด้วยสิทธิ์เจ้าของ คำสั่งนี้ลบข้อมูลใน 19 ตารางแอปอย่างถาวร แต่เก็บสองตารางบัญชีไว้
3. ผล `reset_report`: portfolios/activities/certificates/educations/tags ต้องเป็น 0; public_users_kept ควรเป็น 2 ตาม inventory เดิม ส่วน auth_users_kept เป็นจำนวนบัญชีจริงที่คงอยู่ หากมี error ให้หยุดและส่งข้อความ error ไม่ต้องแก้เป็น TRUNCATE CASCADE
4. ไป Storage → portfolio-images ลบไฟล์ทดลองทั้งหมดผ่านหน้าจัดการไฟล์ รวมในโฟลเดอร์ย่อย เก็บ bucket ไว้ ไม่ลบแถวจาก storage.objects ด้วย SQL
5. เปิด SQL Editor → New query รัน `supabase/migrations/202610130001_atomic_portfolio_selection.sql` ทั้งไฟล์ เพื่อเพิ่ม RPC บันทึกการเลือกรายการที่ inventory เดิมยังไม่มี
6. เปิด query ใหม่ รัน `supabase/migrations/202610150001_portfolio_foundation.sql` ทั้งไฟล์ เพื่อแก้ ownership, constraints และ grants
7. รัน `scripts/inspection/verify-foundation.sql` ส่งผล `foundation_report` กลับมาตรวจ ค่า remaining ของข้อมูลแอปต้องเป็น 0 หลัง reset; storage_objects อาจไม่เป็น 0 หากเหลือ .emptyFolderPlaceholder ซึ่งเป็นตัวแทนโฟลเดอร์ว่าง; public_users ควรเป็น 2 และ auth_without_public_user ต้องเป็น 0; foundation ควรได้ safe_table_grants=true, rpc_installed=true, restrictive_relation_policies=3, single_section_constraints=3, section_cascade_constraints=6, title_constraints=2
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

## ผลทดสอบและขอบเขต checkpoint foundation edf2c0e

`npm test`: 10/10 ผ่าน ประกอบด้วยของเดิม 2, reset 2, foundation 6 รวมทดสอบลำดับ reset → RPC → foundation → verification และสร้างพอร์ตใหม่ด้วยบัญชีเดิม

`npm run lint`: 0 errors, 20 warnings เดิมเกี่ยวกับ img ไม่มีการแก้ frontend ใน checkpoint นี้ จึงยังไม่ใช้ผลทดสอบนี้อ้างว่า browser/Auth/Storage integration ผ่าน

ยังไม่จบ M01 ทั้งส่วน: snapshot แบบ B, revision/conflict, เพดานรูปที่บังคับในฐาน และวงจร asset/cleanup ยังเป็นงานถัดไป ไม่ได้เพิ่มเพดานรูปลงฐานก่อนแก้ caller ให้ตรงกัน รูปใน bucket ยังเป็น public ตามค่าปัจจุบัน

หลักอ้างอิง: [PostgreSQL CREATE POLICY](https://www.postgresql.org/docs/current/sql-createpolicy.html), [Supabase Storage schema](https://supabase.com/docs/guides/storage/schema/design)


## ผลตรวจเว็บจริงและช่องชื่อบนหน้าปก (2026-10-15)

เจ้าของยืนยันว่ากดบันทึกหน้าปกแล้วรีเฟรช ข้อมูลยังอยู่ เป็นหลักฐาน live save/reload ของหน้าปก ไม่ใช่ผลรับรอง autosave หรือการทดสอบแยกบัญชีครบทุกเส้นทาง

ตามคำขอเพิ่มช่องชื่อและนามสกุลในฟอร์มหน้าปก ใช้ covers.first_name/last_name เป็นข้อมูลหน้าปกโดยตรง พรีวิวทั้ง classic/modern ใช้คู่นี้; ข้อมูลส่วนตัวมีชื่อของตนเองตามเดิม Migration 202610150002 คัดลอกชื่อจาก profiles ให้ covers เดิมเฉพาะคอลัมน์ที่ยังไม่เคยตั้งค่า และไม่คืนชื่อเก่าหากผู้ใช้ล้างชื่อแล้วรัน migration ซ้ำ

ลง `supabase/migrations/202610150002_cover_names.sql` ให้โปรเจกต์ Portfolio ผ่าน Supabase connector แล้ววันที่ 2026-10-15 เวลา 23:27 ไทย ไม่ต้องรัน SQL ซ้ำ ให้ pull branch แล้วเปิดแอปใหม่ ผลตรวจจริง: name_columns=2, null_names=0, covers=1, auth_accounts=2, public_users=2, RLS=true ไม่มีการลบข้อมูล

รอบนี้ยังบันทึกหน้าปกด้วยปุ่ม ระบบ autosave ทั้ง editor อยู่ในงานถัดไป


ผลตรวจ checkpoint ช่องชื่อ: `npm test` ผ่าน 11/11, build ผ่าน, lint 0 errors/20 img warnings เดิม, E2E mock ผ่าน 10/10 รวมกรอกชื่อ → preview → save error เก็บ draft → save สำเร็จ → reload → สลับเทมเพลต → สลับพอร์ตแล้วชื่อไม่ปน ตรวจภาพ viewport 390px แล้ว

E2E รอบแรกเปิด browser ไม่ได้เพราะ executable ใน /tmp หาย; ตัวดาวน์โหลดมาตรฐานได้ ZIP ไม่ครบ จึงติดตั้ง @sparticuz/chromium@153.0.0 แยกใน /tmp และรันใหม่จนผ่านโดยไม่เปลี่ยน dependency ของแอป ผลนี้ใช้ mock Supabase ไม่ใช่ live integration ของคอลัมน์ชื่อใหม่

ตรวจ Security Advisors ก่อนและหลัง migration ตาม Supabase skill: ผลเดิมไม่เพิ่มจากการเพิ่มชื่อบนหน้าปก พบ INFO ตาราง legacy 3 ตารางและ public.users เปิด RLS ไม่มี policy (คง default deny ไว้ ไม่เปิดสิทธิ์เพื่อปิดคำเตือน), WARN RPC replace_portfolio_selection เป็น SECURITY DEFINER ที่ authenticated เรียกได้ (ตั้งใจให้เป็น API มีการตรวจเจ้าของใน body), และ WARN leaked-password protection ปิดอยู่ ยังต้องจัดการในงาน Auth/security ไม่เปลี่ยน Auth settings ใน checkpoint นี้

- [RLS ไม่มี policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
- [SECURITY DEFINER ที่ผู้ใช้เรียกได้](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
- [Leaked password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
