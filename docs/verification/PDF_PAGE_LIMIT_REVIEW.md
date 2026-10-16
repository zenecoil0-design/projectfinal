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

Commit A ที่ push/fetch ตรวจ local/remote และเนื้อหาตรงกันแล้ว: `46ee0391b973d8b64ebab5c5df63086b18dc8e31`

## ส่วน B — ตรวจไฟล์จริงและแก้ปัญหาที่พบ

1. พบ mobile display:none ทำให้ measurement ภายใน Preview วัดการ์ดเป็นศูนย์ เมื่อมีหลายรายการจำนวนหน้าหดและ clone ตรวจ overflow แล้วส่งออกไม่ได้ แก้เฉพาะ measurement ผ่าน hydration-safe portal ไป document.body ซึ่งยัง offscreen/invisible/aria-hidden และอยู่นอก export tree คงความกว้าง 794px/padding/content width, packPages, การ์ด และ renderer เดิม ไม่ทำ split การ์ดหรือ page model ใหม่
2. ยืนยันด้วย test ว่า synchronous duplicate click เริ่ม export สองงานได้ก่อน React state เปลี่ยน เพิ่ม useRef lock ทันทีใน handler พร้อมปล่อยใน finally และตรวจ guards เดิมซ้ำใน handler
3. ย้าย canvas reset ขนาดเป็นศูนย์เข้า finally จึงคืนทรัพยากรแม้ toDataURL/addImage โยน error พร้อม wrapper.remove เดิม ไม่เปลี่ยนคุณภาพหรือ options renderer
4. เพิ่ม pdf-export.spec.ts และ tests/pdf-inspect.py ใช้ Poppler/pypdf/Pillow ที่มีใน environment ไม่เพิ่ม app dependency ตัวสร้าง PDF จริงไม่ถูก mock; mock เฉพาะข้อมูลและ failure injection

### จำนวนหน้า Preview เทียบกับไฟล์จริง

| กรณี | Preview | PDF | ขนาดจริง | ตรวจ |
| --- | --- | --- | --- | --- |
| ปกติ/ลองใหม่หลัง renderer fail | 6 | 6 | 433,425 bytes | regression/export/retry และ pdfinfo |
| เปิดมือถือ 390px ตั้งแต่เริ่ม ไม่เปิด Preview และพับ Accordion ทั้งหมด | 12 | 12 | 1,844,679 bytes | ทุกหน้าขนาด A4, markers ครบตามลำดับ, raster ไม่ซ้ำ |
| Desktop 1440px พับ Accordion ทั้งหมด | 20 | 20 | 3,551,713 bytes | ทุกหน้าขนาด A4, markers ครบตามลำดับ, raster ไม่ซ้ำ |
| fixture 20 กิจกรรมเดิม | 25 | 25 | 5,909,335 bytes | pdfinfo count ตรง Preview และ A4 |

ขนาด A4 ทุกหน้าของไฟล์ 12/20 คือ 595.28 × 841.89 pt (ประมาณ 210 × 297 mm) ตรวจจาก mediabox ของ PDF จริง ไม่ใช่ DOM อย่างเดียว

ไฟล์ raster PDF ของ jsPDF แชร์ XObject resource dictionary ทุกหน้า เครื่องมือตรวจจึงอ่าน Do operation ที่แต่ละหน้าใช้จริง ไม่ถือว่ารายการ image resources ทั้งหมดถูกวาดทุกหน้า ตรวจ raster ทั้ง 12/20 ภาพไม่ซ้ำ และลำดับสี/marker M0..M6 หรือ M0..M14 อยู่ในหน้า 5 ถึงก่อนหน้าสุดท้ายครบ ไม่ตัดที่หน้า 10

ใช้ pdftoppm render และเปิดตรวจด้วยตา **หน้า 1, 10, 11, 12 ของไฟล์ 12 หน้า** และ **หน้า 1, 10, 11, 20 ของไฟล์ 20 หน้า**: หน้าปกครบ หน้า 10 คือ ORDER05/M5 หน้า 11 คือ ORDER06/M6 และหน้าสุดท้ายเป็นเกียรติบัตรตาม Preview; ไทยอ่านได้ ไม่มีหัว/ท้ายถูกตัด ตัวอย่างภาพวงกลมยังเป็นวงกลมและกรอบรูปไม่ยืด ไม่ทำ OCR หรือเปลี่ยน PDF เป็นข้อความค้นหาได้

### ผลตรวจสุดท้ายที่รันจริง

- Scoped lint ไฟล์ source/tests ที่แก้: 0 errors/0 warnings; git diff --check ผ่าน
- Build หนึ่งครั้งหลัง application implementation พร้อม ผ่าน compile/TypeScript/static generation มี middleware convention warning เดิม
- Production browser regression **49/49 ผ่าน (1.1m)** ในครั้งเดียว: editor 12, Tags 21, Accordion 6, library-selection 6, PDF ใหม่ 4 ไม่มี source เปลี่ยนหลังผลนี้ ไม่ rebuild หรือรันซ้ำทั้งชุด
- ยืนยัน normal PDF, >10-page PDF, desktop/mobile hidden Preview overflow rejection, main load error/dirty guards, Tags-only error ยังไม่บล็อก, save fail/late save/draft/crop regression
- PDF tests ใหม่ตรวจ progress หน้า 11/12, 12/12, 11/20, 20/20; counter ไม่มี /10 และ layout toolbar ไม่ล้นที่ 390/1440
- Inject image.decode fail, image fetch 403 และไม่มีหน้า: ไม่มี download หลอก คืนสถานะให้ลองใหม่แล้วส่งออกได้ โดยไม่เปลี่ยน draft/selection
- Inject canvas output fail: cleanup wrapper และ canvas เป็น 0×0, คืนปุ่ม/สถานะ, retry สำเร็จ; double click ใน JS turn เดียวมีเพียง export ชุดเดียว
- ก่อน final build มี dev tests ที่ไม่ผ่านจาก mobile zero measurement, duplicate click และ test inspector ที่อ่าน shared resources ผิด ได้แก้และตรวจใหม่จริง ไม่ใช้ผลเก่าแทนผล production ด้านบน

คำสั่งหลัก:

```sh
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/tmp/pdf-browser/chromium npx playwright test tests/e2e/pdf-export.spec.ts tests/e2e/editor.spec.ts tests/e2e/editor-tags.spec.ts tests/e2e/editor-accordion.spec.ts tests/e2e/library-selection.spec.ts --reporter=line --max-failures=2
python tests/pdf-inspect.py /tmp/pdf-page-review/portfolio-12.pdf
python tests/pdf-inspect.py /tmp/pdf-page-review/portfolio-20.pdf
pdfinfo <downloaded-pdf>
pdftoppm -f <page> -l <page> -scale-to 1100 -singlefile -png <downloaded-pdf> <output-prefix>
```

Browser ใช้ Chromium 153 + matching SwiftShader ชั่วคราวนอก repo ไม่ติดตั้ง dependency ในแอป Python inspector มี Pillow getdata deprecation warning เท่านั้น ไม่ใช่การตรวจล้มเหลว

## ไฟล์ที่เปลี่ยนและงานค้าง

- A: export-pdf.ts, ExportButton.tsx, tests/e2e/editor.spec.ts และรายงานนี้
- B: export-pdf.ts, ExportButton.tsx, PaginatedSection.tsx, tests/e2e/pdf-export.spec.ts, tests/pdf-inspect.py และเอกสารสถานะที่อ้างถึงเพดานเดิม
- ไม่มีการแก้ packPages, ขนาด A4/ฟอนต์/เทมเพลต/สี, MAX_PDF_BYTES, compression levels, query/save/RPC/auth/Storage หรือ /my-data
- **ประวัติเมื่อจบรอบ page-limit:** 10 MB ยังเป็น hard error; รอบถัดมา [เพิ่มยืนยันไฟล์ใหญ่แล้ว](PDF_LARGE_FILE_CONFIRMATION_REVIEW.md) โดยรักษา quality levels เดิมและขอบ <= เดิม ไม่ถือว่าตรงข้อกำหนด PDF ทั้งหมดแล้ว
- การ์ดใหญ่เกินหน้ายังไม่ split และยังถูก overflow guard บล็อก; สารบัญ/เลขหน้ารวม/page model และการประเมินขีดจำกัดอุปกรณ์จริงยังเป็นงานแยก
- mock desktop/mobile viewport ไม่ใช่การทดสอบโทรศัพท์จริงหรือจำนวนหน้าไม่สิ้นสุด; ไม่ได้ stress-test จนเครื่องหมดหน่วยความจำ
- HEAD เริ่มต้นอยู่ด้านบน; HEAD ส่งท้ายคือ commit B ที่บรรจุรายงานนี้ ตรวจด้วย git log -1 --format=%H -- docs/verification/PDF_PAGE_LIMIT_REVIEW.md และ SHA/ผล remote ยืนยันหลัง push อยู่ในข้อความส่งต่อ Astra

ข้อมูลจาก mock ไม่ใช่ Supabase/Storage จริง ไม่เพิ่ม dependency ในแอปเพื่ออ่าน PDF ไม่รัน database หรือ /my-data ทั้งชุด ไม่มี migration/reset หรือทดสอบลบจริง

เพดานจำนวนหน้าที่ถอดออกไม่ใช่การรับประกันจำนวนหน้าไม่สิ้นสุดในทุกอุปกรณ์ งานยืนยันไฟล์ใหญ่ถูกทำในรายงานรอบถัดมาที่อ้างด้านบน ส่วน pagination split/สารบัญและ PDF ส่วนอื่นยังไม่เสร็จ
