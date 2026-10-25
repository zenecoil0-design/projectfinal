# ปิดงานข้อมูลเสริมว่างและจานสี — 26 ต.ค. 2026

ต่อจาก 24d84d4 รักษาเทมเพลตใหม่ทั้งสามแบบ

- จานสีจำ hue เมื่อสีเป็นดำ/เทา/ขาว จึงเลือกเฉดแล้วลากความสด/สว่างต่อได้
- Modern/Gallery ไม่สร้างกลุ่มติดต่อหรือที่อยู่ว่าง
- Gallery ไม่มีภาพการศึกษา/เกียรติบัตร ไม่แสดงกรอบหรือข้อความทดแทน รายการยังอยู่และใช้พื้นที่ข้อความที่ว่างเพิ่ม
- ไม่เปลี่ยน payload, schema, selection, รูปเก่าหรืออัลกอริทึมแบ่งหน้า

ตรวจ production build และ TypeScript ผ่าน Scoped lint ไม่มี errors มี img warnings เดิม 7 จุด diff check ผ่าน
Browser regression: gallery, modern, palette save/retry/session/hue และ PDF จริงจาก mobile Preview ที่ซ่อนอยู่ รายละเอียดผลจบรอบบันทึกท้ายไฟล์

ข้อมูลทดสอบเป็น mock ไม่ใช่ hosted integration หรืออุปกรณ์จริง ทำสำเนา/ลบยังไม่เปิดใช้งานจริงและยังต้องตรวจ PostgreSQL/PostgREST

ผลสุดท้าย: production browser 15/15 ผ่านในการรันเดียว (17.5s) รวม PDF จริงทั้งสามแบบ จำนวนหน้าตรง Preview และทุกหน้า A4
