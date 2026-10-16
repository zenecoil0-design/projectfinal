# PDF large-file confirmation — 17 ตุลาคม 2026

## ปิดงานค้างและฐานรอบนี้

- ก่อนเริ่มพบ local `7a97344d32297ab38df24fa26127ef1f989fd3dc`, remote `46ee0391b973d8b64ebab5c5df63086b18dc8e31`, working tree สะอาด
- ส่งส่วน B รอบ page-limit ผ่าน GitHub connector สำเร็จเป็น `e83b92358bc36c75f3b2a811aca16a6e35df0421`; ตรวจ tree/เนื้อหาทั้งชุดเท่ากับ commit ที่ทดสอบเดิม แล้ว fetch ตรวจ local/remote ตรงกันโดยไม่ force-push
- เก็บ local reference refs/codex/checkpoints/pdf-page-limit-tested-7a97344 ชี้ commit เดิม ไม่ทิ้งงานหรือแก้ main
- HEAD เริ่ม implementation รอบนี้: `e83b92358bc36c75f3b2a811aca16a6e35df0421`

## ส่วน A — สัญญาและ flow

- createPortfolioPdf คืน `{ blob, exceedsTarget }` โดยใช้ MAX_PDF_BYTES จุดเดียว: size <= 10,000,000 ดาวน์โหลดทันที; > จึงถาม ไม่เปลี่ยนขอบเท่ากับของเดิม
- ใช้ quality/resolution เดิม [[2,0.9],[1.5,0.8],[1,0.7]] เท่านั้น คืนผลระดับแรกที่เข้าเป้าหมาย หรือผลสุดท้ายพร้อม flag ไม่ throw เพราะขนาดเพียงอย่างเดียว ไม่เก็บ Blob ของทุกระดับค้าง
- Error รูป decode/fetch, overflow, ไม่มีหน้า และ renderer ยังคงเป็น error ไม่แปลงเป็น dialog ไฟล์ใหญ่
- ExportButton จับ filename ที่ sanitize แล้วตั้งแต่เริ่มงาน เก็บ Blob เดียวระหว่างรอ และใช้ Blob นั้นสร้าง object URL โดยตรงหลังยืนยัน ไม่เรียก renderer ซ้ำ
- generating -> awaiting confirmation -> downloading/cancelled: exporting และ inFlight คง true จนตัดสินใจ/เกิด error; form/template/การเริ่ม export ใหม่ยังถูกป้องกันตาม session guard เดิม
- native dialog ใช้รูปแบบเดียวกับ LibraryDraftGuard แต่แยก component เฉพาะ PDF ไม่ refactor คลัง มี label/description, focus ยกเลิก, Escape ยกเลิก และคืน focus ปุ่มส่งออกเมื่อยังอยู่
- แสดง MB จาก Blob จริง และ bytes แบบตรง ๆ; หากปัดสองตำแหน่งแล้วดูเหมือนไม่เกิน จะเพิ่มเป็นหกตำแหน่ง เช่น 10,000,001 bytes = 10.000001 MB
- Claim pending ref ครั้งเดียวก่อนดาวน์โหลด/ปิด กัน confirm/cancel ซ้ำ; lifetime revision เพิกเฉย progress/result หลัง unmount (EditorSession keyed พอร์ต และ account change unmount ExportButton ตามโค้ดเดิม)
- สร้าง object URL เฉพาะดาวน์โหลด เก็บไว้ได้ถึง 60 วินาทีเพื่อ browser handoff; เมื่อสร้าง URL ใหม่/หมดเวลา/unmount จะ clear timer และ revoke URL ไม่ค้าง timer/listener จาก component ที่ถอด

### ผลตรวจ A

- Unit boundary/format 2/2 ผ่าน: <, =, > target และ Blob identity/near-boundary formatting
- Browser component boundary mock 3/3 ผ่าน (28.1s): ต่ำกว่า/เท่ากับไม่ถาม, >1 byte ถามโดยไม่ดาวน์โหลด, cancel/Escape/retry, focus/disabled controls, confirm ซ้ำดาวน์โหลดครั้งเดียวและใช้ Blob เดิม ไม่เพิ่ม build count
- Boundary browser tests mock เฉพาะ size ของ PDF Blob ไม่อ้างว่าเป็นไฟล์เกิน 10 MB จริง กรณีจริงและ production regression รอตรวจใน B
- Scoped lint 0 errors/0 warnings, git diff --check ผ่าน; หลังปรับ ref cleanup ให้ไม่มี warning ตรวจ flow oversize/cancel/confirm ซ้ำเฉพาะที่เกี่ยวข้อง 1/1 ผ่าน (23.2s)

Commit A ที่ส่งและ fetch ตรวจ local/remote แล้ว: `b3e81fa8e4ed74385d3e2528547bf27cda372f86`

## ส่วน B — lifecycle, accessibility และไฟล์จริง

- ตรวจ late result/pending dialog หลังเปลี่ยนพอร์ตหรือบัญชี 4 กรณีผ่าน ใช้ SPA route change และ Supabase cross-tab event จำลอง; renderer เก่าที่เริ่มแล้วอาจทำงานจนจบ แต่ callback ถูกเพิกเฉย ไม่เปิด dialog/สร้าง URL/download ใน session ใหม่
- พอร์ตใหม่เริ่มงานใหม่และยืนยันได้ชื่อ Portfolio B.pdf ไม่ใช้ Blob หรือชื่อพอร์ต A
- พบ native dialog บน Chromium ปล่อย Tab จากปุ่มสุดท้ายไป browser chrome จึงเพิ่ม focus boundary สำหรับ Tab/Shift+Tab ที่ dialog เฉพาะนี้ ไม่เพิ่ม global listener/dependency
- ตรวจ Tab/Shift+Tab/Enter/Escape, focus เริ่มยกเลิก/กลับปุ่มส่งออก, modal 1440px/390px และ URL revoke หลัง download แล้ว unmount ผ่าน
- ระหว่าง generating/awaiting: inFlight/exporting คงอยู่; confirm/cancel claim ref ครั้งเดียวแล้วปล่อย Blob/state เมื่อเสร็จ กดยืนยันซ้ำไม่ดาวน์โหลดซ้ำ และเริ่มงานใหม่ระหว่าง dialog ไม่ได้
- object URL ใช้ grace 60 วินาทีหลังสั่งดาวน์โหลดหรือคืนเมื่อเริ่ม URL ใหม่/ถอด component; timer ถูก clear และไม่เรียก setState หลัง unmount การบันทึกไฟล์ลงเครื่องเป็นของ browser ไม่ใช่ API แจ้งว่าดิสก์เขียนเสร็จจาก UI

### PDF จริงเกินเป้าหมาย

| รายการ | ผล |
| --- | --- |
| Fixture | Preview จำลอง 32 หน้า A4 พร้อมหัวข้อไทย/เลขหน้าและภาพ PNG noise รายละเอียดสูงแบบ deterministic มีขอบเขตคงที่ |
| Renderer | createPortfolioPdf/html-to-image/jsPDF จริง ผ่านระดับเดิมทั้ง 3 ระดับ ไม่มีการเปลี่ยน threshold, mock size, ต่อ bytes/padding หรือ stub renderer ในเคสนี้ |
| ขนาด Blob ที่เสนอ/ไฟล์ดาวน์โหลด | **14,446,304 bytes** (แสดง 14.45 MB) |
| จำนวนหน้า PDF | **32** ตรง Preview fixture |
| A4 | ทุกหน้ามี mediabox 595.28 × 841.89 pt |
| SHA-256 | `267121f74e55fe7b93d802d2649ec6fb7af5fd1d56fdc43da379d599ccbd0a95` |
| หลังยืนยัน | build count ยังเป็น 3, URL ใช้ Blob object เดิม, ขนาดและ SHA-256 ตรงกับไฟล์ดาวน์โหลด |

เคสจริงใช้ DOM fixture เฉพาะทดสอบเพื่อสร้างภาพรายละเอียดสูงบน Preview โดยไม่แก้ renderer/เทมเพลต production; ไม่อ้างว่าเป็นพอร์ตผู้ใช้จริงหรือข้อมูลจาก Supabase เคส 12/20/25 หน้าจาก mock data เดิมยังอยู่ในชุด regression

ตรวจ SHA-256 ใน browser จาก Blob ที่รอยืนยันก่อนกด แล้วเทียบกับ Node hash ของไฟล์ที่ดาวน์โหลดจริง ไม่ใช่เทียบแค่ download event หรือขนาดโดยประมาณ ตรวจ pdfinfo/pypdf ว่ามี 32 หน้า A4 และ raster ที่ใช้จริง 32 ภาพไม่ซ้ำ จากนั้น pdftoppm render หน้า 1/16/32 และเปิดตรวจ: หัวข้อไทย/เลขหน้าถูกต้องและภาพทดสอบอยู่ครบ เปิดอ่านได้ ไม่ใช่ไฟล์สุ่มที่ใช้เป็น PDF ไม่ได้

### ผลตรวจสุดท้าย

- Unit PDF result/format **2/2 ผ่าน** ใน A
- Dev lifecycle 4 กรณีผ่าน; keyboard เริ่มแรกไม่ผ่านเพราะ native Tab behavior แก้ focus boundary แล้วทดสอบเฉพาะ keyboard/mobile/URL cleanup **1/1 ผ่าน (22.0s)**
- Scoped eslint **0 errors/0 warnings**, git diff --check ผ่าน
- Build **หนึ่งครั้ง** หลัง implementation พร้อม ผ่าน compile/TypeScript/static generation มี middleware convention warning เดิม
- Production browser **58/58 ผ่าน (2.1m)** ในครั้งเดียว: Editor 12, Tags 21, Accordion 6, selection 6, PDF page/export 4, PDF size/lifecycle/real file 9 ไม่มี application source เปลี่ยนหลังผ่าน ไม่ rebuild หรือรันซ้ำทั้งชุด
- ยังตรวจ normal/12/20/25-page PDF, mobile hidden Preview, folded Accordion, dirty/main-load guards, Tags-only error, overflow/image decode/fetch/no pages/renderer errors, failure retry, canvas/wrapper cleanup และ late-save/crop เดิม
- ไม่มีการทดสอบฐานข้อมูล/Storage จริง ไม่มี migration/reset หรือทดสอบลบจริง ไม่รัน database tests และ /my-data ทั้งชุด

คำสั่งหลัก:

```sh
node --import tsx --test tests/pdf-result.test.ts
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/tmp/pdf-browser/chromium npx playwright test tests/e2e/pdf-size.spec.ts tests/e2e/pdf-export.spec.ts tests/e2e/editor.spec.ts tests/e2e/editor-tags.spec.ts tests/e2e/editor-accordion.spec.ts tests/e2e/library-selection.spec.ts --reporter=line --max-failures=2
pdfinfo /tmp/large-pdf-review/actual-oversized.pdf
sha256sum /tmp/large-pdf-review/actual-oversized.pdf
python tests/pdf-inspect.py /tmp/large-pdf-review/actual-oversized.pdf
pdftoppm -f 1 -l 1 -singlefile -scale-to 1100 -png /tmp/large-pdf-review/actual-oversized.pdf /tmp/large-pdf-review/page-1
```

## ไฟล์ ผลต่อ caller และข้อจำกัด

- export-pdf.ts: result/size formatting และคืนผลสุดท้ายแทน size-only error; sequential canvas/cleanup/asset/overflow guard เดิม ไม่เปลี่ยน quality levels หรือ pagination
- ExportButton.tsx: caller เดียวของ createPortfolioPdf อัปเดตครบ จับ Blob/filename/lock/lifetime/URL และปล่อยตาม lifecycle
- LargePdfDialog.tsx: modal เฉพาะ PDF ตาม native dialog style เดิม ไม่ refactor /my-data
- tests/pdf-result.test.ts, tests/e2e/pdf-size.spec.ts และรายงาน/สถานะ PDF ในเอกสารหลัก
- EditorSession ไม่ต้องแก้: exporting ที่มีอยู่คงป้องกันแก้ฟอร์ม/template/Link ออกตามเดิม รวมช่วงรอยืนยัน ไม่เปลี่ยน dirty baseline หรือ Tags readiness
- ยังไม่ตรวจโทรศัพท์จริง/browser ทุกตัว; URL grace ไม่ใช่การตรวจ OS download completion และ underlying render ที่เริ่มไปแล้วไม่ได้ abort ทันทีเมื่อออก แต่ผล/cleanup ถูกจัดการและทดสอบแล้ว
- ไม่เปลี่ยน/ประเมิน quality floor ใหม่หรือทำ slider/DPI การ์ดใหญ่ยังไม่ split สารบัญ/เลขหน้ารวม/page model และฟีเจอร์อื่นยังค้าง ไม่ถือว่างาน PDF ทั้งระบบเสร็จ
- HEAD เริ่ม implementation อยู่ด้านบน; HEAD สุดท้ายคือ commit B ที่บรรจุรายงานนี้ ดู git log -1 --format=%H -- docs/verification/PDF_LARGE_FILE_CONFIRMATION_REVIEW.md และ SHA/ผล remote หลัง push ในข้อความส่งต่อ Astra

ไม่มี main/schema/RPC/auth/Storage/renderer/pagination/quality-level/dependency changes ในรอบนี้ ข้อมูลทดสอบใช้ mock ไม่ใช่ Supabase/Storage จริง ไม่รัน migration/reset หรือลบข้อมูลจริง
