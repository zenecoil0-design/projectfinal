# ตรวจ Supabase ก่อน M01

> Section Visibility รอบ 20 ต.ค.: ใช้ [read-only preflight](section-visibility-preflight.sql) และ [runner](section-visibility-preflight.mjs) ตาม [integration readiness](../../docs/verification/SECTION_VISIBILITY_INTEGRATION_READINESS.md) เท่านั้น งานนี้ไม่อนุญาตรัน foundation/cover/reset หรือ apply migration บน hosted project ข้อความ M01 ด้านล่างเป็นประวัติขั้นตอนเดิม ไม่ใช่คำอนุญาตรอบใหม่

ได้รับ `metadata_report` และภาพ Auth จากเจ้าของแล้ววันที่ 15 ตุลาคม 2026 ดู [ผลตรวจ](../../docs/M00_SCHEMA_REVIEW.md) **ไม่ต้องส่งสองส่วนนี้ซ้ำ**

## ขั้นตอนปัจจุบัน

รับ metadata, inventory, ภาพ Auth/Backups และ body ของ trigger functions ทั้งสามครบแล้ว ไม่ต้องส่งซ้ำ เจ้าของอนุญาตลบข้อมูลทดลองโดยเก็บบัญชีล็อกอินวันที่ 2026-10-15

ขั้นตอน reset และฐานข้อมูลอยู่ที่ [M01_DATABASE_SETUP.md](../../docs/M01_DATABASE_SETUP.md) ยังไม่มีการเชื่อมต่อเพื่อรันกับ Supabase จริงจาก checkout นี้

## เมื่อต้องนับใหม่ภายหลัง

คัดลอก [supabase-data-inventory.sql](supabase-data-inventory.sql) ไป SQL Editor → New query → Run ด้วยบัญชีเจ้าของ จะได้ `inventory_report` เป็นยอดรวมกับ trigger metadata ไม่แก้/ลบข้อมูล และไม่ถือเป็น backup การรันด้วยสิทธิ์เจ้าของไม่แทนการทดสอบ RLS ด้วย session ผู้ใช้

## สิ่งที่ query ตรวจ

- จำนวนรายการ พอร์ต relations รูป และ Storage object records ใน bucket ที่แอปใช้
- เกียรติบัตรเกิน 2 แถวภาพ และเกิน 2 URL ที่ไม่ซ้ำเมื่อรวม image_url เดิม; กิจกรรมเกิน 4 แถวภาพ
- วันที่/หน่วยงานที่ยังมีข้อมูล ชื่อว่าง และ relation/tag ที่เจ้าของไม่ตรงกัน
- covers/prefaces/profiles ที่ซ้ำในพอร์ตเดียวหรือไม่มี portfolio_id
- ชื่อ/definition ของ triggers ใน public และ auth.users (ไม่ดึง function bodies)

URL ที่ต่างกันแต่ชี้ภาพเดียวกันยังนับต่าง; จำนวน objects เป็น metadata ไม่ใช่การตรวจว่าไฟล์จริงยังอยู่ ไม่ใช้ query นี้ตัดสินลบไฟล์อัตโนมัติ

## สำรองและ staging

สำหรับข้อมูลในอนาคตที่ต้องเก็บ ให้ตรวจ backup/restore ก่อนเปลี่ยนข้อมูลจริงตามแผน M00.04 การมี migration ใน Git หรือยอด inventory ไม่ใช่ backup ของฐาน/ไฟล์ และ backup ฐานไม่ใช้แทนสำเนาไฟล์ Storage ต้องทดสอบกู้ในสภาพแวดล้อมแยกก่อนนับว่างานนี้เสร็จ

ไม่ต้องส่งรหัสผ่าน, database connection string, API key หรือ service_role key ในแชต และไม่ต้อง commit ผลฐานจริงขึ้น repository

## Fixtures และการตรวจซ้ำ

`tests/fixtures/acceptance-data.json` เป็น manifest สังเคราะห์ ยังไม่ใช่ seed ที่รันจริง อีเมล example.invalid รับเมลไม่ได้ ต้องใช้กล่องทดสอบที่ได้รับอนุญาตสำหรับ recovery ชื่อ IMG1–IMG6 ยังไม่มีไฟล์อัปโหลด ให้ seed/reset แยกเคสใน staging เท่านั้น

รัน probes ของเครื่องมือตรวจได้ด้วย:

```bash
node --import tsx --test tests/inspection/supabase-baseline.test.ts
```

probes จำลองจุดอ่อนของ baseline โดยเจตนา ไม่ใช่ acceptance ของระบบที่แก้แล้ว

ไฟล์ [supabase-metadata.sql](supabase-metadata.sql) ยังเก็บไว้ใช้สำรวจซ้ำเมื่อ schema เปลี่ยน ยังไม่จำเป็นต้องรันใหม่ในขั้นนี้
