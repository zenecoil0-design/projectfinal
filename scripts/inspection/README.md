# ตรวจ Supabase ก่อน M01

ไฟล์ `supabase-metadata.sql` เป็น SELECT แบบอ่านอย่างเดียว ไม่ใช่ migration ไม่แก้ตาราง/ข้อมูล และไม่อ่านแถวประวัตินักเรียนหรือ auth.users

## ส่งข้อมูลโครงสร้างให้ตรวจ

1. เปิดโปรเจกต์ Supabase ที่เว็บนี้ใช้ → SQL Editor → New query
2. คัดลอกไฟล์ [supabase-metadata.sql](supabase-metadata.sql) ทั้งไฟล์แล้ว Run ด้วยบัญชีเจ้าของโปรเจกต์
3. ผลเป็นแถวเดียวชื่อ `metadata_report` ให้คัดลอก JSON หรือ export CSV แล้วแนบกลับในแชต
4. แนบภาพการตั้งค่า Auth เรื่อง **Confirm email** และ URL Configuration (Site URL/Redirect URLs) โดยปิดข้อมูลลับ

ไม่ต้องส่งรหัสผ่าน, database connection string, API key หรือ service_role key ผล SQL เป็น metadata ของ public/storage และตัว RPC selection เท่านั้น ยังควรตรวจว่าค่า default หรือ policy ที่โครงการเขียนเองไม่มีข้อมูลลับก่อนส่ง ไม่ต้อง commit ผลจากฐานจริงขึ้น repository

ถ้า query error ให้ส่งข้อความ error แทนการแก้ฐานข้อมูลเพื่อให้ query ผ่าน ชุดนี้ตรวจ syntax ด้วย PGlite บน catalog จำลองแล้ว แต่ยังไม่ได้รันกับ Supabase ของโครงการจริง

## สิ่งที่ยังต้องตรวจหลังได้รับ metadata

- จำนวนรายการ/รูปและเกียรติบัตรที่เกิน 2 รูป; ตรวจ schema ก่อนเขียน query นับจริง ไม่ส่งเนื้อหาส่วนตัวเมื่อใช้เพียงจำนวนได้
- คอลัมน์วันที่/หน่วยงานที่ยังมีข้อมูลและ relation ที่อ้างอิงอยู่
- การสำรองฐานข้อมูลและ Storage ที่มีอยู่ พร้อมหลักฐาน restore ในสภาพแวดล้อมแยก การมี migration ใน Git ไม่ใช่ backup ของข้อมูล/ไฟล์
- นโยบาย read/write รูปและ reference ที่ยังใช้ ก่อนกำหนด cleanup
- สร้างบัญชีทดสอบ A/B ใน staging และตรวจ RLS ด้วย session จริง SQL Editor ในสิทธิ์เจ้าของไม่พิสูจน์ว่า RLS ป้องกันผู้ใช้ทั่วไปแล้ว

## Fixtures

`tests/fixtures/acceptance-data.json` เป็น manifest ข้อมูลสังเคราะห์สำหรับเตรียม acceptance test ไม่ใช่ schema ฐานข้อมูลหรือ seed ที่พร้อมรัน อีเมล example.invalid รับอีเมลไม่ได้ จึงต้องแทนด้วยกล่องทดสอบที่ได้รับอนุญาตสำหรับเคสกู้รหัสผ่าน

ชื่อ IMG1–IMG6 ยังเป็นรายการภาพที่ต้องสร้าง ไม่อ้างว่ามีไฟล์อัปโหลดแล้ว ให้สร้าง fixture ใหม่ต่อเคสลบ/แก้ และทำ mapping ไป schema จริงหลัง M00.03 ห้าม seed ลง production โดยตรง
