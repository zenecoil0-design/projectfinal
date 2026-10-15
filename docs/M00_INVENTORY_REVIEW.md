# M00 — ผลตรวจจำนวนข้อมูลและจุดพักก่อนสำรอง

หลักฐาน: inventory_report ที่เจ้าของส่งในแชต เวลา `2026-10-15T06:23:57.353062+00:00` (13:23:57 เวลาไทย) ไม่ใช่การเชื่อมฐานจริงจากเครื่องผู้พัฒนา

## สถานะ branch ตามคำสั่งใหม่

วันที่ 15 ตุลาคม 2026 เจ้าของสั่งให้นำสถานะปัจจุบันของ `codex/portfolio-system-fixes` เข้า main ก่อนเริ่มแก้/สร้างไฟล์บน branch ใหม่:

- main เดิม `a88f7043ccc9a7aa6b6e29c533a927164278a52f` เป็น ancestor ของ branch งาน ตรวจแล้วไม่มี commit แยก
- อัปเดต main แบบ fast-forward เป็น `c1cca0a4f9b4aaad6591cbf86cd46ab13159cfa6` และอ่าน remote กลับมายืนยันแล้ว
- สร้าง `codex/portfolio-next-phase` จาก commit นี้ก่อนแก้ไฟล์ในรอบปัจจุบัน
- branch เดิมเก็บไว้; งานหลังจุดนี้ขึ้น branch ใหม่เป็นช่วง ๆ ตาม workflow เดิม ยังไม่ได้รัน migration หรือยืนยัน deploy
- การนำโค้ดเข้า main ไม่ได้สร้าง backup ของ Supabase และไม่ได้ติดตั้ง RPC ที่ยังขาด

## จำนวนที่ยืนยันจากรายงาน

| กลุ่ม | จำนวน |
| --- | ---: |
| public.users | 2 |
| portfolios | 14 |
| covers / prefaces / profiles | 2 / 2 / 2 |
| คลังการศึกษา / กิจกรรม / เกียรติบัตร | 3 / 7 / 4 |
| รูปกิจกรรม / รูปเกียรติบัตร | 10 / 10 |
| relations การศึกษา / กิจกรรม / เกียรติบัตร | 5 / 5 / 5 |
| Tags | 2 |
| Storage object records ใน portfolio-images | 27 |
| legacy activities / educations / certificates | 0 / 0 / 0 |

public.users=2 ไม่ใช่ผล count auth.users และ object records=27 ยังไม่พิสูจน์ว่าไฟล์ทั้ง 27 ดาวน์โหลดได้

## ผลกระทบต่อ migration

- เกียรติบัตร **2 รายการเกิน 2 รูป** ทั้งเมื่อวัดแถวภาพและ URL ไม่ซ้ำ; สูงสุด 4 รูปต่อรายการ รายงานนี้ไม่บอกว่าแต่ละรายการมี 3 หรือ 4 รูป
- กิจกรรมไม่มีรายการเกิน 4 รูป; สูงสุด 4 รูป
- certificate legacy image_url ไม่มีข้อมูล จึงไม่พบกรณีรูปอยู่เฉพาะคอลัมน์เก่าในรอบนี้
- activity_date ยังมี 4 รายการ, organization 2, issued_date 1, issued_by 2
- ไม่พบชื่อกิจกรรม/เกียรติบัตรว่าง, พอร์ตไม่มีเจ้าของ, relation/tag เจ้าของไม่ตรง หรือ covers/prefaces/profiles ซ้ำ/ไม่มีพอร์ต
- ผลเป็นยอด ณ เวลาที่จับข้อมูล: ไม่ใช่หลักฐานว่า RLS ป้องกันการสร้างข้อมูลผิดในอนาคต และยังไม่ใช่การพิสูจน์ความสมบูรณ์ของทุก reference

แนวทางก่อนลงมือ: เก็บรูปเกินเพดานและข้อมูลช่องเก่าไว้ครบใน backup; ยังไม่ลบหรือเลือก 2 รูปแทนผู้ใช้ การปรับเพดานต้องมีทางให้เจ้าของเลือกรูปและจัดการข้อมูลเดิมอย่างชัดเจนก่อนบังคับ constraint ที่ทำให้บันทึกไม่ได้ ตาราง legacy ว่างไม่ใช่เหตุผลพอให้ drop ก่อนตรวจ caller และ backup

## Triggers

พบ 11 triggers ที่เปิดใช้งาน (`tgenabled=O`):

- auth.users: `on_auth_user_created` หลัง INSERT หรือ UPDATE OF email เรียก public.handle_new_user()
- covers/prefaces/profiles และ portfolio relations ทั้งสาม: 6 triggers เรียก public.touch_portfolio_updated_at()
- portfolios และ library ทั้งสาม: 4 triggers เรียก public.set_updated_at()

ยืนยันว่ามี signup/email-sync trigger แล้ว แต่ยังไม่เห็น function bodies จึงไม่อ้างว่า sync สำเร็จหรือสิทธิ์ function ปลอดภัย ต้องตรวจ [SQL อ่าน function definitions](../scripts/inspection/supabase-trigger-functions.sql) ก่อนออกแบบ migration ของส่วนนี้ ไม่พบ trigger จำกัดจำนวนรูปในรายการที่ส่งมา แต่ยังไม่สรุปว่าไม่มี validation ทางอื่น

## สิ่งที่ทำได้และสิ่งที่ยังค้าง

- สำรวจยอดข้อมูลจริงเสร็จแล้ว ไม่ต้องให้เจ้าของรัน inventory เดิมซ้ำทันที
- เจ้าของแจ้งว่า “น่าจะยังไม่ได้สำรองสักอัน” จึงบันทึกเป็น **ยังไม่มีหลักฐาน backup** ไม่ถือว่าตรวจ dashboard แล้วว่าไม่มี automatic backup
- จัด [คู่มือสำรองและตรวจการกู้](M00_BACKUP_GUIDE.md) แล้ว ยังไม่ได้สำรอง/ดาวน์โหลด/restore จริง
- M00.04 ยัง BLOCKED เฉพาะ backup/restore และการตัดสินใจจัดการข้อมูลเดิม; M00.05 ยังรอ staging/accounts/assets/seed-reset จริง
- ไม่ข้ามไปแก้ schema จริงจนมีสำรองและตรวจผลกระทบตาม AGENTS ข้อ 6 และแผน M00; การเตรียมเอกสาร/เครื่องมืออ่านข้อมูลยังทำต่อได้

## การตรวจใน checkpoint นี้

ตรวจ remote main/branch ใหม่ก่อนแก้ไฟล์ ตรวจความสอดคล้องสถานะ/ลิงก์และ git diff --check; SQL function inspection ตรวจด้วย catalog จำลองใน PGlite ว่าเลือกเฉพาะสามฟังก์ชันที่เป็น trigger function และคืน body/owner/security settings ได้ ไม่ใช่ผลอ่าน body จาก Supabase จริง ไม่มีโค้ดแอปหรือ dependency เปลี่ยน จึงไม่รัน build/E2E ซ้ำ
