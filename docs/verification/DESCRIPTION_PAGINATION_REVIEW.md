# รายละเอียดกิจกรรม/เกียรติบัตรหลายหน้า — 27 ตุลาคม 2026

ฐาน f6aecfeb332d929dddcefecbd0e2ca21db514a3e; ส่งเฉพาะ codex/portfolio-next-phase ไม่แก้ main

เพิ่ม marker ของ description ทั้งสามแบบ แล้ววัดการแบ่ง grapheme ด้วย helper เดิมใน portal ขนาดจริง เก็บข้อความครบและเรียงเดิม รูปแสดงเฉพาะ fragment แรก ชื่อ/ข้อมูลระบุตัวรายการยังแสดงบนหน้าต่อ ไม่มีการเขียน store หรือ payload ใหม่

รอบแรก 8/9 ผ่าน Modern export ถูก overflow guard บล็อก (test รอ download timeout) เพราะหัวหมวดสูงกว่าพื้นที่ที่กันไว้ แก้ fragment budget เป็น 760px ภายในงบ pack เดิม 840px โดยกันพื้นที่เพิ่ม 80px ไม่เปลี่ยน A4 หรือ renderer งบนี้เป็น conservative layout choice ไม่ใช่เพดานข้อความ

ผลสุดท้ายหลัง rebuild:
- Build, full TypeScript, diff check ผ่าน
- scoped lint ไม่มี errors มี img warnings เดิม 4 จุด
- production browser 12/12 ผ่านครั้งเดียว 35.4s: descriptions 3 + palette 6 + preface 3
- รายละเอียด 90 บรรทัด พร้อมรูปกิจกรรม/เกียรติบัตรในสามเทมเพลต ตรวจ concatenated text ตรงต้นฉบับ และรูปแต่ละรายการแสดงเพียงครั้งเดียว
- PDF renderer จริงจาก mobile hidden Preview จำนวนหน้าตรง Preview; เปิดภาพ Modern หน้า 6/7 เห็นข้อความต่อเนื่อง รูปเฉพาะหน้าแรก footer ไม่ทับ
- Backend เป็น mock ไม่ใช่ hosted integration

ข้อจำกัด: ใช้งบวัดที่ยังรวมพื้นที่รูปสำหรับ fragment ต่อด้วย จึงมีพื้นที่ว่างและอาจมากหน้ากว่าการจัดหน้าที่แน่นที่สุด ไม่รับรอง widow/orphan หรือแบ่งตามคำ; แบ่งตาม grapheme เพื่อรักษาวรรณยุกต์ ข้อความส่วนอื่น/หัวเรื่อง/รูปที่สูงเกินหน้าเดียวยังใช้ overflow guard Profile/Education ยาวและ Storage cleanup ยังไม่ปิด
