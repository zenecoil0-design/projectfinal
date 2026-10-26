# สถานะอายุ M06.02 — 27 ตุลาคม 2569

สถานะรวม **PARTIAL**

- อายุอัตโนมัติ: ทำแล้ว ดู [ผลเดิม](verification/PROFILE_AGE_REVIEW.md)
- อายุกรอกเอง: โค้ดฟอร์ม/store/Preview/บันทึกและ migration สำหรับทำสำเนาพร้อมแล้ว ผ่าน unit/PGlite และ browser mock ดู [ผลตรวจล่าสุด](verification/MANUAL_AGE_REVIEW.md)
- ฐานจริง: ติดตั้ง migration อายุแล้วหลังเจ้าของอนุมัติ ตรวจ columns/constraints/RLS/สิทธิ์เรียก RPC และการคัดลอกสองคอลัมน์ผ่านแล้ว เหลือเปิด feature flag ในเครื่องเจ้าของและตรวจ save/reload/duplicate ผ่านบัญชีจริง ดู [ขั้นตอน localhost](LOCALHOST_DEMO_CHECKLIST.md)

ใช้รายการนี้ประกอบแผนรวมเฉพาะ M06.02 ไม่ปิดงานโปรไฟล์ทั้งหมวดหรือแทนผล hosted acceptance
