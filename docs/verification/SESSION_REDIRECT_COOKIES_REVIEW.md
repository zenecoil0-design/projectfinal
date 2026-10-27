# Session redirect cookies — 27 ตุลาคม 2026

ฐาน dbce02775ad9b2b5bc2d604efca9f06ebd46c058; branch codex/portfolio-next-phase ไม่แก้ main

พบ middleware คัดลอก cookies ไป redirect ด้วย name/value เท่านั้น ทำให้ expiration, maxAge, path, domain, secure และ sameSite ไม่ครบ แก้ให้ใช้ cookie object เดิมผ่าน helper ร่วมทั้ง login และ Dashboard redirect พร้อมคัดลอก cache-control/expires/pragma ถ้ามี ไม่เปลี่ยน getUser, route guards, schema หรือการตั้งค่า Auth จริง

ตรวจคู่มือ NextResponse ของ Next.js ที่ติดตั้ง และ https://supabase.com/docs/guides/auth/server-side/creating-a-client รวม changelog ก่อนแก้

ผลตรวจบน source สุดท้าย:
- unit session-response 2/2 ผ่าน ตรวจ cookie หลายชิ้น/attributes/cache policy และ Max-Age=0 สำหรับการลบ
- Production build ผ่าน
- Full-repo TypeScript ผ่าน
- scoped ESLint และ diff check ผ่าน
- production browser password-recovery + auth-accessibility 20/20 ผ่านในครั้งเดียว 12 วินาที ใช้ localhost mock backend

ไม่ใช่การตรวจส่งอีเมลจริงหรือ hosted session refresh; ไม่ deploy ไม่แก้ฐานหรือบัญชีจริง งาน split เนื้อหายาวและ Storage cleanup ยังไม่ปิด
