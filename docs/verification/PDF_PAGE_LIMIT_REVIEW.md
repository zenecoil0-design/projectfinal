# PDF page-count limit removal — 16 ตุลาคม 2026

## ฐานงาน

เริ่ม local/remote `ffcbf781de4b313addd2784d797603e4c3a03cc4` บน `codex/portfolio-next-phase`, working tree สะอาด ตรวจ fetch จริง ไม่แก้ main หรือใช้ไฟล์แนบเก่าทับ

อ่าน AGENTS, PRD/ARCHITECTURE/DESIGN_SYSTEM ส่วน PDF, installed Next.js client guide และ PDF skill สำหรับ pdfinfo/Poppler rendering

## ส่วน A — ถอดเพดานทั้งสองชั้น

- เดิม ExportButton ปิดปุ่มและเปลี่ยนสีที่เกิน 10 หน้า พร้อมตัวนับ /10 และ createPortfolioPdf throw อีกชั้นผ่าน MAX_PAGES=10
- ลบ MAX_PAGES และเงื่อนไขจำนวนหน้าทั้งสองจุด ตัวนับเป็นจำนวนหน้าจริง ไม่มีตัวหารเพดานหรือสีเตือนเพราะเกินสิบหน้า ไม่เพิ่มเพดานใหม่
- ไม่เปลี่ยน MAX_PDF_BYTES=10,000,000, compression/resolution retries, renderer หรือ A4
- คง main readiness/dirty/busy/exporting guards, no pages/image decode/image fetch/overflow validation และ wrapper cleanup เดิม
- คง render canvas ทีละหน้าและ progress ตาม pages.length ไม่ตัดเหลือสิบหน้า
- แยก test เดิมเป็น overflow rejection และ actual export >10 pages โดยอ่านจำนวนหน้าจาก PDF ด้วย pdfinfo เทียบ Preview ไม่ใช้แค่ download event

ผล A ที่รันจริง: focused mock dev browser 4/4 ผ่าน (27.7s): normal export/draft, overflow desktop, >10-page real export, overflow mobile hidden Preview; scoped lint ไม่มี error/warning และ git diff --check ผ่าน

## ส่วน B — รอหลัง push A

ยังต้องตรวจไฟล์ 12/20 หน้า ลำดับ/ขนาด A4/render ตัวอย่าง มือถือ/failure/duplicate export และ production regression ก่อนสรุป

ข้อมูลจาก mock ไม่ใช่ Supabase/Storage จริง ไม่เพิ่ม dependency ในแอปเพื่ออ่าน PDF ไม่รัน database หรือ /my-data ทั้งชุด ไม่มี migration/reset หรือทดสอบลบจริง

เพดานจำนวนหน้าที่ถอดออกไม่ใช่การรับประกันจำนวนหน้าไม่สิ้นสุดในทุกอุปกรณ์ และข้อจำกัดไฟล์ 10 MB เดิมยังอยู่ งานยืนยันไฟล์ใหญ่/pagination split/สารบัญและ PDF ส่วนอื่นยังไม่เสร็จ
