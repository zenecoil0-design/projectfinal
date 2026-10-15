# ตรวจ Supabase ก่อน M01

ได้รับ `metadata_report` และภาพ Auth จากเจ้าของแล้ววันที่ 15 ตุลาคม 2026 ดู [ผลตรวจ](../../docs/M00_SCHEMA_REVIEW.md) **ไม่ต้องส่งสองส่วนนี้ซ้ำ**

## ขั้นตอนถัดไป: นับข้อมูลเดิม

1. เปิดโปรเจกต์ Supabase → **SQL Editor → New query**
2. คัดลอก [supabase-data-inventory.sql](supabase-data-inventory.sql) ทั้งไฟล์แล้ว Run ด้วยบัญชีเจ้าของโปรเจกต์
3. ส่งผลแถวเดียวชื่อ `inventory_report` กลับในแชต จะคัดลอก JSON หรือ export CSV ก็ได้
4. แจ้งว่ามี backup ฐานข้อมูล/ไฟล์ Storage และโปรเจกต์ staging แยกไว้หรือยัง หากไม่มีก็บอกว่า “ยังไม่มี” เพื่อจัดขั้นตอนต่อให้ตรงสภาพจริง

SQL นี้อ่านอย่างเดียว ไม่แก้ตาราง ไม่ลบข้อมูล คืนเฉพาะยอดรวมและ metadata ของ triggers ไม่ส่งชื่อ/อีเมล/เนื้อหานักเรียนหรือ URL รูป แต่ควรตรวจ trigger definitions ก่อนส่งเพราะ trigger ที่เขียนเองอาจมี arguments ที่ไม่ควรเผยแพร่ ถ้า error ให้ส่งข้อความ error ไม่ต้องแก้ฐานเพื่อให้ query ผ่าน

ผ่านการทดสอบบน PGlite ด้วยข้อมูลจำลองแล้ว ยังไม่ได้รันบนฐานจริง การรันใน SQL Editor สิทธิ์เจ้าของใช้ดูยอดรวม ไม่พิสูจน์ว่า RLS ของ session ผู้ใช้ทำงานถูกต้อง

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
