# ตรวจ Supabase ก่อน M01

ได้รับ `metadata_report` และภาพ Auth จากเจ้าของแล้ววันที่ 15 ตุลาคม 2026 ดู [ผลตรวจ](../../docs/M00_SCHEMA_REVIEW.md) **ไม่ต้องส่งสองส่วนนี้ซ้ำ**

## ขั้นตอนปัจจุบัน: สำรองก่อน migration

ได้รับ inventory แล้วเวลา 13:23:57 วันที่ 15 ตุลาคม 2026 (ไทย) ดู [สรุปผล](../../docs/M00_INVENTORY_REVIEW.md) **ไม่ต้องรัน query เดิมซ้ำทันที**

เปิดโปรเจกต์ Supabase → **Database → Backups** แล้วส่งภาพรายการ/สถานะเพื่อเลือกวิธีสำรองให้ตรงแผนบริการ คู่มือทั้งฐานและไฟล์อยู่ที่ [M00_BACKUP_GUIDE.md](../../docs/M00_BACKUP_GUIDE.md) ยังไม่ต้องกด Restore

ก่อน migration ต้องอ่าน body ของสามฟังก์ชันที่ trigger metadata อ้างถึงด้วย: รัน [supabase-trigger-functions.sql](supabase-trigger-functions.sql) ใน SQL Editor ได้ เป็น SELECT อ่านอย่างเดียว ตรวจผลว่าฟังก์ชันไม่มี secret ฝังไว้ก่อนส่ง ไม่ต้องส่ง dump ฐานจริงหรือ connection string

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

ต้องตรวจ backup/restore ก่อนเปลี่ยนข้อมูลจริงตามแผน M00.04 การมี migration ใน Git หรือยอด inventory ไม่ใช่ backup ของฐาน/ไฟล์ และ backup ฐานไม่ใช้แทนสำเนาไฟล์ Storage ต้องทดสอบกู้ในสภาพแวดล้อมแยกก่อนนับว่างานนี้เสร็จ

ไม่ต้องส่งรหัสผ่าน, database connection string, API key หรือ service_role key ในแชต และไม่ต้อง commit ผลฐานจริงขึ้น repository

## Fixtures และการตรวจซ้ำ

`tests/fixtures/acceptance-data.json` เป็น manifest สังเคราะห์ ยังไม่ใช่ seed ที่รันจริง อีเมล example.invalid รับเมลไม่ได้ ต้องใช้กล่องทดสอบที่ได้รับอนุญาตสำหรับ recovery ชื่อ IMG1–IMG6 ยังไม่มีไฟล์อัปโหลด ให้ seed/reset แยกเคสใน staging เท่านั้น

รัน probes ของเครื่องมือตรวจได้ด้วย:

```bash
node --import tsx --test tests/inspection/supabase-baseline.test.ts
```

probes จำลองจุดอ่อนของ baseline โดยเจตนา ไม่ใช่ acceptance ของระบบที่แก้แล้ว

ไฟล์ [supabase-metadata.sql](supabase-metadata.sql) ยังเก็บไว้ใช้สำรวจซ้ำเมื่อ schema เปลี่ยน ยังไม่จำเป็นต้องรันใหม่ในขั้นนี้
