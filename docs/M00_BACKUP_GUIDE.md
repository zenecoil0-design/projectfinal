> อัปเดต 2026-10-15: เจ้าของอนุญาตทิ้งข้อมูลทดลองและเก็บบัญชีแล้ว คู่มือนี้เป็นทางเลือกสำหรับข้อมูลที่ต้องเก็บ ไม่ใช่เงื่อนไขบังคับของ reset รอบนี้ ดู M01_DATABASE_SETUP.md

# สำรอง Supabase ก่อนแก้โครงสร้าง

สถานะ: คู่มือเตรียมการ ยังไม่ได้สำรองหรือทดสอบ restore จริง เก็บ backup ไว้ในเครื่องเจ้าของนอกโฟลเดอร์ Git ไม่ส่งไฟล์ dump/รหัสผ่านในแชต

## เริ่มจากสิ่งที่ทำได้ในหน้าเว็บ

เปิดโปรเจกต์ Portfolio → **Database → Backups** แล้วดูว่ามีรายการสำรองวันที่ใดหรือไม่มีสิทธิ์ใช้งาน ส่งภาพเฉพาะหน้านี้กลับมาได้ ไม่ต้องกด Restore หรือสมัครบริการเพิ่ม

Supabase ระบุว่า automatic daily backups มีตามแผนบริการ ส่วน Free ให้สำรองด้วย CLI จึงต้องตรวจหน้าจริงก่อนเลือกวิธี การไม่เคยสำรองเองไม่ได้ยืนยันว่าไม่มี automatic backup

**Database backup ไม่รวมตัวไฟล์ใน Storage** ต้องเก็บไฟล์แยกด้วย และ Git main เก็บเฉพาะโค้ดที่ commit ไม่ใช่ฐานข้อมูล

## หากต้อง export เองบนคอมพิวเตอร์

เตรียม Supabase CLI และ Docker Desktop ตาม [คู่มือทางการ](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) ก่อน คำสั่งต่อไปนี้ใช้ PowerShell กับ CLI ที่ติดตั้งแล้ว ยังไม่ได้ทดสอบกับเครื่องเจ้าของ

พักการเพิ่ม/แก้/ลบข้อมูลระหว่างสำรอง เพื่อให้ฐานและชุดรูปอยู่ในช่วงเดียวกัน ที่หน้า **Connect** คัดลอก Session pooler connection string ของโปรเจกต์ต้นทาง ใส่รหัสผ่านและ percent-encode อักขระพิเศษให้ถูก เก็บไว้ใช้ในเครื่องเท่านั้น

```powershell
$portfolioBackup = Join-Path $env:USERPROFILE ('portfolio-backup-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $portfolioBackup -ErrorAction Stop
Set-Location $portfolioBackup
$portfolioDbUrl = Read-Host 'Paste source database URL locally (contains password)'
try {
  supabase db dump --db-url $portfolioDbUrl -f roles.sql --role-only
  if ($LASTEXITCODE -ne 0) { throw 'roles dump failed' }
  supabase db dump --db-url $portfolioDbUrl -f schema.sql
  if ($LASTEXITCODE -ne 0) { throw 'schema dump failed' }
  supabase db dump --db-url $portfolioDbUrl -f data.sql --use-copy --data-only -x 'storage.buckets_vectors' -x 'storage.vector_indexes'
  if ($LASTEXITCODE -ne 0) { throw 'data dump failed' }
  Get-FileHash roles.sql,schema.sql,data.sql -Algorithm SHA256 | Export-Csv checksums.csv -NoTypeInformation
} finally {
  Remove-Variable portfolioDbUrl -ErrorAction SilentlyContinue
}
```

Read-Host แสดงข้อความที่ป้อนบนหน้าจอ อย่าแชร์หน้าจอขณะกรอก connection string; CLI อาจแสดงรายละเอียดใน error ให้ปิดรหัสผ่านก่อนส่ง error มา ถ้าคำสั่งล้มเหลวต้องแก้ให้ครบก่อนนับว่าสำรองแล้ว

ตรวจไฟล์มีข้อมูลและเก็บบันทึก CLI version/เวลาสำรอง พร้อมสำเนาอีกตำแหน่งที่เจ้าของควบคุม ค่า SHA256 ใช้ตรวจไฟล์ไม่เปลี่ยน ไม่ได้พิสูจน์ว่า restore ได้

## เก็บส่วนที่ dump มาตรฐานอาจไม่ครอบคลุม

CLI ข้าม schema ที่ Supabase จัดการใน schema dump จึงต้องเก็บ customizations ของ auth/storage แยกตามคู่มือ โดยเฉพาะ `on_auth_user_created` บน auth.users และ Storage policies ของโปรเจกต์นี้ ใช้ metadata ที่ส่งมาเป็นรายการตรวจ และ [SQL function inspection](../scripts/inspection/supabase-trigger-functions.sql) อ่าน body ของสามฟังก์ชัน ก่อนส่งผลให้ตรวจ ให้ดูว่า body ไม่มีข้อมูลลับฝังไว้

เก็บ Auth settings และ bucket settings ไว้ด้วย (มีภาพ/metadata แล้ว) ถ้ามี Vault/column encryption หรือ custom login roles ต้องทำขั้นตอนเพิ่มเติมในคู่มือทางการ อย่า replay DDL ของ auth/storage ทั้ง schema ลงโปรเจกต์ใหม่โดยไม่ตรวจ

## สำรองรูป

เปิด Storage → portfolio-images และดาวน์โหลดไฟล์ให้ครบทุกโฟลเดอร์ เก็บ object path เดิม เช่น users/UUID/... ไว้ในโครงสร้างโฟลเดอร์หรือ manifest คู่กับไฟล์ ไม่รวมชื่อซ้ำจากคนละโฟลเดอร์ทับกัน

ยอดอ้างอิงล่าสุดคือ **27 object records**; ตรวจจำนวนกับรายการ ณ เวลาสำรองใหม่ถ้ามีการใช้งานเพิ่ม ลองเปิดไฟล์ที่ดาวน์โหลดทั้งหมด ถ้ารายการใดดาวน์โหลดไม่ได้ให้บันทึกว่าขาด ไม่ถือว่าสำรองครบเพียงเพราะเห็น 27 records

## เกณฑ์ตรวจการกู้ในที่แยก

เตรียมโปรเจกต์ทดสอบที่เจ้าของเลือกหรือ local Supabase ก่อนทำ restore ห้ามทดลอง restore ทับต้นทาง เมื่อมีปลายทางแล้วจึงกำหนดคำสั่ง restore ตามรุ่น/ส่วนขยาย/สิทธิ์จริง

ต้องตรวจหลัง restore:

- จำนวนพอร์ต/คลัง/รูป/relations เทียบกับ inventory เวลาสำรอง รวม Auth users ที่ตรวจแยกจาก public.users
- ฟังก์ชัน triggers RLS grants และ bucket settings ครบ รวม signup/email sync
- รูปดาวน์โหลดได้ และ URL/reference ใช้ได้บนปลายทางโดยไม่แก้ URL ต้นทาง
- บัญชี A/B แยกสิทธิ์ อ่าน/บันทึก/ลบตามแผนทดสอบ ใช้ข้อมูลสังเคราะห์สำหรับเคสทำลายข้อมูล

เมื่อได้ผลจริงจึงปิด M00.04/.05 ตามขอบเขต ไม่มีคำสั่ง restore อัตโนมัติในคู่มือนี้เพราะยังไม่มีปลายทางทดสอบที่ยืนยัน

## แหล่งอ้างอิง

ตรวจ 15 ตุลาคม 2026:

- [Database Backups](https://supabase.com/docs/guides/platform/backups)
- [Backup and Restore using CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
- [CLI db dump](https://supabase.com/docs/reference/cli/supabase-db-dump)
