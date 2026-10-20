# Editor Accordion — รอบปรับพื้นที่ฟอร์ม

สถานะต่อมา: [Editor Tags](EDITOR_TAG_LOADING_REVIEW.md), [ถอดเพดานหน้า](PDF_PAGE_LIMIT_REVIEW.md), [ยืนยันไฟล์เกิน 10 MB](PDF_LARGE_FILE_CONFIRMATION_REVIEW.md), [เลขต่อเนื่อง](CONTINUOUS_PAGE_NUMBERING_REVIEW.md), [สารบัญ A4 ระดับหมวด](AUTOMATIC_TOC_REVIEW.md) และ [test types](TEST_TYPES_AND_STATUS_REVIEW.md) ทำแล้วตามขอบเขตแต่ละรายงาน ข้อความ “ยังค้าง/ไม่ได้แก้ในรอบนี้” ด้านล่างเป็นประวัติ Accordion ไม่ใช่สถานะปัจจุบันทุกเรื่อง Autosave/visibility/หัว TOC-สีในฟอร์ม/Back-Forward คลังและเป้าหมายรูปยังค้าง

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

Commit A ที่ push และตรวจ remote แล้ว: `703ae3b62e56fedb7084615741d5585f0ddd0919`

## ส่วน B — draft รูป async และ mobile

- พบว่า CropInput ใช้ portal/native dialog นอก panel: hidden/inert ของ Accordion เพียงอย่างเดียวไม่ปิดครอปที่ยังไม่ยืนยัน จึงส่ง active จากหมวดที่เปิดและพื้นที่ฟอร์มที่มองเห็นจริง รวม breakpoint md ของ layout เดิม
- เมื่อพับหมวดหรือสลับไป Preview จะ reset เฉพาะ input/queue ของครอปที่ยังไม่ยืนยัน ไม่ remount ฟอร์ม ไม่ทิ้ง pending File/ผลครอปที่ยืนยันแล้วใน parent และไม่ revoke object URL ของรูปที่ยังใช้อยู่
- ใช้ generation ของ queue และ cleanup ปฏิเสธ callback ครอปที่เสร็จหลังพับ/ยกเลิก ไม่เปิด dialog เก่าซ้ำ ไม่เขียนผลเก่าทับ draft
- เปลี่ยนขนาดจากมือถือ Preview กลับ desktop แล้วฟอร์มที่เห็นยังครอปได้ตามปกติ; default active ของ CropInput เป็น true สำหรับ caller เดิม ไม่แก้ไฟล์ /my-data
- เพิ่ม regression อีก 4 tests: draft สามฟอร์ม/Tab/คำเตือนออก Editor, รูปหน้าปกและโปรไฟล์/URL/mobile panel, late crop callback และ late save หลังนำทางผ่าน Dashboard ไปพอร์ตใหม่

### ผลตรวจสุดท้าย

- `npm run build` ผ่านหนึ่งครั้ง โดยใช้ Supabase URL/key ของ mock server
- Production mock Playwright ผ่าน **23/23 tests (33.9s)**: editor.spec.ts 11, library-selection.spec.ts 6, editor-accordion.spec.ts 6; ไม่ skip หรือลด assertions เดิม
- ครอบคลุมหนึ่งหมวด/พับทั้งหมด/Enter/Space, draft ข้อความ/Tags/ลำดับรายการ, crop ที่ยืนยัน/URL, ไม่มี save/fetch จากการพับ, Preview page count เดิม, save fail/success/หมวดสุดท้าย, save เก่าหลังเปลี่ยนหมวดหรือพอร์ต, mobile form/Preview และ control ที่พับไม่รับ Tab
- ตรวจภาพจริงจาก browser mock ที่ 1440px และ 390px ทั้งเปิดและพับทั้งหมด ไม่มีหน้าล้นแนวนอน; ไม่ใช่การตรวจบนโทรศัพท์จริงหรือทุกเบราว์เซอร์
- lint เฉพาะไฟล์ B ที่แก้: 0 errors, 3 warnings เดิมเรื่อง img ใน CoverForm/ProfileForm/CropInput; `git diff --check` ผ่าน
- ไม่มีการทดสอบกับฐานข้อมูล/Storage จริง ไม่มี migration/reset และไม่รัน database tests หรือ /my-data ทั้งชุด

### ไฟล์ที่เปลี่ยน

- A: src/app/editor/page.tsx, src/components/layout/FormContainer.tsx, tests/e2e/editor.spec.ts, tests/e2e/library-selection.spec.ts, tests/e2e/helpers/editor.ts, tests/e2e/editor-accordion.spec.ts และเอกสารนี้/DESIGN_SYSTEM.md
- B: src/app/editor/page.tsx, src/components/layout/FormContainer.tsx, src/components/forms/CoverForm.tsx, src/components/forms/ProfileForm.tsx, src/components/images/CropInput.tsx, tests/e2e/editor-accordion.spec.ts และเอกสารนี้/DESIGN_SYSTEM.md

### ปัญหาเดิม/ข้อจำกัดแยกจากงาน Accordion

- สถานะเดิมเมื่อจบรอบ Accordion: Editor บางฟอร์มยังไม่รายงาน Tags ที่โหลดไม่ครบ; รอบถัดมาแก้ครบสามหมวดแล้ว ดู [Editor Tags loading review](EDITOR_TAG_LOADING_REVIEW.md) สำหรับ error/retry, dependency ของ save และผลตรวจล่าสุด
- เป้าหมายเกียรติบัตร 2 รูป, autosave, visibility, snapshot/รับอัปเดตจากคลัง และงาน Editor อื่นยังเป็นงานแยก
- เมื่อจบรอบ Accordion ยังมีเพดาน PDF 10 หน้า; รอบถัดมา [ถอดเพดานจำนวนหน้าแล้ว](PDF_PAGE_LIMIT_REVIEW.md) โดยข้อจำกัด 10 MB เดิมยังอยู่
- browser Back/Forward guard ของคลังและ type errors ใน database tests ไม่ได้ตรวจหรือแก้ในรอบนี้

## ขอบเขตและงานค้าง

รอบนี้เฉพาะ Accordion หกหมวดตามลำดับเดิม ไม่เพิ่มสารบัญ/สีเป็นหัวใหม่ ไม่ทำ autosave/visibility/snapshot ไม่แก้ Preview/A4/PDF/pagination/templates, /my-data หรือฐานข้อมูล ไม่เปลี่ยนเพดานรูป/validation และไม่แก้ type errors ของ database tests ที่ไม่เกี่ยวข้อง

ใช้ mock browser tests ไม่ใช่ฐานข้อมูล/Storage จริง ไม่มี migration/reset หรือทดสอบลบข้อมูลจริง งาน Editor ทั้งระบบยังไม่ถือว่าเสร็จ
