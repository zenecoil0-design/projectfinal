# ทบทวนความปลอดภัยก่อน deploy — 6 พฤศจิกายน 2569

ขอบเขต: ปิดคำเตือน Security Advisor ที่บันทึกไว้หลังติดตั้ง Snapshot บน hosted (5 พ.ย.) และตรวจโค้ด/ migration ใน repository ที่ commit `6e9d261` **ไม่มี migration ใหม่ ไม่เปลี่ยน grant/policy และไม่แตะฐาน hosted ในรอบนี้**

แหล่งหลักฐานแยกเป็นสามระดับ:

- **ตรวจใน repository รอบนี้** — อ่านไฟล์ migration ล่าสุดและค้นโค้ด `src` (คำสั่งท้ายเอกสาร)
- **สังเกตบน hosted ก่อนหน้า** — ผล advisor และ catalog ที่บันทึกใน [release runbook](../SNAPSHOT_RELEASE_RUNBOOK.md) และบันทึกส่งต่อของแชตก่อน (เช่น จำนวนแถวตาราง legacy) รอบนี้ไม่ได้อ่านฐานซ้ำ
- **ต้องให้เจ้าของทำ** — การตั้งค่าใน Supabase Dashboard ที่โค้ดเปลี่ยนแทนไม่ได้

## ผลสรุป

| คำเตือน / ประเด็น | ผลตรวจ | การตัดสินใจ |
| --- | --- | --- |
| [0029 authenticated SECURITY DEFINER function executable](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) | นิยามล่าสุดของ SECURITY DEFINER ทุกตัวใน repository (6 RPC ใน `public` + trigger `portfolio_private.validate_library_upload`) ตั้ง `search_path = ''` และอ่าน `auth.uid()` ก่อนตรวจความเป็นเจ้าของ (`user_id`) ของพอร์ต/รายการ/Tag; EXECUTE ถอนจาก `PUBLIC`/`anon` ให้เฉพาะ `authenticated` | **ตั้งใจ** — ฟังก์ชันเหล่านี้คือเส้นทางเขียนเดียวหลังถอน INSERT/UPDATE ตรงของคลังและ relation ไม่เปลี่ยน |
| [0008 RLS enabled, no policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) ที่ 4 ตาราง | ตาม advisor คือ `public.users` และตาราง legacy `activities`/`certificates`/`educations`; ใน `src` ไม่มีการ query ตารางทั้งสี่ (บันทึกก่อนหน้าระบุตาราง legacy มี 0 แถวบน hosted) RLS ที่ไม่มี policy = ปฏิเสธทุกคำขอจาก API role | **ห้ามเพิ่ม policy** — การเพิ่มมีแต่จะเปิดสิทธิ์ `perform_portfolio_action` คัดลอก legacy rows ภายในฟังก์ชัน DEFINER ได้ตามเดิม |
| `read_portfolio_item_snapshots` | เป็น SECURITY INVOKER (อาศัย RLS ของตาราง) และตรวจเจ้าของพอร์ตซ้ำ | ไม่เปลี่ยน |
| Leaked password protection ปิดอยู่ | ตั้งค่าใน Auth ของโปรเจกต์ ไม่ใช่โค้ด | **เจ้าของทำ** — ดูหัวข้อถัดไป |
| Secret ใน frontend | `src` ไม่มี service-role/secret key; ใช้เพียง `NEXT_PUBLIC_SUPABASE_URL` และ anon/publishable key | ผ่านสำหรับ repository; ตรวจค่าบน Vercel ตาม [DEPLOYMENT.md](../../DEPLOYMENT.md) |
| Client path ที่ใช้ grant ที่ถูกถอน | ลบโค้ดทางปิด flag ที่เขียนตารางคลัง/relation/รูปตรงแล้วใน `3849f4c` ทุกการบันทึกคลังผ่าน `create/update_library_item_atomic` และเลือกเข้าพอร์ตผ่าน `replace_portfolio_selection` | ปิดความเสี่ยง “frontend ปิด flag เขียนชนสิทธิ์ที่ถูกถอน” |
| Storage | Restrictive policy ห้าม client UPDATE/DELETE ใน bucket `portfolio-images` (ติดตั้ง 5 พ.ย.) ไฟล์ที่เลิกใช้จึงค้างไว้โดยตั้งใจ | ไม่ใช่ cleanup; การลบไฟล์ต้องเป็นงานแยกที่ตรวจ reference |
| ยืนยันอีเมลตอนสมัคร | ตามคำขอช่วงทดสอบยังไม่บังคับ (AGENTS ข้อ 6) | เจ้าของตัดสินใจก่อนเปิดใช้สาธารณะ |

## สิ่งที่เจ้าของต้องทำใน Supabase Dashboard

1. **Leaked password protection:** Authentication → ตั้งค่ารหัสผ่าน (ชื่อเมนูเปลี่ยนตามรุ่น Dashboard) → เปิด “Prevent use of leaked passwords” ฟีเจอร์นี้[ใช้ได้เฉพาะ Pro Plan ขึ้นไป](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) ถ้าโปรเจกต์เป็น Free ให้ตั้งความยาวรหัสผ่านขั้นต่ำแทนและบันทึกว่าคำเตือนนี้ยังค้างโดยข้อจำกัดแผน
2. ตั้ง Site URL / Redirect URLs สำหรับโดเมน Vercel ตาม [DEPLOYMENT.md](../../DEPLOYMENT.md) (หน้า `/reset-password` ต้องอยู่ใน allow list)
3. หลังเปลี่ยนค่า ให้รัน Security Advisor ซ้ำ คาดว่าเหลือ 0029 และ 0008 ตามที่ตัดสินใจไว้ข้างบน ถ้ามีรายการใหม่ให้หยุดและส่งผลมาตรวจ ไม่ผ่อนสิทธิ์เพื่อให้คำเตือนหาย

## ยังไม่ได้ตรวจ

- ทดสอบสองบัญชีบน hosted (SNP-09/SEC) และรอบอีเมลกู้รหัสผ่านจริง — อยู่ในส่วนทดสอบฐานจริงกับเจ้าของ
- ค่า Auth/Storage/grant ปัจจุบันบน hosted หลัง 5 พ.ย. — รอบนี้ไม่ได้อ่าน catalog ซ้ำ

## คำสั่งที่ใช้ตรวจใน repository

```bash
# SECURITY DEFINER ทุกตัวใน migrations และนิยามล่าสุดของแต่ละชื่อ
rg -n -i "security definer" supabase/migrations
# ไม่มี key ลับใน frontend
rg -n "service_role|SERVICE_ROLE|sb_secret" src
# แอปไม่ query public.users หรือตาราง legacy
rg -n '\.from\(\s*"(users|activities|certificates|educations)"' src
```
