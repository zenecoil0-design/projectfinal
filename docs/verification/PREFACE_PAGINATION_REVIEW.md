# คำนำหลายหน้า — 27 ตุลาคม 2026

ฐาน 64c98b20ab70201fe131ae93073fca0a081cb6e8; branch codex/portfolio-next-phase ไม่แก้ main

วัดคำนำด้วย DOM ที่ใช้ CSS/สี/ความกว้าง A4 เดียวกัน ใน portal นอก Preview เพื่อรองรับมือถือซ่อน Preview หัก padding แนวตั้งก่อนแบ่งข้อความ ระหว่าง export ใช้ measurement callback เดิมหลัง fonts พร้อม เก็บทุก grapheme รวมวรรณยุกต์/emoji/ช่องว่างโดยไม่แก้ store หรือ payload ลงชื่อเฉพาะหน้าสุดท้าย (สำรองพื้นที่ลงชื่อทุกหน้าเพื่อใช้เกณฑ์เดียวกัน) หน้าคำนำทั้งหมดไม่มีเลขเนื้อหา

ผลรอบสุดท้าย:
- production build และ full-repo TypeScript ผ่าน
- unit split-text และ page numbers 5/5 ผ่าน
- scoped lint และ diff check ผ่าน
- production browser คำนำ 3 + palette 6 = 9/9 ผ่านครั้งเดียว 23.8 วินาที
- คำนำ 65 ย่อหน้าครบสามเทมเพลต ส่งออก PDF จริงจาก mobile 390px ซ่อน Preview จำนวนหน้าตรง Preview และทุกหน้า A4
- assertions รวมข้อความทุกหน้าตรงต้นฉบับ และแก้กลับสั้นแล้วเหลือหน้าเดียว
- เปิดภาพ PDF หน้า 2 ของ Modern: ไทยไม่ทับขอบ รูปแบบเดิมอยู่ครบ; emoji ใน runtime นี้แสดงกล่องแทนอักขระ จึงไม่รับรอง emoji glyph ใน PDF แม้ข้อมูลต้นฉบับยังครบ

ก่อนหน้าทำ implementation ในพื้นที่ชั่วคราวที่หายไป ไม่ใช้ผลรอบนั้นอ้างเป็นผลผ่านสุดท้าย กู้จาก remote แล้วสร้างใหม่พร้อมแก้การหัก padding ของ Modern ก่อน build/test รอบนี้

ข้อจำกัด: แบ่งที่ขอบ grapheme ไม่ใช่ระบบจัดวรรคเชิงบรรณาธิการ การสำรองพื้นที่ลายเซ็นอาจเหลือพื้นที่ว่างบนหน้าก่อนสุดท้าย ชื่อผู้จัดทำยาวเกินพื้นที่ยังถูก overflow guard บล็อก การ์ดยาวของหมวดอื่น/Profile ยังไม่แก้ ไม่ประกาศว่าระบบ split ทั้งหมดเสร็จ ไม่เปลี่ยน renderer/schema/Storage และ backend tests ใช้ mock
