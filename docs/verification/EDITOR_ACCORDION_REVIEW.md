# Editor Accordion — รอบปรับพื้นที่ฟอร์ม

เริ่มจาก local/remote `fb8fa20589514ccf0f3b0b286eadae167a9b1a73` บน `codex/portfolio-next-phase`, working tree สะอาด ไม่แก้ main ไม่ใช้ไฟล์แนบเก่าทับ

## ส่วน A — โครงสร้างและการนำทาง

- เดิม FormContainer mount ทั้งหกฟอร์มและซ่อนหมวดที่ไม่เลือกอยู่แล้ว: รักษา lifecycle นี้ ไม่เพิ่ม fetch ตอนเปิด Accordion และไม่สร้างฟอร์มซ้ำ
- รวมหัวหมวดกับฟอร์ม แทน SidebarMenu หกปุ่มแยกด้านบน; `currentStep: number | null` ในหน้า Editor เป็น state เดียว เริ่มหน้าปก และ null คือพับทั้งหมด
- หัวข้อเป็น button มี aria-expanded/aria-controls, focus และ chevron; panel ที่พับ hidden + inert จึงไม่รับ Tab ไม่เปลี่ยน visibility ของ Preview/PDF
- แสดง loading/error/dirty จาก EditorSession จริง และคำว่า “พร้อมแก้ไข” เมื่อโหลดได้ ไม่ถือว่าเคยเปิดแล้วกรอกครบ
- คง handlers/query/validation และปุ่ม manual save เดิม; บันทึกสำเร็จจึงเปิดถัดไป เกียรติบัตรไม่วนกลับ
- จับ navigation revision ตอน submit: แม้เปลี่ยนหมวดไปแล้วกลับมา ผล save เก่าก็ไม่แย่งเปิดหมวดถัดไป
- เลื่อน scroller ของฟอร์มเฉพาะเมื่อหัวข้อที่เปิดอยู่นอกกรอบ และย้าย focus ออกจาก submit ที่ถูกพับหลัง save; ไม่เลื่อนทุกครั้งที่ render
- ปรับ selectors ใน editor.spec.ts และ library-selection.spec.ts ผ่าน helper openEditorSection ซึ่งเปิดเมื่อพับอยู่ คง assertions และเจตนาทดสอบเดิมทั้งหมด

ผลตรวจ A: mock Playwright 8 tests ผ่าน (39.6s): Accordion 2 tests และ library-selection เดิม 6 tests ครอบคลุมพับทั้งหมด/keyboard, ไม่โหลดหรือ save ตอนพับ, Preview page count คงเดิม, save fail/success/หมวดสุดท้าย/ผลช้า และ selection order/Tags/draft/failure ของทั้งสามหมวด; lint เฉพาะไฟล์ที่แก้ 0 errors/0 warnings และ git diff --check ผ่าน

## ส่วน B — รอตรวจ

ยังต้องตรวจ draft ของสามฟอร์มข้อความ, รูปครอป/object URL, dialog ของ panel ที่พับ, async เปลี่ยนพอร์ต, mobile panel switch และ keyboard focus รวมทั้ง production build/tests ของ Editor ที่ได้รับผลกระทบ

## ขอบเขตและงานค้าง

รอบนี้เฉพาะ Accordion หกหมวดตามลำดับเดิม ไม่เพิ่มสารบัญ/สีเป็นหัวใหม่ ไม่ทำ autosave/visibility/snapshot ไม่แก้ Preview/A4/PDF/pagination/templates, /my-data หรือฐานข้อมูล ไม่เปลี่ยนเพดานรูป/validation และไม่แก้ type errors ของ database tests ที่ไม่เกี่ยวข้อง

ใช้ mock browser tests ไม่ใช่ฐานข้อมูล/Storage จริง ไม่มี migration/reset หรือทดสอบลบข้อมูลจริง งาน Editor ทั้งระบบยังไม่ถือว่าเสร็จ
