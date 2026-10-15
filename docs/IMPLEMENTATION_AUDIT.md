# รายงานเทียบโค้ดกับข้อกำหนดระบบแฟ้มสะสมผลงาน

วันที่ตรวจ: 14 ตุลาคม 2026 (UTC)  
Branch: `codex/portfolio-system-fixes`  
โค้ดอ้างอิง: `5ad8310f46dc0f931c0aed6b7403504f5af282dd`  
เอกสารฐาน: PRD.md, ARCHITECTURE.md, DESIGN_SYSTEM.md และ AGENTS.md ฉบับ 1.1 ใน commit เดียวกัน

## วิธีอ่านและขอบเขต

นี่คือการตรวจโค้ดแบบ static จากไฟล์ implementation/config/test ที่เกี่ยวข้อง 59 ไฟล์และเอกสารฐาน ไม่ใช่รายงานว่าระบบผ่านการทดสอบจริง ตรวจทั้งเส้นทางฟอร์ม store preview export และ migration ที่มีใน repository ไม่ใช้ภาพ schema เก่าที่อ่านไม่ได้เป็นหลักฐาน

- **มีฐานแล้ว**: พบ implementation ที่รองรับแกนของงาน ต้องรันทดสอบจริงก่อนรับงาน
- **ต้องทำเพิ่ม**: พบส่วนเดิม แต่ยังขาดหรือขัดกับข้อกำหนดใหม่
- **ยังไม่พบ**: ไม่พบ implementation ของ flow นี้ในโค้ดที่ตรวจ ไม่ใช่การยืนยันว่าไม่มีในบริการภายนอก
- **ต้องตรวจระบบจริง**: ต้องอาศัย schema/config/สิทธิ์หรือข้อมูลจาก Supabase จริง

จำนวนหัวข้อ: 40 หัวข้อ — มีฐานแล้ว 14, ต้องตรวจระบบจริง 3, ยังไม่พบ 8, ต้องทำเพิ่ม 15

จำนวนนี้ไม่ใช่เปอร์เซ็นต์ความสำเร็จ เพราะแต่ละหัวข้อมีขนาดงานต่างกัน งานที่มีฐานแล้วไม่เท่ากับผ่าน acceptance test แล้ว

## ผลตรวจรายความสามารถ

| ID | ความสามารถ | สถานะ | หลักฐานโค้ด | สิ่งที่ยังต้องทำ/ตรวจ | เคสเริ่มต้น |
| --- | --- | --- | --- | --- | --- |
| F01 | บัญชีอีเมล/รหัสผ่าน | มีฐานแล้ว | [page.tsx](https://github.com/zenecoil0-design/projectfinal/blob/5ad8310f46dc0f931c0aed6b7403504f5af282dd/src/app/register/page.tsx) | มี register/login/logout; ต้องทดสอบกับ Auth จริง | AUTH-01 |
| F02 | ไม่บังคับยืนยันอีเมลช่วงพัฒนา | ต้องตรวจระบบจริง | [page.tsx](https://github.com/zenecoil0-design/projectfinal/blob/5ad8310f46dc0f931c0aed6b7403504f5af282dd/src/app/register/page.tsx) | พฤติกรรมขึ้นกับ Supabase Auth settings; โค้ดอย่างเดียวยืนยันไม่ได้ | AUTH-01 |
| F03 | ลืมรหัสผ่าน | ยังไม่พบ | [page.tsx](https://github.com/zenecoil0-design/projectfinal/blob/5ad8310f46dc0f931c0aed6b7403504f5af282dd/src/app/login/page.tsx) | ยังไม่พบเส้นทางขอลิงก์และตั้งรหัสผ่านใหม่ | AUTH-04 |
| F04 | คลังประวัติการศึกษา | มีฐานแล้ว | [EducationLibrary.tsx](https://github.com/zenecoil0-design/projectfinal/blob/5ad8310f46dc0f931c0aed6b7403504f5af282dd/src/components/my-data/EducationLibrary.tsx) | มีฟอร์มและ CRUD; ตรวจบันทึกจริงและสิทธิ์ | LIB-01 |
| F05 | คลังกิจกรรมและเกียรติบัตร | ต้องทำเพิ่ม | [ActivityLibrary.tsx](https://github.com/zenecoil0-design/projectfinal/blob/5ad8310f46dc0f931c0aed6b7403504f5af282dd/src/components/my-data/ActivityLibrary.tsx) | มี CRUD แต่ต้องปรับช่องกรอกเหลือชื่อ/รายละเอียด และ Tags ตามข้อกำหนด | LIB-02 |
| F06 | ชื่อบังคับ รายละเอียด/รูปไม่บังคับ | มีฐานแล้ว | [CertificateLibrary.tsx](https://github.com/zenecoil0-design/projectfinal/blob/5ad8310f46dc0f931c0aed6b7403504f5af282dd/src/components/my-data/CertificateLibrary.tsx) | มีตรวจชื่อ; ต้องยืนยันกรณีชื่ออย่างเดียวและช่องว่างทั้งสองหมวด | LIB-02 |
| F07 | กิจกรรมไม่เกิน 4 รูป | มีฐานแล้ว | [ActivityLibrary.tsx](https://github.com/zenecoil0-design/projectfinal/blob/5ad8310f46dc0f931c0aed6b7403504f5af282dd/src/components/my-data/ActivityLibrary.tsx) | มี MAX_IMAGES=4 ฝั่ง UI; ตรวจการบังคับที่ชั้นข้อมูลด้วย | LIB-04 |
| F08 | เกียรติบัตรไม่เกิน 2 รูป | ต้องทำเพิ่ม | [CertificateLibrary.tsx](https://github.com/zenecoil0-design/projectfinal/blob/5ad8310f46dc0f931c0aed6b7403504f5af282dd/src/components/my-data/CertificateLibrary.tsx) | MAX_IMAGES ยังเป็น 4 ต้องแก้และตรวจข้อมูลทดลองเดิม | LIB-05 |
| F09 | Tags ส่วนตัวและไม่บังคับ | มีฐานแล้ว | [CertificateLibrary.tsx](https://github.com/zenecoil0-design/projectfinal/blob/5ad8310f46dc0f931c0aed6b7403504f5af282dd/src/components/my-data/CertificateLibrary.tsx) | มีสร้าง/เลือก Tags; สิทธิ์แยกบัญชีต้องยืนยันด้วย RLS จริง | LIB-08 |
| F10 | เลือกข้อมูลจากคลังเรียงตามการติ๊ก | มีฐานแล้ว | [ActivityForm.tsx](https://github.com/zenecoil0-design/projectfinal/blob/5ad8310f46dc0f931c0aed6b7403504f5af282dd/src/components/forms/ActivityForm.tsx) | toggleActivity ต่อท้ายรายการและบันทึก sort_order; ทดสอบครบสามหมวด | SEL-01 |
| F11 | เลือกเฉพาะรูปต่อพอร์ต | ยังไม่พบ | [ActivityForm.tsx](https://github.com/zenecoil0-design/projectfinal/blob/5ad8310f46dc0f931c0aed6b7403504f5af282dd/src/components/forms/ActivityForm.tsx) | mapLibraryActivityToStore นำรูปของรายการมาทั้งหมด; ต้องมี selected image IDs ต่อพอร์ต | SEL-03 |
| F12 | บันทึก selection แบบ atomic | มีฐานแล้ว | [202610130001_atomic_portfolio_selection.sql](https://github.com/zenecoil0-design/projectfinal/blob/5ad8310f46dc0f931c0aed6b7403504f5af282dd/supabase/migrations/202610130001_atomic_portfolio_selection.sql) | มี RPC ตรวจเจ้าของและ transaction; ยังไม่ได้ยืนยัน migration ถูกใช้ในฐานจริง | SEC-03 |
| F13 | Snapshot B และแจ้งรับอัปเดต | ยังไม่พบ | [EducationForm.tsx](https://github.com/zenecoil0-design/projectfinal/blob/5ad8310f46dc0f931c0aed6b7403504f5af282dd/src/components/forms/EducationForm.tsx) | โหลดข้อมูลจากคลังตาม relation; ต้องมีข้อมูลสำเนาถาวร เวอร์ชัน และขั้นตอนรับอัปเดต | SNP-01 |
| F14 | รักษารูปเก่าสำหรับ snapshot | ยังไม่พบ | [CertificateLibrary.tsx](https://github.com/zenecoil0-design/projectfinal/blob/5ad8310f46dc0f931c0aed6b7403504f5af282dd/src/components/my-data/CertificateLibrary.tsx) | ต้องรักษา reference/ไฟล์ที่ยังถูกใช้ ไม่ใช่เก็บ URL อย่างเดียว | SNP-04 |
| F15 | ลบคลังแจ้งชื่อ/จำนวนพอร์ตที่กระทบ | ต้องทำเพิ่ม | [CertificateLibrary.tsx](https://github.com/zenecoil0-design/projectfinal/blob/5ad8310f46dc0f931c0aed6b7403504f5af282dd/src/components/my-data/CertificateLibrary.tsx) | มี confirm ลบทั่วไป ยังไม่พบรายการพอร์ตที่ได้รับผลกระทบ | DEL-01 |
| F16 | ลบคลังออกจากทุกพอร์ตและกันคืนชีพ | ต้องตรวจระบบจริง | [202610130001_atomic_portfolio_selection.sql](https://github.com/zenecoil0-design/projectfinal/blob/5ad8310f46dc0f931c0aed6b7403504f5af282dd/supabase/migrations/202610130001_atomic_portfolio_selection.sql) | migration ที่พบไม่ได้แสดง schema/cascade ทั้งระบบ; ต้องเพิ่ม flow snapshot และกัน stale save | DEL-03 |
| F17 | สร้างหลายพอร์ตและเปิดแก้ | มีฐานแล้ว | [CreatePortfolioModal.tsx](https://github.com/zenecoil0-design/projectfinal/blob/5ad8310f46dc0f931c0aed6b7403504f5af282dd/src/components/portfolio/CreatePortfolioModal.tsx) | มีชื่อ เทมเพลต และรายการพอร์ต; ต้องทดสอบ persistence | PORT-01 |
| F18 | เปลี่ยนชื่อ/ลบ/ทำสำเนาพอร์ต | ยังไม่พบ | [page.tsx](https://github.com/zenecoil0-design/projectfinal/blob/5ad8310f46dc0f931c0aed6b7403504f5af282dd/src/app/dashboard/page.tsx) | หน้าปัจจุบันมีสร้างและลิงก์แก้ ยังไม่พบ flow ทั้งสามครบ | PORT-03 |
| F19 | บันทึกอัตโนมัติฉบับร่าง | ต้องทำเพิ่ม | [EditorSession.tsx](https://github.com/zenecoil0-design/projectfinal/blob/5ad8310f46dc0f931c0aed6b7403504f5af282dd/src/components/editor/EditorSession.tsx) | มี dirty/error และเตือนก่อนออก แต่ฟอร์มยังใช้บันทึกเอง; dirty snapshot ไม่ใช่ snapshot B | SAVE-01 |
| F20 | หน้าปกและครอปรูป | มีฐานแล้ว | [CoverForm.tsx](https://github.com/zenecoil0-design/projectfinal/blob/5ad8310f46dc0f931c0aed6b7403504f5af282dd/src/components/forms/CoverForm.tsx) | มีชื่อหัวปก/โรงเรียน/รูปและ crop; ตรวจชื่อผู้จัดทำที่ใช้ร่วมกับ profile และ preview | FORM-01 |
| F21 | คำนำตัวอย่างและชื่อผู้จัดทำ | มีฐานแล้ว | [PrefaceForm.tsx](https://github.com/zenecoil0-design/projectfinal/blob/5ad8310f46dc0f931c0aed6b7403504f5af282dd/src/components/forms/PrefaceForm.tsx) | มีฟอร์มคำนำ; ตรวจบันทึกและการแก้ข้อความยาว | FORM-03 |
| F22 | ประวัติส่วนตัวและช่องเพิ่มเอง | มีฐานแล้ว | [ProfileForm.tsx](https://github.com/zenecoil0-design/projectfinal/blob/5ad8310f46dc0f931c0aed6b7403504f5af282dd/src/components/forms/ProfileForm.tsx) | มีฟิลด์เดิมและ custom fields; ไม่ต้องออกแบบข้อมูลใหม่ทั้งหมด | FORM-04 |
| F23 | อายุ auto/manual | ต้องทำเพิ่ม | [ProfilePreview.tsx](https://github.com/zenecoil0-design/projectfinal/blob/5ad8310f46dc0f931c0aed6b7403504f5af282dd/src/components/preview/ProfilePreview.tsx) | มีคำนวณจากวันเกิด; ยังไม่พบโหมด manual ที่คงค่าหลังเปิดใหม่ | AGE-01 |
| F24 | ไม่แสดงช่องว่าง/กรอบว่าง | ต้องทำเพิ่ม | [ProfilePreview.tsx](https://github.com/zenecoil0-design/projectfinal/blob/5ad8310f46dc0f931c0aed6b7403504f5af282dd/src/components/preview/ProfilePreview.tsx) | หลาย label และกรอบรูปแสดงเสมอแม้ไม่มีข้อมูล | FORM-06 |
| F25 | หมวดพับขยายและถัดไป | ต้องทำเพิ่ม | [SidebarMenu.tsx](https://github.com/zenecoil0-design/projectfinal/blob/5ad8310f46dc0f931c0aed6b7403504f5af282dd/src/components/layout/SidebarMenu.tsx) | ยังเป็นเมนูแยกจากฟอร์ม ไม่ใช่ accordion ตามแบบใหม่ | UI-01 |
| F26 | เปิด/ปิดหมวดโดยเก็บข้อมูล | ยังไม่พบ | [page.tsx](https://github.com/zenecoil0-design/projectfinal/blob/5ad8310f46dc0f931c0aed6b7403504f5af282dd/src/app/editor/page.tsx) | ต้องมี visibility ถาวร แยกจากสถานะพับฟอร์ม | UI-04 |
| F27 | มือถือสลับฟอร์ม/Preview | มีฐานแล้ว | [page.tsx](https://github.com/zenecoil0-design/projectfinal/blob/5ad8310f46dc0f931c0aed6b7403504f5af282dd/src/app/editor/page.tsx) | มี mobilePanel และ scroll ไป section; ต้องตรวจอุปกรณ์จริง | UI-06 |
| F28 | A4 ย่อพอดีจอและซูม | ต้องทำเพิ่ม | [Paper.tsx](https://github.com/zenecoil0-design/projectfinal/blob/5ad8310f46dc0f931c0aed6b7403504f5af282dd/src/components/preview/Paper.tsx) | มีขนาดคงที่ 794×1123 และย่อทั้งหน้า; ยังไม่พบซูมที่ผู้ใช้ควบคุม | UI-07 |
| F29 | ปรับหน้าแรกคอมให้กะทัดรัด | ต้องทำเพิ่ม | [HeroSection.tsx](https://github.com/zenecoil0-design/projectfinal/blob/5ad8310f46dc0f931c0aed6b7403504f5af282dd/src/components/home/HeroSection.tsx) | มี responsive เดิม ต้องตรวจภาพจริงและปรับสัดส่วนตามที่ตกลง | UI-09 |
| F30 | สามเทมเพลตครบทุกความสามารถ | ต้องทำเพิ่ม | [TemplatePicker.tsx](https://github.com/zenecoil0-design/projectfinal/blob/5ad8310f46dc0f931c0aed6b7403504f5af282dd/src/components/editor/TemplatePicker.tsx) | มี classic/modern/minimal แต่ Minimal ระบุรูปแบบพื้นฐาน; ชื่อสามตัวเลือกไม่พิสูจน์ว่าครบทุกหมวด/สี/TOC | TPL-01 |
| F31 | เลือกสีหลัก/รองตอนท้าย | ยังไม่พบ | [TemplatePicker.tsx](https://github.com/zenecoil0-design/projectfinal/blob/5ad8310f46dc0f931c0aed6b7403504f5af282dd/src/components/editor/TemplatePicker.tsx) | มีเลือก template แต่ยังไม่พบ flow สองสี preset/custom/reset ตามพอร์ต | TPL-03 |
| F32 | แบ่งหน้ารายการอัตโนมัติ | ต้องทำเพิ่ม | [pagination.ts](https://github.com/zenecoil0-design/projectfinal/blob/5ad8310f46dc0f931c0aed6b7403504f5af282dd/src/lib/editor/pagination.ts) | packPages จัดกลุ่ม card ได้ แต่รายการใหญ่เกินหน้าไม่แบ่งต่อ | LAY-01 |
| F33 | ไม่จำกัดจำนวนหน้าพอร์ต | ต้องทำเพิ่ม | [export-pdf.ts](https://github.com/zenecoil0-design/projectfinal/blob/5ad8310f46dc0f931c0aed6b7403504f5af282dd/src/lib/editor/export-pdf.ts) | MAX_PAGES=10 ยังปฏิเสธ export เกินสิบหน้า | LAY-04 |
| F34 | สารบัญอัตโนมัติและ Preview | ยังไม่พบ | [page.tsx](https://github.com/zenecoil0-design/projectfinal/blob/5ad8310f46dc0f931c0aed6b7403504f5af282dd/src/app/editor/page.tsx) | ยังไม่พบ component สารบัญและวงจรคำนวณเลขหน้ารวม | LAY-06 |
| F35 | เลขหน้าเริ่มประวัติส่วนตัว/จำนวนรวม | ต้องทำเพิ่ม | [PaginatedSection.tsx](https://github.com/zenecoil0-design/projectfinal/blob/5ad8310f46dc0f931c0aed6b7403504f5af282dd/src/components/preview/PaginatedSection.tsx) | มีเลขภายในหมวด แต่ยังไม่ใช่เลขเนื้อหาต่อเนื่องทั้งเล่มพร้อม TOC | LAY-07 |
| F36 | สร้าง PDF A4 และตรวจรูปโหลด | มีฐานแล้ว | [export-pdf.ts](https://github.com/zenecoil0-design/projectfinal/blob/5ad8310f46dc0f931c0aed6b7403504f5af282dd/src/lib/editor/export-pdf.ts) | มี html-to-image/jsPDF ตรวจภาพ/font/overflow; เป็นฐาน export ไม่ใช่การรับรองคุณภาพจริง | PDF-01 |
| F37 | บีบอัด PDF และยืนยันเมื่อถึง 10 MB | ต้องทำเพิ่ม | [export-pdf.ts](https://github.com/zenecoil0-design/projectfinal/blob/5ad8310f46dc0f931c0aed6b7403504f5af282dd/src/lib/editor/export-pdf.ts) | ลองบีบอัดแล้ว throw เมื่อเกิน; <=10,000,000 ยังผ่าน ต่างจากเป้าหมายต่ำกว่าและยืนยันที่เท่ากัน | PDF-04 |
| F38 | แยกพอร์ต/กัน response เก่าทับ | มีฐานแล้ว | [page.tsx](https://github.com/zenecoil0-design/projectfinal/blob/5ad8310f46dc0f931c0aed6b7403504f5af282dd/src/app/editor/page.tsx) | มี reset/loading และชุดทดสอบกรณีตอบช้า; ต้องครอบคลุม autosave ใหม่ด้วย | SAVE-06 |
| F39 | RLS/Storage/ความเป็นส่วนตัวครบระบบ | ต้องตรวจระบบจริง | [client.ts](https://github.com/zenecoil0-design/projectfinal/blob/5ad8310f46dc0f931c0aed6b7403504f5af282dd/src/lib/supabase/client.ts) | การกรอง user_id และ RPC ไม่แทน RLS/Storage policies; พบใช้ public URL ต้องตรวจการเข้าถึงจริง | SEC-01 |
| F40 | ชุดทดสอบเดิม | ต้องทำเพิ่ม | [editor.spec.ts](https://github.com/zenecoil0-design/projectfinal/blob/5ad8310f46dc0f931c0aed6b7403504f5af282dd/tests/e2e/editor.spec.ts) | พบ 2 unit/database tests และ 9 E2E tests; บางเคสยืนยันเพดาน 10 หน้า/หน้าว่างแบบเก่า ต้องปรับ | REG-01 |

## ลำดับงานที่แนะนำ

1. ตรวจ schema จริง, RLS, Storage และข้อมูลทดลอง แล้วออกแบบ snapshot/version/selected images/visibility/age mode ให้รองรับพอร์ตเดิม การลบ และสำเนาตั้งแต่ต้น
2. ปรับคลังเป็นชื่อบังคับ + รายละเอียดไม่บังคับ + Tags ไม่บังคับ; เกียรติบัตรสูงสุด 2 รูป ตรวจรายการเก่า 3–4 รูปก่อนทำ migration ไม่ลบทิ้งเงียบ ๆ
3. ทำ snapshot B, รับอัปเดต, การลบแบบแจ้งผลกระทบ และ CRUD พอร์ต/สำเนา ก่อนต่อ autosave เพื่อไม่ให้คำขอบันทึกเก่าเขียนข้อมูลที่ลบคืนมา
4. ทำ autosave และสถานะ, accordion, visibility, โหมดอายุ และซ่อนช่องว่าง
5. ทำ pagination รายการยาว, สารบัญ, เลขหน้ารวม, สามเทมเพลตและสองสี โดยใช้ layout เดียวกันสำหรับ preview/PDF
6. ปรับ PDF ไม่มีเพดาน 10 หน้าและขอยืนยันไฟล์ตั้งแต่ 10,000,000 bytes, ทำ forgot password และตรวจมือถือ/เดสก์ท็อปจริง
7. ปรับเทสต์เดิมที่ขัดข้อกำหนดใหม่ แล้วรันแผนทดสอบเต็มใน SYSTEM_TEST_PLAN.md

## ข้อควรระวังจากหลักฐาน

- `EditorSession` ใช้ snapshot เพื่อเทียบ dirty state ไม่ใช่ข้อมูล snapshot B ที่ถูกเก็บถาวรแยกจากคลัง
- RPC selection มี ownership check และ transaction เป็นฐานที่ควรรักษาไว้ แต่ไม่ได้พิสูจน์ RLS ทุกตารางและ Storage
- Playwright ใช้ mock Supabase ตาม playwright.config.ts; ผลผ่านใน mock ก็ยังยืนยัน Auth, RLS, Storage และอีเมลจริงไม่ได้
- Unit test `packPages` คาดหวังหน้าว่างและยอม card สูงเกินหน้า; E2E มีกรณีคาดหวังปฏิเสธเกิน 10 หน้า พฤติกรรมเหล่านี้ต้องแก้พร้อมข้อกำหนดใหม่ ไม่ลบทดสอบทิ้งเพียงเพื่อให้เขียว
- ยังไม่ได้รัน npm test, E2E, lint, build, ทดสอบอุปกรณ์จริง หรือเข้าถึง Supabase จริงในการตรวจรอบนี้ จึงไม่มีผล PASS ของระบบที่จะรายงาน
- เอกสารรอบนี้ไม่เปลี่ยนโค้ดแอป ไม่ใช้ผลทดสอบจากรายงานเก่ามาแทนผลรอบปัจจุบัน

อ่านแผนทดสอบเป้าหมายเต็มได้ที่ [SYSTEM_TEST_PLAN.md](SYSTEM_TEST_PLAN.md)

## อัปเดตหลังเริ่มงาน M00 (15 ตุลาคม 2026)

ผล audit ด้านบนเป็น static audit ณ baseline เดิม การรันจริงภายหลังอยู่ใน [M00_BASELINE_REPORT.md](M00_BASELINE_REPORT.md) ตรวจ discovery พบ E2E 9 เคส จึงแก้ตัวเลขเดิมที่นับเป็น 10; การผ่านชุดเดิมไม่เปลี่ยนสถานะฟีเจอร์ใหม่เป็นเสร็จ

อัปเดตหลักฐาน Supabase: เจ้าของส่ง metadata เวลา 2026-10-15T05:52:30Z และภาพ Auth แล้ว ผลอยู่ใน [M00_SCHEMA_REVIEW.md](M00_SCHEMA_REVIEW.md) พบ RPC selection ไม่อยู่ในผลรายงาน, relation policies ตรวจเจ้าของไม่ครบ, bucket เป็น public และ Confirm email ปิดอยู่ การยืนยันค่าตั้งค่าและ cascade จาก schema ยังไม่เปลี่ยนสถานะ F02/F16/F39 เป็นผ่าน end-to-end
