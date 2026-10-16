# Editor Tags load/retry — 16 ตุลาคม 2026

## ฐานงานและขอบเขต

- เริ่ม local/remote `062f03758c76b6b6c4e435257d94179ff1e5d1d3`, branch `codex/portfolio-next-phase`, working tree สะอาด ตรวจ fetch จริง ไม่มีงานใหม่กว่า
- อ่าน AGENTS, PRD/ARCHITECTURE/DESIGN_SYSTEM ส่วนเกี่ยวข้อง, รายงาน Accordion/Library Selection/My Data Resilience และคู่มือ Client Components ของ Next.js ที่ติดตั้ง
- ใช้โค้ด repository ปัจจุบัน ไม่ใช้ไฟล์แนบเก่า ไม่แก้ main, /my-data, A4/PDF/templates, schema/RPC/auth/Storage, validation หรือเพดานรูป ไม่มี dependency ใหม่

## ต้นเหตุและ dependency ที่ตรวจจริง

EducationForm, ActivityForm, CertificateForm เดิม log tagError/relationError แล้วใช้ `tagData ?? []` และความสัมพันธ์ว่างต่อ จึงดูเหมือนไม่มี Tags/กรองไม่พบโดยไม่แจ้งผู้ใช้

ตรวจ saveSelection แล้ว payload คือ `p_portfolio_id`, `p_section`, `p_item_ids` ตามลำดับ ไม่ส่ง Tags และไม่เขียน user_tags หรือความสัมพันธ์ Tags จึงไม่มีหลักฐานว่าบั๊กนี้ลบ Tags ในฐานข้อมูล Stores/Preview ของสามหมวดไม่เก็บ Tags ด้วย

## ส่วน A — โหลดและ retry

- แยก useEditorTags + tag-loader สำหรับ metadata เท่านั้น โดยยังใช้ select/filter/order เดิม; เริ่มจาก owner ที่ main loader ตรวจแล้ว ไม่เปลี่ยน main queries, image mapping หรือ save payload
- เก็บ snapshot คู่ Tags/relations เฉพาะเมื่อทั้งคู่สำเร็จ หากล้มเหลวเก็บ snapshot เดิมและ flag ของส่วนที่ล้มเหลว; null ที่ไม่มีข้อมูลไม่ถือเป็น success แต่ [] ที่สำเร็จถือเป็นคลัง Tags ว่างจริง
- มีข้อความไทยแยก Tags/relations/ทั้งคู่ ไม่แสดง error ภายใน ปุ่มลองใหม่อ่านคู่ metadata เดิมเพื่อใช้ชุดที่ครบสอดคล้องกัน ไม่อ่านรายการหลัก/รูป/selection ที่บันทึกเก่า
- ป้องกัน retry ซ้ำด้วย pending Promise ต่อ owner และ disabled ระหว่าง loading; version/owner invalidation เพิกเฉยคำขอเก่าหลัง owner เปลี่ยนหรือ component cleanup
- Tag filter หยุดทำงานขณะข้อมูลไม่ครบ แสดงรายการทั้งหมดพร้อมเหตุผล; เก็บตัวกรองที่เลือกเพื่อกลับมาใช้หลัง retry ถ้า Tag หายจริงจะแจ้งและ fallback ทั้งหมด ไม่สร้างผล "ไม่พบรายการ" จาก metadata ที่โหลดไม่ครบ
- ยังเลือก/บันทึกได้เมื่อ main data พร้อม เพราะ payload ไม่พึ่ง Tags; กฎ main loading/error/exporting/saving เดิมยังบังคับอยู่ ไม่ปิดทั้งฟอร์มตาม /my-data โดยไม่มี dependency
- reportTags แยกจาก reportLoaded/markSaved จึงไม่เปลี่ยน baseline/dirty; Accordion/global status แจ้ง metadata ที่ไม่ครบ ไม่ประกาศโหลดครบทุกหมวดผิด ๆ
- ReadyPreview/ExportButton ยังยึด main-data readiness/dirty เดิม เพราะเนื้อหาไม่มี Tags ไม่แก้ renderer หรือ PDF และไม่ปลดล็อก main data ที่โหลดไม่สำเร็จ
- ฟอร์มยัง mounted แบบ Accordion เดิม ไม่มี fetch จากการพับ ไม่เพิ่มระบบ cache/รับอัปเดตจากคลัง

ผล A ที่รันจริง:

- Unit loader 3/3 ผ่าน ครอบคลุม snapshot retention/rejected reads/empty success, dedup/new-owner supersession และ cleanup/old lifetime
- Mock browser 12/12 ผ่าน (38.3s): ทั้งสามหมวด × Tags fail/relations fail/both fail/empty success; retry fail แล้วสำเร็จ, duplicate click, main query ไม่เพิ่ม, selection order/dirty/leave warning/page count/payload ถูกต้อง
- Scoped eslint 0 errors, warnings img เดิม 3 จุด; git diff --check ผ่าน
- Runtime browser ที่ค้างจากรอบก่อนเปิดไม่ได้ จัด Chromium 153 + matching SwiftShader สำหรับทดสอบชั่วคราวนอก repo ไม่เพิ่ม dependency ในโปรเจกต์; ผลข้างต้นได้จาก browser ที่เปิดสำเร็จจริง

## ส่วน B — รอดำเนินการหลัง push A

ยังต้องเพิ่ม async/Accordion/mobile regression, ตรวจภาพ 1440/390, build และ production Editor regression รวม แล้วสรุป commit/remote

การทดสอบทั้งหมดใช้ mock ไม่ใช่ Supabase/Storage จริง ไม่มี migration/reset หรือทดสอบลบจริง ไม่รัน database หรือ /my-data ทั้งชุด
