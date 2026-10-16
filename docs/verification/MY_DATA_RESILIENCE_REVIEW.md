# /my-data: load failures และ unsaved drafts

เริ่มจาก local/remote `14530925400fd65efb2620bdf0e49933319f1ec6` บน `codex/portfolio-next-phase`, working tree สะอาด อ่าน AGENTS/PRD/ARCHITECTURE/DESIGN_SYSTEM และคู่มือ Link ของ Next ที่ติดตั้ง ใช้ repository ปัจจุบัน ไม่ใช้ไฟล์แนบเก่าทับ ไม่แก้ main

## ส่วน 1 — โหลดและ retry

สาเหตุเดิม: loader ใช้ `data ?? []` หลัง error ทั้งรายการหลัก/Tags/ความสัมพันธ์ ทำให้ error กลายเป็น empty และอาจเปิดให้บันทึก Tag selection ว่าง

- เพิ่ม `useLibraryLoad.ts`: แยก loading/loaded/loadError/tagsError, deduplicate คำขอที่ยังไม่เสร็จ และเพิกเฉยผลคำขอเก่าหลัง unmount หรือ supersede
- เพิ่ม `LibraryLoadStatus.tsx`: ข้อความทั่วไป ไม่มีรายละเอียดฐานข้อมูล ปุ่มลองใหม่โหลดทั้งข้อมูลของหมวด (รวมส่วนที่ล้มเหลว) ไม่ reload หน้า
- EducationLibrary/ActivityLibrary/CertificateLibrary ไม่ publish ข้อมูลทดแทนเมื่อ load error และเก็บรายการก่อนหน้าหาก refresh ล้มเหลว พร้อมข้อความข้อมูลเก่า; รูปโหลดไม่ครบถือว่ารายการยังไม่พร้อม ไม่แทนด้วยชุดรูปว่าง
- Tags และความสัมพันธ์ต้องสำเร็จทั้งคู่ก่อน publish; ถ้าล้มเหลวยังดูรายการหลักได้ แต่ไม่อ้างว่าไม่มี Tags และปิดแก้ไข/บันทึก/สร้าง Tag ชั่วคราว รวม guard ใน handlers
- retry ไม่ reset ฟอร์ม, selected Tags หรือภาพ; ไม่เปิดแก้ไขรายการที่ไม่ทราบ Tags จนโหลดครบ
- หน้า /my-data ส่ง owner ที่ตรวจด้วย getUser ให้คลังและ remount ตามบัญชี; auth events ใช้เพียง invalidate UI และตรวจ getUser ใหม่เมื่อบัญชีเปลี่ยน ไม่เปลี่ยน auth policies/ขั้นตอน login; event ของบัญชีเดิมไม่ล้างฟอร์ม

ผลตรวจส่วน 1: mock Playwright ครบ 24 tests ผ่าน (56.2s) ที่ 1440px/390px ครอบคลุม load error ไม่เป็น empty, retry/dedup, Tags และความสัมพันธ์ล้มเหลวไม่เขียนทับ, retry รักษา draft/Tags เดิม, stale refresh รักษารายการ, ผลล่าช้าหลังเปลี่ยนหมวด/บัญชี และเส้นทาง CRUD เดิม; eslint เฉพาะไฟล์ที่แก้ 0 errors/6 warning img เดิม, git diff --check ผ่าน

หลังทำให้การปล่อย pending request รองรับ synchronous exception ด้วย ตรวจ load/retry/Tags ที่เกี่ยวข้องอีก 9 tests ผ่าน (25.9s)

## ข้อจำกัด/งานเดิมนอกขอบเขต

- เกียรติบัตรยังเป็น 4 รูปในโค้ดเดิม เป้าหมาย 2 รูปเป็นงานแยก ไม่เปลี่ยนเพดาน/validation หรือรูปเก่า
- ปัญหา Tags loadError ใน Editor อยู่นอกขอบเขต ไม่แก้ Editor
- `npx tsc --noEmit` ทั้ง repo พบ TS2571 ในไฟล์ทดสอบที่ไม่ได้แก้ 9 จุด: cover-names.test.ts (2), foundation.test.ts (4), inspection/supabase-baseline.test.ts (1), reset.test.ts (2); ไม่แก้เพื่อกลบผลตรวจ และไม่รันฐานข้อมูลทั้งชุด

การทดสอบรอบนี้ใช้ mock เท่านั้น ไม่ใช่ Supabase/Storage จริง ไม่รัน migration/reset และไม่ทดสอบลบข้อมูลจริง

## ส่วน 2 — ข้อมูลค้าง

- เพิ่ม `LibraryDraftGuard.tsx` เป็น guard เฉพาะ /my-data และบัญชีที่เปิดอยู่ ไม่เปลี่ยน Editor ไม่ดัก history ทั้งเว็บ
- baseline จับตอนเปิดฟอร์มด้วยค่าจริง: ข้อความ/ชื่อ Tag ใหม่, Tags แบบชุด (toggle คืนแล้วสะอาด), รูปเดิมตามลำดับ/id/url/sort_order และ File ตาม object identity ไม่ stringify File
- เปิดฟอร์ม/เปิดเมนู Tags/เปิด crop ที่ยังไม่ยืนยัน ไม่ dirty; แก้คืนค่าเดิมหรือเพิ่มแล้วนำรูปใหม่ออกกลับสะอาด
- guard ครอบคลุมยกเลิก/ปิด modal, ปุ่มหมวด และ Link กลับ Dashboard ผ่าน onNavigate ตาม Next.js; pending action เก็บครั้งเดียว ใช้ native dialog พร้อมข้อความและปุ่มที่กำหนด รองรับ focus/keyboard/Escape เพื่อแก้ไขต่อ
- fieldset ปิดแก้ฟอร์มระหว่าง save, ปิดปุ่มปิด/ยกเลิก/หมวด และ guard ป้องกัน navigation ระหว่าง save; save fail เก็บ draft/dirty, save success ปิดและล้าง baseline
- beforeunload ผูกเฉพาะ dirty และ cleanup เมื่อสะอาดหรือ unmount ข้อความและการอนุญาตแสดงคำเตือนเป็นของเบราว์เซอร์
- pending FileReader จากฟอร์มที่ปิดแล้วถูกเพิกเฉย; preview ในคลังเป็น data URL และถูกปล่อยผ่าน reset/unmount; object URL ของ CropInput มี cleanup เดิม ไม่แก้ส่วน crop และไม่ revoke/ล้าง draft ตอนแก้ไขต่อ
- modal คลังเดิมไม่รองรับปิดด้วย backdrop/Escape จึงไม่ได้เพิ่มช่องทางปิดเหล่านั้น ส่วน Escape ของ dialog ยืนยันหมายถึงแก้ไขต่อ

ผล mock ส่วน 2 หลัก 9 tests ผ่าน: baseline/revert/Tag keyboard, continue/discard/duplicate-close, confirmed crop/source คงเดิม, cancel unconfirmed crop, ลบรูปเดิมใน draft แล้วยกเลิกยังอยู่ ไม่มี Storage write, save fail/retry/save busy, ปุ่มหมวด/Link guard ที่ 1440x1000 และ 390x568

### ข้อจำกัดการนำทางที่ยังเหลือ

ตรวจ native refresh แล้ว beforeunload แสดงจริง ยกเลิกแล้ว draft ยังอยู่ ส่วน browser Back/Forward แบบ App Router เป็น SPA navigation และยังไม่ถูก guard: มีโอกาสทิ้ง draft โดยไม่เตือน รอบนี้ไม่เพิ่ม popstate/history workaround ตามขอบเขต ไม่อ้างว่าครอบคลุมทุกการออกจากหน้า

### พฤติกรรมเดิมที่ยังคงอยู่

- ปุ่มสร้าง Tag บันทึก Tag เข้าคลังทันทีตามระบบเดิม การทิ้ง draft ยกเลิกการเลือกในฟอร์ม ไม่ได้ย้อนลบ Tag ที่สร้างไปแล้ว
- save/upload/cleanup เดิมมีหลายคำขอ ไม่ได้เปลี่ยนเป็น transaction: UI เก็บ draft เมื่อ save fail ไม่ได้หมายความว่าย้อนผลข้างเคียงของคำขอที่สำเร็จไปก่อนแล้ว งานนี้ไม่แก้ cleanup หรือการลบจริง
- ส่วน 1 remote commit: `0a26acb49f1cef7cc0474ad105e1e096620b059f`

## ผลตรวจรวมและสถานะงานค้าง

- Production build ผ่าน compile/TypeScript/static generation มี warning middleware convention เดิม
- Mock E2E รวมเส้นทาง /my-data **34 passed (1.0m)** กับ production build ครอบคลุมสามหมวดและ native refresh/browser history
- ตรวจภาพ dialog desktop 1440x1000/mobile 390x568 ด้วยตาและ assertions: ข้อความ/ปุ่มไม่ล้น ปุ่มเข้าถึงได้ และ focus เริ่มที่แก้ไขต่อ
- หลังชุดรวมผ่าน review พบว่ากดหมวดเดิมไม่ควรแจ้งทิ้ง draft: เพิ่ม no-op guard และกรณีทดสอบ จึง rebuild ให้ตรง source ล่าสุด (ผ่าน) และตรวจเฉพาะ dirty guard สามหมวดหลังเปลี่ยนโค้ด ไม่รันชุดฐานข้อมูล
- Guard สามหมวดหลังแก้หมวดเดิมผ่าน 3 tests (11.0s)
- ตรวจ race เพิ่มเติมของ loader: refresh หลัง save/delete ต้อง supersede retry ที่ยังค้าง แทนที่จะใช้คำขออ่านก่อน mutation; เพิ่ม fresh flag เฉพาะ refresh หลัง mutation ไม่เปลี่ยน query/ขั้นตอนลบ/cleanup และเพิ่ม mock regression ของทั้งสามหมวด จากนั้น rebuild source ล่าสุดผ่าน จึงมี build รวม 3 ครั้งในรอบนี้เนื่องจากมี source fixes หลัง review ไม่ใช่รันซ้ำทั้งที่โค้ดไม่เปลี่ยน
- **ผลปิดงาน: 37 passed (1.0m)** บน production build ล่าสุด รวม regression ข้างต้น ไม่มีการแก้ source หลังผ่าน จึงไม่รันทดสอบหรือ build ซ้ำ
- คำสั่ง build: `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key npm run build`
- คำสั่งตรวจรวม: `LD_LIBRARY_PATH=/workspace/scratch/c9bc59bd45e7/browser-runtime PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/workspace/scratch/c9bc59bd45e7/browser-runtime/chromium npx playwright test tests/e2e/my-data.spec.ts --timeout=30000 --max-failures=3 --reporter=line`
- eslint เฉพาะไฟล์ที่เปลี่ยน 0 errors, warning img เดิม 6; git diff --check ผ่าน
- `tsc --noEmit` ทั่ว repo กับ Next build ต่างกัน: Next ที่ติดตั้งมี filter สำหรับ *.test.* ตาม implementation เดิม จึง build ผ่านโดยไม่แก้ config หรือข้ามตรวจ source; type errors 9 จุดใน tests เดิมยังค้างตามที่บันทึกด้านบน

| ประเด็น | สถานะล่าสุด |
| --- | --- |
| /my-data load error / empty / retry / stale data | แก้ครบสามหมวด |
| /my-data Tags โหลดไม่ครบแล้วเสี่ยงบันทึกว่าง | ป้องกันด้วย load status และ save/edit guards |
| /my-data draft warning / cancel / close / category / Dashboard Link | ทำแล้ว รวมข้อความ Tags และรูป |
| Native refresh/close warning | beforeunload เฉพาะ dirty; native refresh ตรวจจริงใน mock browser แล้ว |
| Browser Back/Forward แบบ App Router | ยังไม่กัน; ตรวจแล้วออกได้โดยไม่ผ่าน dialog จึงยังอาจเสีย draft |
| Editor Tags loadError | รอบนี้เดิมยังไม่แก้; รอบถัดมาแก้สามหมวดใน [Editor Tags loading review](EDITOR_TAG_LOADING_REVIEW.md) แล้ว |
| เกียรติบัตรเป้าหมาย 2 รูป | งานเดิมแยก ยังรักษา 4 รูปตามโค้ด |
| Storage cleanup / atomic multi-request save | พฤติกรรมเดิม ไม่เปลี่ยน/ไม่ทดสอบกับข้อมูลจริง |

ไม่มี schema/RPC/RLS/auth-policy/Storage-policy/migration/reset/dependency changes ไม่แตะ Editor/Preview/A4/PDF/templates หรือเปลี่ยนเพดานรูป

ไฟล์รอบนี้: page.tsx, EducationLibrary.tsx, ActivityLibrary.tsx, CertificateLibrary.tsx, useLibraryLoad.ts, LibraryLoadStatus.tsx, LibraryDraftGuard.tsx, tests/e2e/my-data.spec.ts และรายงาน verification สองฉบับนี้
