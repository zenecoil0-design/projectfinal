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

## ส่วน B — รอหลังส่ง A

ยังต้องตรวจ lifecycle/keyboard/mobile, late result/account/portfolio, object URL cleanup และ PDF จริง >10 MB ที่เปิด/render ได้พร้อม hash เทียบ Blob ที่เสนอ ก่อน build/regression และส่ง B

ไม่มี main/schema/RPC/auth/Storage/renderer/pagination/quality-level/dependency changes ในรอบนี้ ข้อมูลทดสอบใช้ mock ไม่ใช่ Supabase/Storage จริง ไม่รัน migration/reset หรือลบข้อมูลจริง
