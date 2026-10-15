# ตรวจ UI คลังข้อมูล /my-data

สถานะต่อจากรายงาน UI: ประเด็น loadError/retry และคำเตือนข้อมูลค้างได้รับการดำเนินงานใน [MY_DATA_RESILIENCE_REVIEW.md](MY_DATA_RESILIENCE_REVIEW.md) แล้ว รายการข้อจำกัดด้านล่างเป็นสิ่งที่พบ ณ รอบ UI เดิม ให้ใช้รายงานใหม่สำหรับสถานะล่าสุด โดยเกียรติบัตร 2 รูปและ Editor Tags loadError ยังเป็นงานแยก

ฐานก่อนเริ่ม: local/remote `codex/portfolio-next-phase` ตรงกันที่ `1e43a74cca5e614f7da67527c9ed3672623c1eee`, working tree สะอาด ไม่แก้ main

## ส่วน 1 — หน้าและการศึกษา

- `src/app/my-data/page.tsx`: หัวหน้า/เมนูหมวดรองรับพื้นที่แคบ ไม่มี horizontal overflow; ปุ่มหมวดมี aria-pressed และ focus
- `src/components/my-data/EducationLibrary.tsx`: การ์ดจัดลำดับข้อความ/ข้อมูลรอง ปุ่มแยกจากชื่อยาว; label เชื่อม input, ช่องกรอก 16px บนมือถือ, สองคอลัมน์ตามพื้นที่ฟอร์ม; modal เลื่อน body และมีปุ่มท้ายฟอร์มคงที่ ปุ่มหลักชื่อบันทึก ปุ่มไอคอนมี accessible name
- เพิ่ม `tests/e2e/my-data.spec.ts` เนื่องจาก tests เดิมครอบคลุม Editor แต่ไม่มีเส้นทางคลัง CRUD
- Mock Playwright 2 tests ผ่าน: desktop 1440x1000/mobile 390x568, ข้อความ/Tags ยาว ไม่มี logo/ข้อมูลรอง, คลังว่าง, เพิ่ม/แก้ไข/โหลดกลับ, บันทึกล้มเหลวข้อมูลยังอยู่แล้วลองใหม่สำเร็จ, ยกเลิกแบบร่าง, ยกเลิกลบและเลือกภาพแล้วยกเลิก crop; ภาพหน้าจอตรวจด้วยตา
- eslint เฉพาะ 3 ไฟล์: 0 errors, warning img เดิม 2; git diff --check ผ่าน
- dev server Turbopack cache เริ่มไม่ได้หนึ่งรอบ ใช้ --webpack ใน config ชั่วคราวนอก repo แล้วผ่าน ไม่แก้ configuration โปรเจกต์

## ส่วน 2 — ผลงานและกิจกรรม

- `ActivityLibrary.tsx`: การ์ดชื่อ/รายละเอียด/Tags ตัดบรรทัด ปุ่มแยกแถว; ภาพรักษาสัดส่วนด้วย object-cover ตามกรอบเดิม; form/input/textarea/Tag buttons/พื้นที่รูป/ตัวนับ/ปุ่มลบรูป/modal เข้าชุดกับการศึกษา มี label และ focus
- ใช้ container queries สำหรับคอลัมน์ฟอร์มและรูป ไม่มีการเปลี่ยนจำนวนรูป การครอป หรือลำดับรูป
- Mock Playwright เฉพาะกิจกรรม 3 tests ผ่าน: loading, คลังว่าง, ภาพแนวตั้ง/แนวนอนและรายการไม่มีภาพ/Tags, ข้อความยาว, modal ที่ 1440x1000 และ 390x568, เพิ่ม/แก้ไข/โหลดกลับ/สลับหมวด, failure คงแบบร่างแล้ว retry, cancel form/crop/delete; ตรวจภาพด้วยตา
- eslint 0 errors, warning img เดิม 2; git diff --check ผ่าน
- ตรวจ AST ของ page/EducationLibrary/ActivityLibrary เทียบฐานก่อนเริ่ม: statements ก่อน render และ JSX handlers/value/disabled/validation/accept/multiple ไม่เปลี่ยน
- ส่วน 1 remote commit: `efafb4ad3932d3930d6689b72710a5d2a89de15c`

## ส่วน 3 — เกียรติบัตร

- `CertificateLibrary.tsx`: รักษา object-contain ทั้ง thumbnail และรูปในฟอร์ม เพิ่มกรอบและพื้นที่ว่างให้เห็นภาพเต็มทั้งแนวตั้ง/แนวนอน; ชื่อ/Tags ตัดบรรทัด ปุ่มแยกจากข้อความ; form/input/textarea/ตัวนับรูป/ปุ่มลบ/Tag buttons/modal เข้าชุดกับอีกสองหมวด
- ปรับเฉพาะ JSX/CSS/accessibility; จำนวนรูป ช่องกรอก required/date/หน่วยงาน validation และ handlers เดิมทั้งหมดคงเดิม
- Mock Playwright เกียรติบัตร 3 tests ผ่านที่ 1440x1000 และ 390x568: การ์ดชื่อ/Tags ยาว ภาพสองแนว ไม่มีรูป/Tags คลังว่าง loading เพิ่ม/แก้ไข/โหลดกลับ/สลับหมวด บันทึกล้มเหลวคงข้อมูลแล้ว retry, cancel form/crop/delete; ตรวจภาพด้วยตา
- eslint 0 errors, warning img เดิม 2; git diff --check และ AST handlers/validation เทียบฐานก่อนเริ่มผ่าน
- ส่วน 2 remote commit: `959012354671a0bf4a92f9d0af57ef8d7bd900e0`

## ข้อจำกัด/logic เดิมที่พบ (ไม่แก้ในงาน UI)

- ฟอร์มคลังปิดผ่าน resetForm โดยตรง และหน้าเปลี่ยนหมวดผ่าน setActiveTab: ไม่มี dirty-state warning เดิมให้รักษา การทดสอบยืนยันเพียงยกเลิก/เปิดใหม่ตามพฤติกรรมปัจจุบัน ไม่ถือว่าคำเตือนข้อมูลค้างผ่าน
- การศึกษาไม่มี loadError state: loadData log error แล้วใช้ข้อมูล fallback; ไม่สามารถแยกโหลดล้มเหลวจากคลังว่างด้วย JSX อย่างเดียวโดยไม่เปลี่ยน logic จึงไม่สร้างสถานะใหม่มาปิดบัง
- กิจกรรมมีรูปแบบ log error/fallback เดียวกัน ไม่มี loadError state เช่นกัน
- เกียรติบัตรไม่มี loadError state เช่นเดียวกัน และโค้ดเดิมยังจำกัด/นับ 4 รูป (totalImages, handleFiles, validation, JSX) ต่างจากเอกสารที่ตั้งเป้า 2 รูป: รอบนี้คงจำนวนรูปและข้อมูลเก่าไว้ทั้งหมดตามขอบเขต ไม่ลบรูปหรือเปลี่ยน validation
- บันทึกล้มเหลวใช้ alert เดิม สำเร็จโหลดรายการและปิดฟอร์ม ไม่มี success banner; ไม่เพิ่มข้อความสำเร็จปลอม
- คงคำยืนยันลบเดิมและ handlers เดิม ไม่ทดสอบลบข้อมูลจริง/Storage และไม่รับรองผลกระทบการลบทุกพอร์ตจากงานนี้
- ปัญหา Tags loadError ใน Editor ที่ส่งต่อมาอยู่นอกขอบเขต ไม่แก้ Editor

การตรวจทั้งหมดข้างต้นเป็น mock ใน Chromium บนเครื่องทดสอบ ไม่ใช่ Supabase จริงหรือโทรศัพท์จริง ไม่รัน migration/reset/ฐานข้อมูลทั้งชุด

## ผลรวมหลังครบสามส่วน

| ส่วน | Commit ที่ตรวจ remote แล้ว |
| --- | --- |
| หน้าและการศึกษา | `efafb4ad3932d3930d6689b72710a5d2a89de15c` |
| ผลงานและกิจกรรม | `959012354671a0bf4a92f9d0af57ef8d7bd900e0` |
| เกียรติบัตร | `a9e189542dddd0607cae46ccafdd9af61dd5def2` |

- Production build หนึ่งครั้ง: `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key npm run build` ผ่าน compile/TypeScript/static generation; มี warning middleware convention เดิม
- ทดสอบรวมกับ production build: `LD_LIBRARY_PATH=/workspace/scratch/c9bc59bd45e7/browser-runtime PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/workspace/scratch/c9bc59bd45e7/browser-runtime/chromium npx playwright test tests/e2e/my-data.spec.ts --reporter=line` — **9 passed (18.4s)**
- รอบรวมเพิ่มตรวจเปิดแก้ไขรายการที่มีภาพ 2 รูปในทั้งสองขนาด และเลือกรูปต้นฉบับแล้วเห็น preview ก่อนยกเลิกฟอร์ม (ไม่ upload); ไม่ได้ทดสอบ crop export ใหม่หรือ Storage จริง เพราะไม่ได้แก้กลไกเหล่านี้
- จอ desktop 1440x1000/mobile 390x568 ใช้ภาพจำลองแนวตั้ง/แนวนอน ชื่อและ Tags ไทยยาว ไม่มีภาพ/Tags/ข้อมูลรอง; ตรวจ overflow, ปุ่มท้าย modal และภาพด้วยตา มี 16 PNG จาก production mock run
- lint ตามแต่ละส่วน 0 errors, warning img เดิมรวม 6; test file lint ผ่านหลังเพิ่มกรณีรวม; git diff --check ผ่าน
- AST เทียบฐาน `1e43a74` ยืนยัน root logic และ onClick/onChange/onSubmit/value/disabled/required/min/max/step/accept/multiple ของ source ทั้ง 4 ไฟล์ไม่เปลี่ยน
- หลังผลผ่านไม่มีการแก้ source เพิ่ม จึงไม่รัน build/tests ซ้ำ; commit ปิดงานเก็บเฉพาะกรณีทดสอบรวมและรายงานนี้

### ส่งต่อ Astra

งาน UI ครบสามหมวด รักษาธีมเดิม คอลัมน์ตามพื้นที่ฟอร์ม ช่องกรอก/label/ปุ่ม/Tags/focus/modal เข้าชุดกับ Editor; ไม่แตะ Editor, Preview/A4/PDF, query/mapping/handlers/validation หรือฐานข้อมูล

ประเด็นที่ต้องวางแผนแยก: ไม่มี unsaved warning ในคลังเดิม, ไม่มี loadError สำหรับแยกโหลดล้มเหลวจากคลังว่าง, เกียรติบัตรยังเป็น 4 รูปในโค้ดเดิมต่างจากเป้าหมาย 2; คงไว้ทั้งหมดในรอบ UI นี้ ต้องตรวจ HEAD จริงและรักษางานใหม่กว่าเมื่อเริ่มรอบถัดไป
