# M00 — ผลตรวจ metadata และ Auth

วันที่ 15 ตุลาคม 2026 • ผู้ตรวจ: ไค • เริ่มจาก branch `codex/portfolio-system-fixes` HEAD `885706c`

## ขอบเขตหลักฐาน

- เจ้าของส่ง `metadata_report` ในแชต จับข้อมูลเวลา `2026-10-15T05:52:30.850744+00:00` ครอบคลุมตาราง คอลัมน์ constraints indexes RLS policies grants bucket และ selection RPC ข้อความบางส่วนของ constraints ภายใน Storage ถูกตัด ไม่ใช้ส่วนที่ขาดมาสรุป
- อ่านภาพหน้าตั้งค่า User Signups และ URL Configuration ที่แนบในแชตได้ ไม่ต้องอาศัยไฟล์ภาพเก่าที่เปิดไม่ได้
- ตรวจ caller จริงใน repository และจำลองนโยบายบางส่วนด้วย PGlite ไม่ได้เชื่อมต่อหรือแก้ฐาน Supabase จริง ยังไม่ทราบยอดข้อมูลหรือ custom trigger bodies
- เก็บเฉพาะข้อค้นพบที่จำเป็นใน Git ไม่บันทึก dump เต็ม ข้อมูลนักเรียน หรือ credentials

## ผลตรวจและงานที่ต้องตามต่อ

| ID | พบจากหลักฐาน | ผลต่อระบบ / ขั้นถัดไป |
| --- | --- | --- |
| DB01 | `selection_rpc: []` | ไม่พบ `public.replace_portfolio_selection` ในผลสำรวจ ขณะที่ `src/lib/editor/save-selection.ts` เรียก RPC นี้และจัดการ PGRST202 ด้วยข้อความระบบยังไม่พร้อม ต้องติดตั้ง/ตรวจ migration ใน M01 และทดสอบผ่าน API จริง |
| DB02 | ALL policy ของ `portfolio_activities`, `portfolio_certificates`, `portfolio_educations` ตรวจเจ้าของ portfolio เท่านั้น | ไม่ตรวจเจ้าของ library item ที่เชื่อม จำลองกิจกรรมแล้วแทรก relation ไปยัง ID ของบัญชี B ในพอร์ต A ได้ แม้ A อ่านแถวคลังของ B ไม่ได้ ต้องปิดช่องเขียนตารางโดยตรงด้วย; เพิ่ม RPC ที่ตรวจ ownership อย่างเดียวไม่พอ (M01) |
| DB03 | bucket `portfolio-images` เป็น public; policies จำกัด path `users/{uid}/...` | การจำกัด SELECT ของ objects ไม่ทำให้ public download เป็นส่วนตัว ต้องออกแบบการเข้าถึงรูป/การเปลี่ยน URL ให้สัมพันธ์กับแอปและไฟล์เดิมก่อนเปลี่ยน bucket (M01) ยังไม่ได้ทดลองดาวน์โหลดไฟล์จริง |
| DB04 | anon/authenticated มี TRUNCATE, REFERENCES, TRIGGER บนตาราง public | ทบทวนสิทธิ์ที่เกินความจำเป็น (M01) จำลองยืนยันว่า RLS ไม่กัน TRUNCATE เมื่อ role มีสิทธิ์และมีช่องรัน SQL ไม่ใช่หลักฐานว่า anon เรียก TRUNCATE ผ่าน REST ได้ |
| DB05 | covers/prefaces/profiles ไม่มี UNIQUE(portfolio_id); portfolio_id nullable และ FK ไม่ cascade | caller ใช้ `.maybeSingle()`; ต้องนับซ้ำก่อนเพิ่ม unique และตรวจเส้นทางลบพอร์ตกับ child rows ก่อนแก้ FK (M00.04/M01/M05) ยังไม่สรุปว่ามีข้อมูลซ้ำจริง |
| DB06 | relation ไป library/portfolio และ image/tag children มี ON DELETE CASCADE | ยืนยันโครงสร้างลบ relation เมื่อ source ถูกลบแล้ว แต่ยังต้องทดสอบ UI/หลายพอร์ต/autosave และออกแบบ snapshot กับ Storage cleanup (M04) |
| DB07 | ไม่มีคอลัมน์ snapshot, source version, revision, selected images และ visibility ในตารางพอร์ต/relations ที่ส่งมา | โครงสร้างยังไม่รองรับการเก็บแบบ B ตามข้อกำหนด ต้องเพิ่ม data contract และ migration (M01/M03) |
| DB08 | certificates มีทั้ง `image_url` เก่าและตารางรูปหลายแถว; วันที่/หน่วยงานยังอยู่ | inventory นับแถวภาพและ URL ที่ไม่ซ้ำรวม legacy แยกกัน เพื่อไม่มองข้ามข้อมูลก่อนกำหนดเพดาน 2 รูป ห้ามตัดรูป/คอลัมน์เอง (M00.04/M01.03) |
| DB09 | public.users และ legacy activities/certificates/educations เปิด RLS แต่ไม่พบ policy ในรายงาน | การอ่าน/เขียนแถวของ role ทั่วไปถูกปฏิเสธตาม default-deny; ไม่ใช่ข้อสรุปว่าข้อมูลเปิดเผย ต้องตรวจ signup sync เพราะ portfolios อ้าง public.users ส่วนคลังอ้าง auth.users (M01/M11) |
| DB10 | activity image policies ไม่มี UPDATE; certificate image มี | ตรวจ caller ก่อนเพิ่ม policy; การลบแล้วเพิ่มใหม่อาจเป็น flow เดิม ต้องรองรับการเรียงรูปอย่างปลอดภัยในงานคลัง (M02) |
| DB11 | title เป็น NOT NULL แต่ไม่มี check ว่าต้องมีข้อความ; bucket limits/mime เป็น null | ค่า null ของ bucket หมายถึงไม่มีข้อจำกัดระดับ bucket ที่ระบุในรายงาน ไม่ยืนยันว่าไม่มี global limit; ยังไม่เห็น triggers จึงไม่สรุปว่าไม่มีการตรวจ server ทั้งหมด (M01/M02) |

ตาราง public ทั้ง 20 เปิด RLS และ force_rls=false การไม่ FORCE ไม่ใช่ช่องโหว่โดยตัวมันเอง: ต้องแยกเจ้าของตาราง/role ที่ bypass ออกจาก session ผู้ใช้ ส่วน policy roles `public` ไม่ได้แปลว่าอ่านข้อมูลทุกคนได้ เพราะยังต้องผ่าน predicate

## Auth จากภาพที่ส่งมา

| ค่า | สถานะที่เห็น |
| --- | --- |
| Allow new users to sign up | เปิด |
| Confirm email | ปิด — ตรงคำขอช่วงทดสอบ |
| Allow manual linking | ปิด |
| Allow anonymous sign-ins | ปิด |
| Site URL | `http://localhost:3000` |
| Redirect URLs | ไม่มีรายการ |

นี่เป็นหลักฐานค่าตั้งค่า ไม่ใช่ผลสมัคร/รับอีเมล/กู้รหัสผ่านจริง ยังไม่ได้แก้ URL หรือเปิด/ปิดตัวเลือกใด ต้องจับคู่ URL ของเว็บที่จะใช้กับ recovery flow ใน M11

## การตรวจที่ทำในรอบนี้

คำสั่ง: `node --import tsx --test tests/inspection/supabase-baseline.test.ts`

ผ่าน 3/3 กรณี: จำลอง relation ownership ที่ตรวจไม่ครบ, TRUNCATE กับ RLS, และ query inventory กับฐานว่าง/ข้อมูลซ้ำ/ภาพเกินเพดาน/legacy URL ซ้ำ/ชื่อว่าง/เจ้าของไม่ตรง ดู [ผลรัน](verification/M00-schema-probes.txt)

ชุดนี้เป็น **diagnostic ของ baseline** ไม่ใช่ target security acceptance: การ reproduce จุดอ่อนสำเร็จจึงนับว่า probe ผ่าน ห้ามใช้ผลนี้บอกว่าสิทธิ์ปลอดภัยแล้ว อยู่แยกจาก `npm test` ซึ่งใช้ชุด `tests/*.test.ts` การทดสอบเฉพาะ relation กิจกรรมเป็นฐานจำลอง ไม่มี triggers ของฐานจริง; ผลของอีกสองหมวดเป็นการตรวจ predicate จาก metadata

ไม่มีการแก้โค้ดแอปหรือ dependency จึงไม่รัน build/E2E เดิมซ้ำ ผล baseline ก่อนหน้าเก็บใน M00_BASELINE_REPORT.md

## สถานะและสิ่งที่ยังขาด

M00.03 สำรวจโครงสร้าง/ค่าตั้งค่าและบันทึกข้อจำกัดครบ; DONE หลัง checkpoint นี้ขึ้น branch แล้ว M00 ทั้งส่วนยัง BLOCKED เพราะ:

1. M00.04: รอผล `supabase-data-inventory.sql` จาก SQL Editor และสถานะ backup ฐาน/ไฟล์ รวมหลักฐาน restore ในที่แยก
2. M00.05: รอ staging ที่ใช้ทดสอบได้และบัญชี A/B/ไฟล์/seed-reset จริง; fixture manifest ที่มีอยู่ยังไม่เท่ากับสร้างข้อมูลสำเร็จ

SQL inventory เป็น SELECT คืนยอดรวมกับ trigger metadata ไม่สำรองไฟล์ ไม่พิสูจน์ว่า Storage object ดาวน์โหลดได้ และไม่แมปทุก URL ไป physical object ใช้เป็นรอบตรวจผลกระทบเบื้องต้นก่อนวางแผน backup และ cleanup เมื่อได้ trigger definition ต้องตรวจฟังก์ชันที่เกี่ยวข้องต่อก่อน migration

## เอกสารอ้างอิงที่ตรวจประกอบ

- [PostgreSQL — Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html): default-deny, table owner/bypass roles, TRUNCATE/REFERENCES และ foreign key checks ไม่ถูกกรองด้วย RLS
- [Supabase — Storage Buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals): public bucket downloads ข้ามการควบคุมสิทธิ์อ่าน ส่วนการเขียน/ลบยังตรวจสิทธิ์

ตรวจเอกสารวันที่ 15 ตุลาคม 2026; ใช้อธิบายกลไก ไม่แทนการทดสอบโปรเจกต์จริง
