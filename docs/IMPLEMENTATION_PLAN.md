> สถานะตรวจเอกสารล่าสุด 2026-10-20: ทำ UI คลัง/ตัวเลือก, load/retry/draft guards, Accordion, Editor Tags, Minimal หกหมวด, PDF ไม่มีเพดานหน้า/ยืนยันไฟล์ใหญ่, เลขต่อเนื่องและสารบัญระดับหมวดแล้วตามขอบเขตแต่ละรอบ ไม่ใช่ครบทุกข้อกำหนด ดู [ผลตรวจชนิด tests และสถานะ](verification/TEST_TYPES_AND_STATUS_REVIEW.md) ผล browser/PDF ที่อ้างเป็นหลักฐานรอบก่อน; รอบนี้ตรวจ full-repo typecheck และ PGlite tests เท่านั้น
>
> หลักฐานเจ้าของ 2026-10-15: reset/foundation ทำแล้ว เก็บบัญชี 2 บัญชี Storage เหลือ 15 placeholders และยืนยันบันทึกปก/รีเฟรชผ่าน; การยกเว้น backup ใช้เฉพาะข้อมูลทดลองชุดนั้น ไม่ให้รันซ้ำหรือถือว่า integration ทั้งระบบผ่าน ดู [M01_DATABASE_SETUP.md](M01_DATABASE_SETUP.md)

> Checkpoint ถัดมา: [Section visibility](verification/SECTION_VISIBILITY_REVIEW.md) เพิ่ม UI/Preview/PDF และ persistence contract แยกรายพอร์ตแล้ว แต่ migration 20261020084510 ยังไม่ติดตั้งจริง เนื่องจาก catalog reads timeout ต้องตรวจ schema/grants/staging/integration ก่อนเปิดใช้กับระบบจริง; ไม่ปิด M01/M06/M08 ทั้งส่วน

> Readiness follow-up: [ชุดตรวจฐานและ integration](verification/SECTION_VISIBILITY_INTEGRATION_READINESS.md) เตรียม read-only preflight และ local PostgreSQL/PostgREST JWT runner แล้ว แต่ target catalog/history ยัง timeout, advisor ไม่คืนผล และเครื่องไม่มี local backend/container runtime จึงยัง NOT_RUN สำหรับ API integration ไม่ถือว่าพร้อมติดตั้งหรือเปลี่ยน visibility เป็น DONE; สถานะการติดตั้งบน target ยังต้องยืนยัน ไม่อนุมานว่าไม่มีตารางจาก timeout

# แผนพัฒนาระบบและติดตามสถานะ — เว็บแอปพลิเคชันจัดทำแฟ้มสะสมผลงาน

ฉบับ 1.5 • 20 ตุลาคม 2569 (Asia/Bangkok)

## 1. เป้าหมายของเอกสาร

เอกสารนี้เป็นแผนงานกลางสำหรับไค ผู้พัฒนา หรือ AI ที่มารับช่วงต่อ ใช้บอกว่าจะทำอะไร ทำก่อน–หลังอย่างไร ต้องได้ผลลัพธ์อะไร และมีหลักฐานแบบใดจึงนับว่าเสร็จ แบ่งเป็น **13 ส่วนใหญ่ (M00–M12) และ 65 งานย่อย** รวมช่วงเตรียมงานและทดสอบส่งมอบ

ฐานเริ่มแผนทำ M00 baseline และ M01 foundation แล้ว ต่อมามี checkpoint UI/ความทนทาน/Accordion/เทมเพลต/PDF ตามรายงาน verification ที่เชื่อมในตารางด้านล่าง รายงานฐานเดิมอยู่ใน [M00_BASELINE_REPORT.md](M00_BASELINE_REPORT.md) เจ้าของรัน foundation บน Supabase และส่งผลแล้ว แต่ snapshot/revision และ integration ทั้งระบบยังไม่จบ

- Repository: `zenecoil0-design/projectfinal`
- Branch งานปัจจุบัน: `codex/portfolio-next-phase`
- เจ้าของสั่งให้นำ branch เดิมเข้า main ก่อนทำต่อ: ดำเนินการแล้วที่ `c1cca0a` ก่อนแก้ไฟล์รอบนี้ ดู [ผล inventory/branch](M00_INVENTORY_REVIEW.md)
- HEAD ก่อนเพิ่มแผนนี้: `b68c83ebbbb951557ff719626d89f13ebe09f070`
- โค้ดที่ audit อ้างอิง: `5ad8310f46dc0f931c0aed6b7403504f5af282dd`
- ตรวจ HEAD ใหม่ทุกครั้งก่อนเริ่มงาน หากมีโค้ดเปลี่ยน ให้ตรวจส่วนที่กระทบและอัปเดต baseline ห้าม reset กลับ commit ในเอกสาร

## 2. อ่านอะไรและใช้ข้อกำหนดไหน

1. [AGENTS.md](../AGENTS.md): กติกาการทำงาน การตรวจและ commit/push
2. [PRD.md](../PRD.md): พฤติกรรมผลิตภัณฑ์และ AC-01 ถึง AC-20
3. [ARCHITECTURE.md](../ARCHITECTURE.md): โครงสร้างปัจจุบัน เป้าหมาย และข้อเสนอทางเทคนิค
4. [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md): หน้าจอ ฟอร์ม A4 เทมเพลตและสี
5. [IMPLEMENTATION_AUDIT.md](IMPLEMENTATION_AUDIT.md): หลักฐานโค้ดและช่องว่าง F01–F40
6. [SYSTEM_TEST_PLAN.md](SYSTEM_TEST_PLAN.md): ขั้นตอน/ผลคาดหวัง 100 เคสและ E2E 4 เส้นทาง

คำสั่งล่าสุดที่ผู้ใช้ยืนยันมาก่อนเอกสารเก่า หากเอกสารขัดกันให้บันทึกประเด็นและตรวจคำยืนยัน ไม่เลือกเงื่อนไขที่เขียนง่ายกว่า ข้อเสนอทางเทคนิคในแผนยังต้องตรวจ schema/โค้ดจริง ไม่ถือว่าผู้ใช้อนุมัติการลบข้อมูลหรือเปลี่ยนขอบเขตผลิตภัณฑ์ทั้งหมด

ไฟล์แนบเก่าหรือภาพ schema ใช้ประกอบได้เมื่ออ่านได้ แต่ไม่ใช่ฐานยืนยัน schema/RLS/Storage ปัจจุบัน หากอ่านไม่ได้ให้ระบุว่าอ่านไม่ได้ ไม่เดาข้อมูลจากชื่อไฟล์ และไม่จำเป็นต้องรื้อฟอร์มใหม่เมื่อโค้ดปัจจุบันมีอยู่แล้ว

## 3. สถานะ: แยกของเดิมออกจากงานใหม่

คอลัมน์ “ฐานเดิม” ใช้แยกฐาน audit เดิมจาก checkpoint/หลักฐานที่ทำต่อมา โดยบอกเวลาและลิงก์ ส่วน “สถานะงาน” ครอบคลุมผลส่งมอบทั้งหมดของแถวนั้น การมีโค้ดหรือจบรอบย่อยไม่ทำให้ทั้งแถวเป็น DONE โดยอัตโนมัติ ลิงก์รายงานเดิมเป็นผล ณ รอบนั้น ไม่ใช่ผลรันทดสอบใหม่วันที่ 20 ต.ค.

| สถานะงาน | ความหมาย | เงื่อนไขการใช้ |
| --- | --- | --- |
| TODO | ยังไม่เริ่มงานตามแผน | อาจมีโค้ดเดิมอยู่แล้ว และอาจรอ dependency ตามปกติ |
| READY | พร้อมหยิบมาทำ | prerequisites ของงานนั้นตรวจแล้ว ผู้รับงานยังไม่ลงมือ |
| IN_PROGRESS | กำลังดำเนินการจริง | ต้องมีผู้รับผิดชอบ จุดเริ่ม/HEAD และสิ่งที่กำลังแก้ |
| PARTIAL | มีผลส่งมอบบางส่วนพร้อมหลักฐาน แต่ยังไม่ครบขอบเขตแถวนั้น | ระบุส่วนที่ทำแล้ว หลักฐาน และส่วนที่เหลือ; ไม่เท่ากับ DONE หรือมีผู้กำลังแก้ส่วนที่เหลืออยู่ตอนนี้ |
| BLOCKED | ติดอุปสรรคจริง | ระบุเหตุผล สิ่งที่ขาด คน/งานที่จะปลด และงานที่ยังทำต่อได้ |
| VERIFY | ทำ implementation แล้ว รอตรวจ | ยังมี validation/test/visual review ที่ต้องทำ |
| READY_TO_PUSH | ตรวจตามเกณฑ์ผ่านแล้ว รอขึ้น branch | ระบุผลตรวจและไฟล์ที่เปลี่ยน |
| DONE | ตรวจผ่านและ push แล้ว | มี commit/หลักฐานและไม่มีเงื่อนไขจบค้าง |
| REOPENED | เคยจบแต่พบ regression หรือ requirement ใหม่ | ผูก defect/การตัดสินใจที่ทำให้เปิดใหม่ |

**สถานะผลทดสอบแยกต่างหาก:** NOT_RUN, PASS, FAIL, BLOCKED ตาม SYSTEM_TEST_PLAN ห้ามนำ READY หรือมีโค้ดแล้วไปแทน PASS

ประวัติ checkpoint 15 ต.ค. ฉบับ 1.4 เคยสรุป 3 DONE / 2 BLOCKED / 2 IN_PROGRESS / 58 TODO ตัวเลขนี้ไม่ใช่สถานะปัจจุบันและไม่ใช้คำนวณเปอร์เซ็นต์ความสมบูรณ์ หลังมีงานต่อเนื่อง ให้ใช้ตารางรายงานย่อยด้านล่างและ [ตารางก่อน/หลังพร้อมหลักฐาน](verification/TEST_TYPES_AND_STATUS_REVIEW.md) แทน ไม่รวมจำนวน test คนละรอบเป็นผลการรันครั้งเดียว

สถานะส่วนใหญ่: READY เมื่อเริ่มงานย่อยแรกได้; IN_PROGRESS เมื่อมีงานย่อยเริ่มจริงหรือมี checkpoint PARTIAL/DONE แต่ส่วนอื่นยังค้าง (ไม่ได้หมายความว่ากำลังเขียนฟีเจอร์เหล่านั้นในรอบนี้); DONE เฉพาะเมื่องานย่อยทั้งหมด DONE และเกณฑ์จบส่วนผ่าน งานที่รอ prerequisite ตามแผนให้คง TODO ไม่ใช้ BLOCKED จนมีอุปสรรคจริง

## 4. ลำดับทำงานและขอบเขต

ลำดับแนะนำสำหรับผู้พัฒนาหนึ่งคน: **M00 → M01 → M11 → M02 → M03 → M04 → M05 → M06 → M07 → M08 → M09 → M10 → M12**

M11 อยู่กลุ่มบัญชีจึงใช้รหัสแยก แต่แนะนำทำหลังฐานสิทธิ์ M01 เพื่อให้ Auth พร้อมตรวจ flow อื่น รหัสส่วนเป็นตัวระบุถาวร ไม่ใช่ข้อบังคับให้เรียงเลขเสมอ

- Dependency ในตารางคือเงื่อนไขที่ต้องผ่านก่อนเริ่ม implementation ของส่วนนั้น งานอ่าน/ออกแบบที่ไม่แก้ระบบทำเตรียมไว้ได้
- งานย่อยในส่วนเดียวกันทำตามลำดับ .01 → .05 โดยรับผลจากงานก่อนหน้า เว้นแต่บันทึกเหตุผลว่าปรับลำดับแล้วไม่กระทบสัญญาข้อมูล
- หลังจบแต่ละส่วน ให้ตรวจ commit และ push ขึ้น branch งานก่อนเริ่มส่วนถัดไป หาก checkpoint ย่อยพร้อมและไม่ทำระบบพังสามารถ commit/push ก่อนจบส่วนได้ แต่ไม่เปลี่ยนทั้งส่วนเป็น DONE
- M12 เป็นรอบทดสอบรวมสุดท้าย แต่ทุกส่วนต้องทดสอบเฉพาะจุดระหว่างทำ ไม่เก็บข้อผิดพลาดทั้งหมดไปตรวจท้ายงาน
- เมื่อ M09 เปลี่ยนฟอนต์/ระยะ/รูปแบบ ต้องรัน M08 regression ซ้ำ แม้ M08 เคยจบแล้ว
- ไม่เพิ่ม admin, login provider ใหม่, editor ออกแบบอิสระ, ค่าใช้บริการ หรือเพดานจำนวนหน้าใหม่
- main รับ snapshot เดิมถึง c1cca0a ตามคำสั่งเจ้าของแล้ว; งานต่อไปยังขึ้น branch ใหม่ ไม่ merge/deploy อัตโนมัติ

## 5. ภาพรวมส่วนใหญ่

| รหัส | ส่วนใหญ่ | ต้องผ่านก่อน | สถานะ | ผลลัพธ์หลัก |
| --- | --- | --- | --- | --- |
| M00 | ตั้งต้นงานและยืนยันสภาพแวดล้อม | เริ่มได้ทันที | BLOCKED | ได้ฐานโค้ดและข้อมูลจริงที่เชื่อถือได้ก่อนออกแบบ migration |
| M01 | โครงสร้างข้อมูล สิทธิ์ และสัญญาการบันทึก | M00 (เตรียม local ต่อได้ตามคำสั่งล่าสุด) | IN_PROGRESS | มีฐานข้อมูลรองรับข้อกำหนดทั้งหมดโดยไม่ทำฟีเจอร์เดิมเสีย |
| M02 | คลังข้อมูลและ Tags ตามข้อกำหนดใหม่ | M01 | IN_PROGRESS | UI/load-retry/dirty guards ทำแล้วบางส่วน; validation/จำนวนรูป/version/integration ยังค้าง |
| M03 | เลือกข้อมูลและรูปเข้าแต่ละพอร์ตแบบ B | M01, M02 | IN_PROGRESS | UI/ลำดับ/Editor Tags retry ทำแล้ว; snapshot/เลือกรูปรายพอร์ต/รับอัปเดตยังค้าง |
| M04 | รับอัปเดต ลบคลัง และวงจรข้อมูล | M03 | TODO | ข้อมูลหลายพอร์ตสอดคล้องโดยผู้ใช้ควบคุมการรับอัปเดตได้ |
| M05 | จัดการพอร์ตและ Autosave | M04 | IN_PROGRESS | lifecycle/dirty/export guards บน manual save มีแล้ว; Autosave/conflict/จัดการพอร์ตยังค้าง |
| M06 | ฟอร์มเนื้อหา อายุ และ Editor แบบพับขยาย | M05 | IN_PROGRESS | UI/Accordion และ visibility checkpoint ทำแล้วใน mock; migration visibility ยังไม่ติดตั้งจริง; อายุสองโหมด/กฎข้อมูลว่างยังค้าง |
| M07 | Responsive หน้าหลักและ Preview | M06 | IN_PROGRESS | แผงมือถือ/fit/section-ID scroll มีหลักฐาน mock; zoom/อุปกรณ์จริง/หน้าแรกยังค้าง |
| M08 | Document model การแบ่งหน้า สารบัญ และเลขหน้า | M06, M07 | IN_PROGRESS | เลข/TOC/ไม่มีเพดานหน้าและ user visibility เชื่อมแล้วใน checkpoint; full model/split/กฎข้อมูลว่าง/integration ยังไม่ครบ |
| M09 | เทมเพลตสมบูรณ์สามแบบและสองสี | M08 | IN_PROGRESS | Minimal หกหมวดและทั้งสามแบบมี TOC/เลขหน้า; สองสี/ขอบเขตเป้าหมายอื่นยังค้าง |
| M10 | PDF พร้อมใช้งานและการยืนยันไฟล์ใหญ่ | M05, M08, M09 | IN_PROGRESS | PDF หลายหน้า/guards/ยืนยัน Blob เดิมมีหลักฐาน; revision/quality acceptance/อุปกรณ์จริงยังค้าง |
| M11 | บัญชีและการกู้รหัสผ่าน | M00, M01 | TODO | เข้าสู่ระบบได้ตามเงื่อนไขพัฒนาและกู้บัญชีได้ครบวงจร |
| M12 | ทดสอบรวม แก้ข้อผิดพลาด และส่งมอบ | M01–M11 ทุกส่วนผ่านเกณฑ์จบ | IN_PROGRESS | focused regression/typecheck ทำแล้ว; staging/100 เคส/อุปกรณ์จริง/ส่งมอบยังไม่ครบ |

## 6. งานย่อยและเกณฑ์จบแต่ละส่วน

ข้อความผู้รับผิดชอบ M00 และ “ยังไม่มอบหมายส่วนอื่น” ในฐานฉบับ 1.4 เป็นประวัติเริ่มแผน ต่อมามีคำสั่งเฉพาะรอบและรายงาน verification แล้ว รอบ 20 ต.ค. Sol รับงานแก้ types/tests และปรับสถานะเท่านั้น ไม่ได้รับมอบหมายให้เริ่มฟีเจอร์ที่เหลือ ตำแหน่งไฟล์ต่อไปนี้เป็นจุดเริ่มตรวจ ไม่ใช่การยืนยันว่าผลส่งมอบเป้าหมายครบแล้ว

### M00 — ตั้งต้นงานและยืนยันสภาพแวดล้อม

**เป้าหมาย:** ได้ฐานโค้ดและข้อมูลจริงที่เชื่อถือได้ก่อนออกแบบ migration  
**สถานะส่วน:** BLOCKED • **Dependency:** ได้ metadata/inventory และหลักฐาน reset/foundation จากเจ้าของแล้ว; ยังขาด staging fixtures/การยืนยันปิดทะเบียน M00.04 ตามข้อยกเว้นข้อมูลเดิม ดู M01_DATABASE_SETUP.md และรายงานสถานะรอบนี้ ไม่ขอรัน reset ซ้ำ
**จุดเริ่มตรวจ:** `AGENTS.md, package.json, package-lock.json, playwright.config.ts, supabase/migrations`  
**ผูกกับ audit:** F02,F12,F16,F39,F40  
**เคสตรวจรับ:** REG-02, SEC-01, SEC-02

| งาน | สถานะงาน | ฐานเดิม | สิ่งที่ต้องทำ | ผลส่งมอบ/เงื่อนไขผ่าน |
| --- | --- | --- | --- | --- |
| M00.01 ตรวจ baseline และกติกา | DONE | มีเอกสาร/รายงานแล้ว | ตรวจ remote/branch/working tree และ HEAD; อ่านเอกสารหลักกับคู่มือ Next.js ที่ติดตั้ง รักษางานค้างของผู้ใช้ | บันทึก HEAD และรายการเปลี่ยนหลัง audit; ไม่ reset ย้อนหลัง |
| M00.02 ตั้งสภาพแวดล้อมทดสอบ | DONE | มี config/test เดิม | ติดตั้งตาม lockfile แยก mock และ staging ตรวจ build config ไม่ใส่ secret ในรายงาน | รัน baseline lint/build/tests และเก็บผลจริง; ปัญหาเดิมแยกจากปัญหาใหม่ |
| M00.03 สำรวจ Supabase จริง | DONE | ได้ metadata และภาพ Auth จากเจ้าของแล้ว | อ่าน schema เต็ม constraints RPC RLS Storage policies และ Auth settings; ตรวจว่า migration เดิมติดตั้งแล้วหรือไม่ | มีรายการสิ่งที่ยืนยันได้/ยังเข้าถึงไม่ได้; ภาพ schema เก่าไม่ใช้แทนข้อมูลจริง |
| M00.04 สำรวจข้อมูลทดลองและสำรอง | BLOCKED | ประวัติเดิมติด backup; เจ้าของยกเว้นเฉพาะชุดทดลองและรัน reset แล้วตาม [M01](M01_DATABASE_SETUP.md) | ต้องยืนยันปิดทะเบียน/เกณฑ์ backup-restore ที่ยังใช้กับข้อมูลใหม่ ไม่ถือว่าข้อขัดข้องทั้งหมดคลี่คลายจากบันทึกเก่า | ไม่เปลี่ยนเป็น PASS/DONE ในรอบเอกสาร ไม่รัน reset/backup กับฐานจริงหรือขอ reset ซ้ำ |
| M00.05 เตรียม fixtures และข้อสรุปทางเทคนิค | BLOCKED | มีแผนทดสอบแล้ว | สร้างบัญชี A/B และข้อมูลทดสอบตาม SYSTEM_TEST_PLAN; ลงทะเบียนคำถามที่ยังเปิด | มี fixtures ที่ reset แยกเคสได้ และรายการคำถามพร้อมผู้รับผิดชอบ |

**เกณฑ์จบ M00:** งานย่อย .01–.05 ต้องครบผลส่งมอบ เคสที่เกี่ยวข้องกับส่วนนี้มีผลจริงหรือเหตุผลที่ยังรันไม่ได้ หากเงื่อนไขจำเป็นยัง BLOCKED ห้ามปิดเป็น DONE อัปเดตทะเบียนงาน/หลักฐาน และ push commit สำเร็จก่อนส่งต่อ ผลทดสอบแบบ mock ต้องระบุว่าเป็น mock

### M01 — โครงสร้างข้อมูล สิทธิ์ และสัญญาการบันทึก

**เป้าหมาย:** มีฐานข้อมูลรองรับข้อกำหนดทั้งหมดโดยไม่ทำฟีเจอร์เดิมเสีย  
**สถานะส่วน:** IN_PROGRESS • **Dependency:** M00; เจ้าของยืนยัน reset/foundation/ปกแล้ว แต่ staging/integration ของขอบเขต M01 ที่เหลือยังรอ ไม่ใช่รอให้ลง foundation เดิมซ้ำ
**จุดเริ่มตรวจ:** `supabase/migrations, src/lib/supabase, src/lib/editor, src/store`  
**ผูกกับ audit:** F11,F12,F13,F14,F16,F19,F23,F26,F31,F39  
**เคสตรวจรับ:** SEC-01, SEC-02, SEC-03, SEC-04

| งาน | สถานะงาน | ฐานเดิม | สิ่งที่ต้องทำ | ผลส่งมอบ/เงื่อนไขผ่าน |
| --- | --- | --- | --- | --- |
| M01.01 ออกแบบข้อมูลพอร์ตและ snapshot | TODO | มี relations เดิม ไม่มี B ถาวร | กำหนด source ID/version, snapshot payload, selected asset IDs, sort_order, revision, visibility, template/colors, age mode; ตรวจ mapping schema จริงก่อนกำหนดชื่อตาราง | บันทึก data contract และแผนเปลี่ยนข้อมูลที่ caller/store/preview ใช้ตรงกัน |
| M01.02 ออกแบบการเขียนและ conflict | TODO | มี RPC selection เดิม | กำหนด atomic writes, expected revision, error รูปแบบเดียว, การปฏิเสธ stale request และการ retry ไม่สร้างข้อมูลซ้ำ | มีสัญญา request/response และกรณี conflict/unauthorized/not found ที่ทดสอบได้ |
| M01.03 ทำ migration และ backfill | IN_PROGRESS | foundation มีหลักฐานเดิม; [visibility migration](verification/SECTION_VISIBILITY_REVIEW.md) เตรียม/PGlite-tested เท่านั้น ยังไม่ลงจริง | ตรวจ catalog/staging ก่อนติดตั้งแยก; snapshot/backfill/revision ยังไม่ทำ | ไม่รัน migration/reset เดิมซ้ำ ไม่อ้างว่า visibility พร้อมใช้บนฐานจริง |
| M01.04 บังคับ ownership และ validation | IN_PROGRESS | relation ownership/title/grants ผ่าน local; image limits ยังไม่ทำ | RLS/RPC ตรวจเจ้าของรายการ รูป Tags พอร์ต เพดานภาพ และชื่อบังคับ; ไม่พึ่ง UI | A ไม่เข้าถึง B ผ่าน API โดยตรง; invalid writes rollback ได้ |
| M01.05 กำหนดวงจรไฟล์ภาพ | TODO | ยังไม่มีวงจร snapshot asset | ใช้ asset identity/object key คงที่แยกเวอร์ชัน เก็บ reference และ cleanup retry; ตรวจ public URL กับนโยบายจริง | snapshot เก่ามีไฟล์จริงให้โหลด; ไฟล์ที่มีผู้ใช้อ้างอิงไม่ถูก cleanup |

**เกณฑ์จบ M01:** งานย่อย .01–.05 ต้องครบผลส่งมอบ เคสที่เกี่ยวข้องกับส่วนนี้มีผลจริงหรือเหตุผลที่ยังรันไม่ได้ หากเงื่อนไขจำเป็นยัง BLOCKED ห้ามปิดเป็น DONE อัปเดตทะเบียนงาน/หลักฐาน และ push commit สำเร็จก่อนส่งต่อ ผลทดสอบแบบ mock ต้องระบุว่าเป็น mock

### M02 — คลังข้อมูลและ Tags ตามข้อกำหนดใหม่

**เป้าหมาย:** คลังทั้งสามหมวดพร้อมเป็นแหล่งข้อมูลที่ถูกต้อง  
**สถานะส่วน:** IN_PROGRESS • **Dependency:** M01; ส่วนที่เหลือยังต้องใช้ data contract ใหม่
**จุดเริ่มตรวจ:** `src/components/my-data, src/components/images/CropInput.tsx, src/app/my-data`  
**ผูกกับ audit:** F04,F05,F06,F07,F08,F09  
**เคสตรวจรับ:** LIB-01, LIB-02, LIB-03, LIB-04, LIB-05, LIB-06, LIB-07, LIB-08, LIB-09, LIB-10, LIB-11

| งาน | สถานะงาน | ฐานเดิม | สิ่งที่ต้องทำ | ผลส่งมอบ/เงื่อนไขผ่าน |
| --- | --- | --- | --- | --- |
| M02.01 ปรับฟอร์มกิจกรรม/เกียรติบัตร | PARTIAL | [UI คลัง](verification/MY_DATA_UI_REVIEW.md) จัดการ์ด/modal/input/รูปแล้ว | ยังมีวันที่/หน่วยงานและ validation เดิม; ปรับตามข้อกำหนดพร้อมแผนรักษาข้อมูลเก่า | ไม่ใช้ผล UI mock แทนการตรวจ title-only/validation/API ครบ |
| M02.02 จัดข้อจำกัดภาพ | TODO | เกียรติบัตรเดิมยังเป็น 4 | กิจกรรม 4 เกียรติบัตร 2; ตรวจเพิ่มพร้อมกัน/แก้ไข/ไฟล์เสีย; รักษารูปเดิมเมื่อ error | UI และชั้นข้อมูลใช้ข้อจำกัดตรงกัน ไม่ตัดรูปส่วนเกินเงียบ ๆ |
| M02.03 รักษาฟอร์มการศึกษาและรูป | PARTIAL | [UI](verification/MY_DATA_UI_REVIEW.md) ปรับฟอร์ม/optional logo/ข้อความยาว; CRUD mock ผ่าน | ยังต้องตรวจ integration จริง/อุปกรณ์จริงและ validation ตามเกณฑ์ทั้งหมด | ผล mock ไม่แทนสิทธิ์/Storage จริง |
| M02.04 จัด Tags ส่วนตัว | PARTIAL | [load/retry](verification/MY_DATA_RESILIENCE_REVIEW.md) แยก Tags failure และปิด save เมื่อ metadata ไม่ครบแล้ว | ยังต้องตรวจ Tags ข้ามบัญชีและการสร้าง/กรองผ่าน API จริงตาม M01 | ไม่อ้างว่า retry mock พิสูจน์ RLS แล้ว |
| M02.05 ทำ manual save ของคลังให้ครบ | PARTIAL | [dirty guard](verification/MY_DATA_RESILIENCE_REVIEW.md) ครอบคลุม cancel/close/category/Link/beforeunload; fail เก็บ draft | Browser Back/Forward guard, version และ atomic upload/DB/cleanup ยังไม่ครบ | การเก็บ draft ไม่ได้ rollback คำขอที่สำเร็จไปแล้ว; ต้องตรวจ integration จริง |

**เกณฑ์จบ M02:** งานย่อย .01–.05 ต้องครบผลส่งมอบ เคสที่เกี่ยวข้องกับส่วนนี้มีผลจริงหรือเหตุผลที่ยังรันไม่ได้ หากเงื่อนไขจำเป็นยัง BLOCKED ห้ามปิดเป็น DONE อัปเดตทะเบียนงาน/หลักฐาน และ push commit สำเร็จก่อนส่งต่อ ผลทดสอบแบบ mock ต้องระบุว่าเป็น mock

### M03 — เลือกข้อมูลและรูปเข้าแต่ละพอร์ตแบบ B

**เป้าหมาย:** พอร์ตเก็บเนื้อหาของตนเองและเลือกภาพโดยไม่แก้คลัง  
**สถานะส่วน:** IN_PROGRESS • **Dependency:** M01, M02; snapshot/asset contract ยังไม่ทำ
**จุดเริ่มตรวจ:** `src/components/forms/{EducationForm,ActivityForm,CertificateForm}.tsx, src/lib/editor/save-selection.ts, src/store`  
**ผูกกับ audit:** F10,F11,F12,F13,F14  
**เคสตรวจรับ:** SEL-01, SEL-02, SEL-03, SEL-04, SEL-05, SEL-06, SNP-01

| งาน | สถานะงาน | ฐานเดิม | สิ่งที่ต้องทำ | ผลส่งมอบ/เงื่อนไขผ่าน |
| --- | --- | --- | --- | --- |
| M03.01 โหลดข้อมูลล่าสุดก่อนเลือก | PARTIAL | [UI selection](verification/LIBRARY_SELECTION_UI_REVIEW.md) และ [Editor Tags](verification/EDITOR_TAG_LOADING_REVIEW.md): main/metadata error แยก retry ไม่ทับ draft/baseline | ยังไม่มี source version/รับอัปเดตหลังแก้คลังตามแบบ B; พับ Accordion ไม่ fetch ใหม่ | Tags retry ไม่ส่ง Tags ใน save payload และไม่ markSaved; ยังต้องตรวจ integration |
| M03.02 เลือกและจัดลำดับ | PARTIAL | [selection UI](verification/LIBRARY_SELECTION_UI_REVIEW.md) มี checkbox/ลำดับ/จำนวน/save fail/reload mock ครบสามหมวด | ยืนยันกับ integration จริงและ snapshot contract เมื่อทำ M03.04 | ไม่อ้างว่าลำดับ mock พิสูจน์แบบ B หรือเลือกรูปรายพอร์ตแล้ว |
| M03.03 เลือกชุดรูปต่อพอร์ต | TODO | ยังไม่พบ | เลือก 0–4/0–2 รูปด้วย asset ID แยก checkbox รายการกับรูป | P1/P2 ใช้รูปต่างกันได้ คลังมีรูปครบและไม่มีกรอบเมื่อเลือกศูนย์รูป |
| M03.04 บันทึก snapshot ถาวร | TODO | ยังไม่พบ B | คัดลอก payload/version/selected assets เข้าแต่ละพอร์ตแบบ atomic; โหลด preview จาก snapshot | การแก้คลังไม่ทับพอร์ตเงียบ ๆ และลำดับ/รูป persist |
| M03.05 รองรับพอร์ตเดิมและข้อผิดพลาด | PARTIAL | RPC atomic เดิมและ [Tags retry](verification/EDITOR_TAG_LOADING_REVIEW.md) รักษา selection/order/dirty; local [foundation tests](verification/TEST_TYPES_AND_STATUS_REVIEW.md) ผ่าน | backfill/snapshot/version/selected assets และ live integration ยังไม่ครบ | ผล PGlite/Browser mock ไม่แทนระบบจริง |

**เกณฑ์จบ M03:** งานย่อย .01–.05 ต้องครบผลส่งมอบ เคสที่เกี่ยวข้องกับส่วนนี้มีผลจริงหรือเหตุผลที่ยังรันไม่ได้ หากเงื่อนไขจำเป็นยัง BLOCKED ห้ามปิดเป็น DONE อัปเดตทะเบียนงาน/หลักฐาน และ push commit สำเร็จก่อนส่งต่อ ผลทดสอบแบบ mock ต้องระบุว่าเป็น mock

### M04 — รับอัปเดต ลบคลัง และวงจรข้อมูล

**เป้าหมาย:** ข้อมูลหลายพอร์ตสอดคล้องโดยผู้ใช้ควบคุมการรับอัปเดตได้  
**สถานะส่วน:** TODO • **Dependency:** M03  
**จุดเริ่มตรวจ:** `src/components/forms, src/components/my-data, src/lib/editor, supabase/migrations`  
**ผูกกับ audit:** F13,F14,F15,F16  
**เคสตรวจรับ:** SNP-01, SNP-02, SNP-03, SNP-04, SNP-05, SNP-06, DEL-01, DEL-02, DEL-03, DEL-04, DEL-05, DEL-06

| งาน | สถานะงาน | ฐานเดิม | สิ่งที่ต้องทำ | ผลส่งมอบ/เงื่อนไขผ่าน |
| --- | --- | --- | --- | --- |
| M04.01 แจ้งและรับเวอร์ชันใหม่ | TODO | ยังไม่พบ | เปรียบเทียบ source version กับ snapshot แสดงข้อมูลเปลี่ยน รับใหม่หรือใช้เดิมแยกรายพอร์ต | P1 รับแต่ P2 คงเดิมได้ หลัง reload ยังถูกต้อง |
| M04.02 จัดรูปเมื่อรับอัปเดต | TODO | ยังไม่พบ | รักษา ID ภาพเดิมที่ยังมี; ภาพถูกแทน/ลบแจ้งผลและให้เลือกชุดใหม่โดยรู้ผล | ไม่แทนรูปอื่นตาม index; พอร์ตที่ไม่รับยังดูภาพเก่าได้ |
| M04.03 ยืนยันผลกระทบก่อนลบคลัง | TODO | มี confirm ทั่วไป | แสดงชื่อ/จำนวนพอร์ตที่อ้างอิงรวมสำเนาและหมวดปิด; ตรวจซ้ำก่อน commit | ยกเลิกไม่เปลี่ยนข้อมูล; หากผลกระทบเพิ่มให้แสดงข้อมูลใหม่ |
| M04.04 ลบทุก reference อย่างสอดคล้อง | TODO | ต้องตรวจ cascade จริง | ลบต้นทางกับรายการในพอร์ตและเพิ่ม revision ใน transaction; stale save ห้ามคืนชีพ | ไม่มีพอร์ตตกหล่น/ข้อมูลถูกสร้างคืน; PDF ที่ดาวน์โหลดแล้วคงเดิม |
| M04.05 Cleanup และฟื้นตัวจาก error | TODO | ต้องทำเพิ่ม | cleanup Storage แยกจาก DB ตรวจ reference แล้ว retry; แสดงสถานะและ log ที่ไม่รั่วข้อมูล | DB failure ไม่ลบบางส่วน; cleanup failure ไม่ลบ asset ที่ยังใช้ |

**เกณฑ์จบ M04:** งานย่อย .01–.05 ต้องครบผลส่งมอบ เคสที่เกี่ยวข้องกับส่วนนี้มีผลจริงหรือเหตุผลที่ยังรันไม่ได้ หากเงื่อนไขจำเป็นยัง BLOCKED ห้ามปิดเป็น DONE อัปเดตทะเบียนงาน/หลักฐาน และ push commit สำเร็จก่อนส่งต่อ ผลทดสอบแบบ mock ต้องระบุว่าเป็น mock

### M05 — จัดการพอร์ตและ Autosave

**เป้าหมาย:** พอร์ตแก้ได้ครบ บันทึกเอง และไม่สูญหายเมื่อสลับงาน  
**สถานะส่วน:** IN_PROGRESS • **Dependency:** M04; guards ปัจจุบันยังเป็น manual save ไม่ใช่ Autosave
**จุดเริ่มตรวจ:** `src/app/dashboard, src/components/home, src/components/portfolio, src/components/editor/EditorSession.tsx, src/store`  
**ผูกกับ audit:** F17,F18,F19,F38  
**เคสตรวจรับ:** PORT-01, PORT-02, PORT-03, PORT-04, PORT-05, PORT-06, SAVE-01, SAVE-02, SAVE-03, SAVE-04, SAVE-05, SAVE-06, SAVE-07, SAVE-08

| งาน | สถานะงาน | ฐานเดิม | สิ่งที่ต้องทำ | ผลส่งมอบ/เงื่อนไขผ่าน |
| --- | --- | --- | --- | --- |
| M05.01 สร้าง เปิด และเปลี่ยนชื่อ | PARTIAL | มีสร้าง/เปิด และ [rename จาก Dashboard](verification/PORTFOLIO_RENAME_REVIEW.md): server-confirmed title-only, owner filters, safe error/retry, async guard; mock ตรวจ reload/Editor/ชื่อไฟล์และปกไม่เปลี่ยน | ยังต้องตรวจ integration/สิทธิ์กับระบบจริงและอุปกรณ์จริง; ไม่ถือว่าทั้งระบบจัดการพอร์ตเสร็จ | ชื่อจัดการแยกจากหัวปก; ผล mock ไม่แทน RLS จริง; ทำสำเนา/ลบและ Autosave ยังอยู่ .02/.03 |
| M05.02 ทำสำเนาและลบพอร์ต | TODO | ยังไม่พบครบ | copy เนื้อหา snapshot รูป ลำดับ visibility สี template เป็นพอร์ตอิสระแต่คง source link; ลบเฉพาะฉบับ | สำเนาแก้ไม่กระทบต้นฉบับ; ลบพอร์ตไม่ลบคลัง/asset ที่ยังใช้ |
| M05.03 Autosave draft และสถานะ | TODO | มี dirty/manual save | เริ่มหลังโหลดครบ debounce/queue ต่อพอร์ต เก็บ draft ไม่ครบได้; saving/saved/error/retry อิง revision | ไม่บันทึกค่าเริ่มต้นทับข้อมูลตอนโหลด; saved หลัง server ยืนยันค่าล่าสุด |
| M05.04 ทนเน็ตและคำตอบล่าช้า | PARTIAL | [Accordion](verification/EDITOR_ACCORDION_REVIEW.md)/[Tags](verification/EDITOR_TAG_LOADING_REVIEW.md) กัน late save/crop/retry ของ session เก่าแล้ว | offline/Autosave queue/revision/conflict สองแท็บและข้ามเครื่องยังไม่ทำ | ไม่ใช้ lifecycle mock แทน conflict handling |
| M05.05 เชื่อม lifecycle และ export | PARTIAL | EditorSession dirty/main readiness และ [export lock/late result](verification/PDF_LARGE_FILE_CONFIRMATION_REVIEW.md) มีแล้ว | ยังต้องเชื่อม saved revision/Autosave และลบแข่ง save ตามเป้าหมาย | Blob ชั่วคราวมี cleanup ไม่ใช่ asset ถาวร; integration ยังรอ |

**เกณฑ์จบ M05:** งานย่อย .01–.05 ต้องครบผลส่งมอบ เคสที่เกี่ยวข้องกับส่วนนี้มีผลจริงหรือเหตุผลที่ยังรันไม่ได้ หากเงื่อนไขจำเป็นยัง BLOCKED ห้ามปิดเป็น DONE อัปเดตทะเบียนงาน/หลักฐาน และ push commit สำเร็จก่อนส่งต่อ ผลทดสอบแบบ mock ต้องระบุว่าเป็น mock

### M06 — ฟอร์มเนื้อหา อายุ และ Editor แบบพับขยาย

**เป้าหมาย:** กรอกง่ายและรักษาข้อมูลตามฟอร์มเดิม พร้อม UI ใหม่ที่ตกลง  
**สถานะส่วน:** IN_PROGRESS • **Dependency:** M05; UI checkpoint ไม่ต้องรอ Autosave แต่ไม่ปิดเป้าหมายทั้งส่วน
**จุดเริ่มตรวจ:** `src/components/forms, src/components/layout, src/app/editor/page.tsx, src/store/useProfileStore.ts`  
**ผูกกับ audit:** F20,F21,F22,F23,F24,F25,F26  
**เคสตรวจรับ:** FORM-01, FORM-02, FORM-03, FORM-04, FORM-05, FORM-06, FORM-07, AGE-01, AGE-02, AGE-03, AGE-04, UI-01, UI-02, UI-03, UI-04, UI-05, UI-08

| งาน | สถานะงาน | ฐานเดิม | สิ่งที่ต้องทำ | ผลส่งมอบ/เงื่อนไขผ่าน |
| --- | --- | --- | --- | --- |
| M06.01 ปรับปก/คำนำ/ประวัติเดิม | PARTIAL | UI ปรับแล้ว ชื่อ/รูปปกแยกจาก profile; [Accordion draft/crop](verification/EDITOR_ACCORDION_REVIEW.md), [หลักฐาน cover](M01_DATABASE_SETUP.md) | ตรวจฟอร์มเป้าหมาย/ตัวอย่างคำนำ/custom fields และ integration ครบต่อไป | ปุ่ม save ยังอยู่ ไม่ใช่ Autosave; หลักฐานเจ้าของยืนยันเฉพาะ cover save/reload |
| M06.02 วันเกิดและโหมดอายุ | TODO | มี auto อย่างเดียว | เก็บ auto/manual และค่า manual คำนวณปีเต็ม auto จากวันอ้างอิงเดียว; จัดกฎ invalid/29 ก.พ. | manual ไม่ถูกวันเกิดทับ โหมด persist และ preview/export ตรงกัน |
| M06.03 แทนเมนูด้วย accordion | PARTIAL | [Accordion](verification/EDITOR_ACCORDION_REVIEW.md) หกฟอร์มเปิดหนึ่ง/พับทั้งหมด keyboard/dirty/crop/mobile/late save ผ่าน mock | ส่วนหัว TOC/สี-ดาวน์โหลดตามดีไซน์เป้าหมายยังไม่ทำ; TOC บน A4 ไม่ใช่ฟอร์มที่เจ็ด | เก็บปุ่มบันทึก/ถัดไปหลัง save สำเร็จ; ไม่ซ่อนหมวด A4 เมื่อพับ |
| M06.04 เปิด/ปิดหมวด | PARTIAL | [visibility checkpoint](verification/SECTION_VISIBILITY_REVIEW.md): ปกคงอยู่ สวิตช์ห้าฟอร์ม/TOC แยก, per-key persistence, ไม่ล้าง draft/selection/รูป | migration 20261020084510 ยังไม่ติดตั้ง ต้องตรวจ schema/grants/Data API/staging และ integration จริงแยก | preview เปลี่ยนหลังยืนยัน; fail/retry ไม่ markSaved เนื้อหา; ยังไม่ใช่ Autosave/หลายแท็บ sync เต็ม |
| M06.05 กำหนดข้อมูลว่างและข้อผิดพลาด | PARTIAL | [Tags error/retry](verification/EDITOR_TAG_LOADING_REVIEW.md) แยก main/metadata/empty และรักษา draft แล้ว | normalize/omit ช่องว่าง/หัวข้อ/หน้า และกฎเดียวกันทุก template ยังค้าง | ไม่เอา Tags failure ไปตีความว่าไม่มี Tags; ยังไม่ทำ visibility/กฎหมวดว่าง |

**เกณฑ์จบ M06:** งานย่อย .01–.05 ต้องครบผลส่งมอบ เคสที่เกี่ยวข้องกับส่วนนี้มีผลจริงหรือเหตุผลที่ยังรันไม่ได้ หากเงื่อนไขจำเป็นยัง BLOCKED ห้ามปิดเป็น DONE อัปเดตทะเบียนงาน/หลักฐาน และ push commit สำเร็จก่อนส่งต่อ ผลทดสอบแบบ mock ต้องระบุว่าเป็น mock

### M07 — Responsive หน้าหลักและ Preview

**เป้าหมาย:** ใช้งานบนคอมและโทรศัพท์ได้โดย A4 คงสัดส่วน  
**สถานะส่วน:** IN_PROGRESS • **Dependency:** M06; ตรวจ viewport mock แล้ว ไม่ใช่อุปกรณ์จริงครบ matrix
**จุดเริ่มตรวจ:** `src/components/home, src/components/preview/Paper.tsx, src/app/editor/page.tsx, src/app/globals.css`  
**ผูกกับ audit:** F27,F28,F29  
**เคสตรวจรับ:** UI-06, UI-07, UI-08, UI-09, LAY-09

| งาน | สถานะงาน | ฐานเดิม | สิ่งที่ต้องทำ | ผลส่งมอบ/เงื่อนไขผ่าน |
| --- | --- | --- | --- | --- |
| M07.01 ปรับหน้าแรกให้กะทัดรัด | TODO | มี responsive เดิม | ลดพื้นที่ hero/การ์ด/ช่องว่างบนคอมตามธีมเดิม ตรวจหลายความกว้างก่อนลดฟอนต์ | ภาพเปรียบเทียบก่อน/หลัง ไม่ล้นแนวนอน และคลังเข้าถึงง่าย |
| M07.02 จัดแผง editor ตามพื้นที่ | PARTIAL | [Accordion mobile](verification/EDITOR_ACCORDION_REVIEW.md) และ [TOC regression](verification/AUTOMATIC_TOC_REVIEW.md) ที่ 390/1440 ผ่าน | แท็บเล็ต/keyboard/touch/ความสูงและ browser matrix จริงยังต้องตรวจ | ไม่อ้างว่า mock viewport เท่ากับโทรศัพท์จริง |
| M07.03 ผูกหมวดกับ Preview | PARTIAL | [TOC](verification/AUTOMATIC_TOC_REVIEW.md) ใช้ stable section ID/สเกลจริง; [visibility](verification/SECTION_VISIBILITY_REVIEW.md) แจ้งหมวดปิดและคง scroll เมื่อไม่มีเป้าหมาย | กฎหมวดว่างอัตโนมัติ/อุปกรณ์จริงและ visibility integration ยังต้องตรวจ | ฟอร์มยังเปิดแก้ได้เมื่อ A4 ปิด ไม่เปลี่ยนลำดับ Accordion |
| M07.04 Fit และซูม | PARTIAL | [Paper/Minimal](verification/MINIMAL_TEMPLATE_REVIEW.md) scale A4 ทั้งหน้า; mobile hidden Preview export ผ่าน | ยังไม่มี UI ซูม ต้องตรวจการซูมไม่เปลี่ยน pagination/PDF เมื่อทำ | fit ที่มีแล้วไม่ใช่ zoom feature ครบ |
| M07.05 ตรวจการใช้งานจริง | TODO | ยังไม่ยืนยันจริง | ตรวจ keyboard/focus modal crop/ลบ ปุ่มรูปบน touch และหมุนจอ | ข้อมูลคงอยู่ทั้งแท็บและอุปกรณ์; เก็บภาพจริงตาม DESIGN_SYSTEM |

**เกณฑ์จบ M07:** งานย่อย .01–.05 ต้องครบผลส่งมอบ เคสที่เกี่ยวข้องกับส่วนนี้มีผลจริงหรือเหตุผลที่ยังรันไม่ได้ หากเงื่อนไขจำเป็นยัง BLOCKED ห้ามปิดเป็น DONE อัปเดตทะเบียนงาน/หลักฐาน และ push commit สำเร็จก่อนส่งต่อ ผลทดสอบแบบ mock ต้องระบุว่าเป็น mock

### M08 — Document model การแบ่งหน้า สารบัญ และเลขหน้า

**เป้าหมาย:** มีรายการหน้ากลางที่ preview และ PDF ใช้ตรงกัน  
**สถานะส่วน:** IN_PROGRESS • **Dependency:** M06, M07; แหล่งเลขหน้ากลางยังไม่ใช่ page model เต็มระบบ
**จุดเริ่มตรวจ:** `src/lib/editor/pagination.ts, src/components/preview, src/app/editor/page.tsx`  
**ผูกกับ audit:** F24,F32,F33,F34,F35  
**เคสตรวจรับ:** LAY-01, LAY-02, LAY-03, LAY-04, LAY-05, LAY-06, LAY-07, LAY-08, LAY-09

| งาน | สถานะงาน | ฐานเดิม | สิ่งที่ต้องทำ | ผลส่งมอบ/เงื่อนไขผ่าน |
| --- | --- | --- | --- | --- |
| M08.01 ทำ page model กลาง | PARTIAL | [เลขหน้า](verification/CONTINUOUS_PAGE_NUMBERING_REVIEW.md)/[TOC](verification/AUTOMATIC_TOC_REVIEW.md) ใช้ผลหน้าจริงกลาง แยก physical/printed แล้ว | blocks/visibility/selected assets และ page model เต็มยังไม่ทำ | ไม่เรียก DOM numbering coordinator ว่า document model เป้าหมายเสร็จแล้ว |
| M08.02 จัด card และแบ่งต่อ | PARTIAL | [measurement portal](verification/PDF_PAGE_LIMIT_REVIEW.md) และ [late image flush](verification/AUTOMATIC_TOC_REVIEW.md) วัดได้แม้ Preview ซ่อน | split ข้อความ/รูป/การ์ดใหญ่พร้อม (ต่อ) ยังไม่ทำ; overflow guard ยังบล็อก | ไม่ซ่อน overflow/ย่อเนื้อหาเพื่ออ้างว่าแบ่งต่อแล้ว |
| M08.03 ซ่อนส่วนว่างและหน้าที่ไม่ใช้ | PARTIAL | [ปิดหมวดโดยผู้ใช้](verification/SECTION_VISIBILITY_REVIEW.md) ถอด Preview/Paper และ measurement; TOC ว่างไม่สร้างแต่เก็บ preference | กฎซ่อนช่อง/หมวดว่างอัตโนมัติและ full model ยังแยกงาน; visibility DB integration ยังรอ | main error/dirty ยังบล็อกแม้หมวดปิด; ไม่ปิด overflow หรือสร้าง page model ใหม่ |
| M08.04 ทำสารบัญและเลขหน้า | PARTIAL | เลข/TOC ระดับหมวดสามแบบและ [visibility](verification/SECTION_VISIBILITY_REVIEW.md) ใช้หน้าเดียวกัน; ปิด profile แล้วเนื้อหาถัดไปเริ่ม 1 | สารบัญหลายหน้า/full model ยังไม่ทำ; visibility migration/live integration ยังรอ ไม่เพิ่มสารบัญรายรายการเป็น requirement | ปก/คำนำ/TOC ไม่มีเลข; TOC ว่างไม่สร้างแต่เก็บ preference; ไม่ปิด M08 ทั้งระบบ |
| M08.05 ถอดเพดานและตรวจความคงที่ | PARTIAL | ถอดเพดาน UI/export แล้ว ตรวจ PDF จริง 12/20/25 หน้า ดู [รายงาน](verification/PDF_PAGE_LIMIT_REVIEW.md) | ยังต้องตรวจชุดเป้าหมาย/ทรัพยากรอุปกรณ์จริงและ dependency ของ page model; ไม่ถือว่าทั้ง M08 เสร็จ | ไม่มีเพดานหน้า; overflow ยังบล็อกจริง; เกิน 10 MB [ยืนยันดาวน์โหลด](verification/PDF_LARGE_FILE_CONFIRMATION_REVIEW.md) ไม่ใช่ hard error |

**เกณฑ์จบ M08:** งานย่อย .01–.05 ต้องครบผลส่งมอบ เคสที่เกี่ยวข้องกับส่วนนี้มีผลจริงหรือเหตุผลที่ยังรันไม่ได้ หากเงื่อนไขจำเป็นยัง BLOCKED ห้ามปิดเป็น DONE อัปเดตทะเบียนงาน/หลักฐาน และ push commit สำเร็จก่อนส่งต่อ ผลทดสอบแบบ mock ต้องระบุว่าเป็น mock

### M09 — เทมเพลตสมบูรณ์สามแบบและสองสี

**เป้าหมาย:** สามแบบต่างบุคลิกแต่รองรับกติกาเดียวกันทั้งหมด  
**สถานะส่วน:** IN_PROGRESS • **Dependency:** M08; presentation/TOC checkpoint ไม่ปิดสองสีหรือ page model
**จุดเริ่มตรวจ:** `src/components/editor/TemplatePicker.tsx, src/components/preview, src/app/globals.css`  
**ผูกกับ audit:** F30,F31  
**เคสตรวจรับ:** TPL-01, TPL-02, TPL-03, TPL-04, TPL-05, LAY-09

| งาน | สถานะงาน | ฐานเดิม | สิ่งที่ต้องทำ | ผลส่งมอบ/เงื่อนไขผ่าน |
| --- | --- | --- | --- | --- |
| M09.01 กำหนด contract เทมเพลต | PARTIAL | [Minimal](verification/MINIMAL_TEMPLATE_REVIEW.md) มี scoped tokens/key เดิม/measurement style ตรง A4; unknown key fallback เดิม | contract สองสี/blocks/page model เต็มยังไม่ทำ | ไม่เปลี่ยน template key หรือ schema; ไม่เรียกว่า contract เป้าหมายครบ |
| M09.02 ทำแบบเรียบทางการ | PARTIAL | Classic หกหมวดและ [TOC/PDF จริง](verification/AUTOMATIC_TOC_REVIEW.md) มีหลักฐาน | สองสี/หน้าต่อ/จำนวนรูปเป้าหมายและ integration ยังค้าง | ยืนยันเฉพาะ fixtures ที่รายงาน ไม่ใช่ทุกข้อมูล |
| M09.03 ทำแบบทันสมัย | PARTIAL | Emerald Editorial หกหมวดและ [TOC/PDF จริง](verification/AUTOMATIC_TOC_REVIEW.md) มีหลักฐาน | สีเปลี่ยน/หน้าต่อ/จำนวนรูปเป้าหมายและ integration ยังค้าง | presentation ปัจจุบันไม่ใช่สามเทมเพลตครบ PRD |
| M09.04 ทำแบบมินิมอล | PARTIAL | [Minimal](verification/MINIMAL_TEMPLATE_REVIEW.md) presentation หกหมวด/Preview/PDF ผ่าน; เลขและสารบัญระดับหมวดเพิ่มแล้วใน M08.04 | สองสีรายพอร์ต สารบัญหลายหน้า split การ์ดและกติกาจำนวนรูปยังเป็นงานแยก | ไม่มีงาน implementation Minimal ใหม่ในรอบสถานะนี้; ไม่ปิด M09 หรือ Editor ทั้งระบบ |
| M09.05 ขั้นตอนสีและการสลับแบบ | PARTIAL | [สลับ/save fail/reload/draft/unknown key](verification/MINIMAL_TEMPLATE_REVIEW.md) และ lock ตอน export มี mock evidence | ยังไม่มีขั้นตอนสองสี preset/custom/reset/persist ต้องทำต่อ | การสลับแบบที่ผ่านไม่ใช่ระบบสีแล้ว |

**เกณฑ์จบ M09:** งานย่อย .01–.05 ต้องครบผลส่งมอบ เคสที่เกี่ยวข้องกับส่วนนี้มีผลจริงหรือเหตุผลที่ยังรันไม่ได้ หากเงื่อนไขจำเป็นยัง BLOCKED ห้ามปิดเป็น DONE อัปเดตทะเบียนงาน/หลักฐาน และ push commit สำเร็จก่อนส่งต่อ ผลทดสอบแบบ mock ต้องระบุว่าเป็น mock

### M10 — PDF พร้อมใช้งานและการยืนยันไฟล์ใหญ่

**เป้าหมาย:** ได้ PDF ครบหน้า อ่านชัด และจัดการเป้าหมายขนาดอย่างถูกต้อง  
**สถานะส่วน:** IN_PROGRESS • **Dependency:** M05, M08, M09; ยังไม่ครบ revision/page model/สี
**จุดเริ่มตรวจ:** `src/lib/editor/export-pdf.ts, src/components/editor/ExportButton.tsx`  
**ผูกกับ audit:** F33,F36,F37  
**เคสตรวจรับ:** PDF-01, PDF-02, PDF-03, PDF-04, PDF-05, PDF-06, PDF-07, PDF-08

| งาน | สถานะงาน | ฐานเดิม | สิ่งที่ต้องทำ | ผลส่งมอบ/เงื่อนไขผ่าน |
| --- | --- | --- | --- | --- |
| M10.01 Export จาก revision เดียว | PARTIAL | [lock/session/blob](verification/PDF_LARGE_FILE_CONFIRMATION_REVIEW.md) และ [รอ layout/TOC](verification/AUTOMATIC_TOC_REVIEW.md) ป้องกัน draft/late result แล้ว | saved revision/Autosave และ page model เต็มยังไม่ทำ | ปัจจุบันยึด manual-save baseline ไม่อ้างว่าเป็น revision contract |
| M10.02 ตรวจ asset/font และความครบ | PARTIAL | [PDF guard/retry](verification/PDF_PAGE_LIMIT_REVIEW.md) และ [TOC late image](verification/AUTOMATIC_TOC_REVIEW.md) ตรวจไฟล์ A4 จริง/มือถือซ่อน Preview แล้ว | real Storage/CORS/browser matrix และเนื้อหาขอบเขตใหม่ยังต้องตรวจ | เป็น PDF จริงจาก mock data ไม่ใช่ Supabase/Storage integration |
| M10.03 บีบอัดโดยรักษาความอ่านได้ | PARTIAL | [quality levels เดิม](verification/PDF_LARGE_FILE_CONFIRMATION_REVIEW.md) คงไว้และเปลี่ยน size-only hard error เป็นยืนยันแล้ว | การรับรอง quality floor/เกียรติบัตรตัวอักษรเล็กโดยเจ้าของยังต้องยืนยัน | มีตัวอย่างจริงตามรายงาน แต่ไม่อ้างว่าประเมินความอ่านได้ทุกกรณีแล้ว |
| M10.04 ยืนยันเมื่อเกิน 10 MB | DONE | <=10,000,000 ดาวน์โหลดทันที; > ถามโดยเก็บ Blob เดิม | [ผลตรวจ](verification/PDF_LARGE_FILE_CONFIRMATION_REVIEW.md): mock boundary/async/keyboard/mobile และ PDF จริง 14,446,304 bytes/hash ผ่าน ส่งครบที่ 63217b5 | DONE เฉพาะ flow นี้ตามหลักฐาน ไม่ใช่ integration/อุปกรณ์จริงหรือทั้ง M10; ไม่ render ซ้ำหลังยืนยัน |
| M10.05 Progress และงานยาว | PARTIAL | [page-limit](verification/PDF_PAGE_LIMIT_REVIEW.md) มี progress/dedup/retry และไฟล์จริง 12/20/25 หน้า; [TOC](verification/AUTOMATIC_TOC_REVIEW.md) เพิ่มกระดาษรวมถูกต้อง | สำรวจเวลา/หน่วยความจำ/อุปกรณ์จริงและ regression เมื่อ page model เปลี่ยนยังค้าง | ไม่ตั้งเพดานหน้าใหม่หรือรับประกันหน้าจำนวนอนันต์ |

**เกณฑ์จบ M10:** งานย่อย .01–.05 ต้องครบผลส่งมอบ เคสที่เกี่ยวข้องกับส่วนนี้มีผลจริงหรือเหตุผลที่ยังรันไม่ได้ หากเงื่อนไขจำเป็นยัง BLOCKED ห้ามปิดเป็น DONE อัปเดตทะเบียนงาน/หลักฐาน และ push commit สำเร็จก่อนส่งต่อ ผลทดสอบแบบ mock ต้องระบุว่าเป็น mock

### M11 — บัญชีและการกู้รหัสผ่าน

**เป้าหมาย:** เข้าสู่ระบบได้ตามเงื่อนไขพัฒนาและกู้บัญชีได้ครบวงจร  
**สถานะส่วน:** TODO • **Dependency:** M00, M01  
**จุดเริ่มตรวจ:** `src/app/login, src/app/register, src/components/auth, src/lib/supabase, src/middleware.ts`  
**ผูกกับ audit:** F01,F02,F03,F39  
**เคสตรวจรับ:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, SEC-06

| งาน | สถานะงาน | ฐานเดิม | สิ่งที่ต้องทำ | ผลส่งมอบ/เงื่อนไขผ่าน |
| --- | --- | --- | --- | --- |
| M11.01 ตรวจสมัคร/เข้า/ออก | TODO | มีฐานแล้ว | ใช้ฐานเดิม ตรวจ invalid credentials/session expiry และออกแล้วข้อมูลเก่าไม่ค้าง | A/B สลับได้โดยข้อมูลไม่ปะปนและ route ส่วนตัวถูกป้องกัน |
| M11.02 ยืนยัน Auth config พัฒนา | TODO | ยังตรวจ config ไม่ได้ | ตรวจ email confirmation จริงและ redirect URLs ให้เหมาะ environment; ไม่เพิ่ม provider/admin | ทดสอบสมัครเข้าได้ตามนโยบายที่ตกลง พร้อมบันทึกค่าไม่ลับ |
| M11.03 ขอลิงก์กู้รหัสผ่าน | TODO | ยังไม่พบ | ทำ UI/request/error และข้อความไม่เปิดเผยว่าบัญชีใดมีอยู่ ตรวจส่งอีเมลจริง | A ได้ลิงก์และอีเมลไม่มีบัญชีไม่ได้ผลตอบที่ใช้ไล่รายชื่อ |
| M11.04 ตั้งรหัสใหม่ครบ flow | TODO | ยังไม่พบ | จัด callback/session/reset password ตาม SDK ปัจจุบัน ตรวจ token หมดอายุ/ใช้แล้ว/ผิด | รหัสใหม่เข้าได้ เดิมใช้ไม่ได้ มีวิธีขอลิงก์ใหม่ |
| M11.05 ทดสอบเส้นทางบัญชีจริง | TODO | ยังไม่ยืนยันจริง | ทดสอบ email links บนคอม/มือถือ ปิดข้อมูลลับใน logs และเอกสาร | มีหลักฐาน integration จริงแยก mock และไม่มี token/key รั่ว |

**เกณฑ์จบ M11:** งานย่อย .01–.05 ต้องครบผลส่งมอบ เคสที่เกี่ยวข้องกับส่วนนี้มีผลจริงหรือเหตุผลที่ยังรันไม่ได้ หากเงื่อนไขจำเป็นยัง BLOCKED ห้ามปิดเป็น DONE อัปเดตทะเบียนงาน/หลักฐาน และ push commit สำเร็จก่อนส่งต่อ ผลทดสอบแบบ mock ต้องระบุว่าเป็น mock

### M12 — ทดสอบรวม แก้ข้อผิดพลาด และส่งมอบ

**เป้าหมาย:** ยืนยันทั้งระบบตามข้อกำหนดด้วยหลักฐานจริงก่อนสรุปเสร็จ  
**สถานะส่วน:** IN_PROGRESS • **Dependency:** M01–M11 ทุกส่วนผ่านเกณฑ์จบก่อนส่งมอบ; focused checks ไม่เท่ากับผ่านทั้งหมด
**จุดเริ่มตรวจ:** `tests, docs/SYSTEM_TEST_PLAN.md, docs/IMPLEMENTATION_AUDIT.md, docs/IMPLEMENTATION_PLAN.md`  
**ผูกกับ audit:** F01–F40  
**เคสตรวจรับ:** ทุกเคส 100 เคส, AC-01–AC-20, E2E-A–E2E-D

| งาน | สถานะงาน | ฐานเดิม | สิ่งที่ต้องทำ | ผลส่งมอบ/เงื่อนไขผ่าน |
| --- | --- | --- | --- | --- |
| M12.01 ปรับ regression และรันเครื่องมือ | PARTIAL | ประวัติ [TOC regression](verification/AUTOMATIC_TOC_REVIEW.md) 71 ข้อก่อน scroll fix/23 ข้อหลัง fix; รอบนี้ [types/PGlite](verification/TEST_TYPES_AND_STATUS_REVIEW.md) ผ่าน | staging/100 เคส/browser matrix/อุปกรณ์จริงและระบบเป้าหมายส่วนที่ยังไม่ทำยังรอ | typecheck ทั้ง repo ไม่ใช้ build แทน; ผลรอบก่อนแยกจากรอบนี้ ไม่ลด assertions |
| M12.02 ทดสอบ integration/สิทธิ์ | TODO | ยังไม่ยืนยันจริง | รัน staging จริง Auth email DB RLS RPC Storage และ migration/restore; ตรวจสองบัญชีผ่าน API | ไม่มีข้อมูลข้ามบัญชี ไม่มี partial delete หรือ stale save คืนข้อมูล |
| M12.03 ทดสอบ 100 เคสและ E2E | TODO | แผนพร้อม ทุกเคส NOT_RUN | ใช้ fixture แยก บันทึก actual result/PASS/FAIL/BLOCKED หลักฐาน defect และ retest | AC ครบ 20 มีผลตรวจย้อนกลับได้ mock ไม่แทนระบบจริง |
| M12.04 ตรวจภาพและอุปกรณ์จริง | TODO | ยังไม่ทดสอบจริง | สามแบบทุกหมวด คอม/มือถือ browser matrix PDF reader และคุณภาพภาพ; ให้เจ้าของดูจุด UX ที่ต้องรับรอง | preview/PDF ตรงกัน ไม่มี blocker งานหลัก; ข้อยกเว้นต้องระบุผู้รับรอง |
| M12.05 ปิดงานและส่งต่อ | TODO | ยังไม่เริ่ม | อัปเดตสถานะ audit/plan ผลทดสอบ ข้อจำกัด วิธีตั้งค่า/restore และ commit ที่ push | ทุกงาน DONE มีหลักฐาน; main ไม่ถูก merge และไม่มี deploy ที่อ้างว่าทำแล้วโดยไม่ได้ทำ |

**เกณฑ์จบ M12:** งานย่อย .01–.05 ต้องครบผลส่งมอบ เคสที่เกี่ยวข้องกับส่วนนี้มีผลจริงหรือเหตุผลที่ยังรันไม่ได้ หากเงื่อนไขจำเป็นยัง BLOCKED ห้ามปิดเป็น DONE อัปเดตทะเบียนงาน/หลักฐาน และ push commit สำเร็จก่อนส่งต่อ ผลทดสอบแบบ mock ต้องระบุว่าเป็น mock

## 7. ตรวจว่าหัวข้อ audit ไม่ตกหล่น

ตารางนี้ระบุส่วนรับผิดชอบหลัก/ร่วม ใช้ค้นหาว่าช่องว่างแต่ละเรื่องถูกวางไว้ที่ไหน ไม่ใช้แทนการตรวจรับแต่ละเคส

| หัวข้อ audit | ส่วนรับผิดชอบ |
| --- | --- |
| F01–F03 บัญชี/ตั้งค่า/กู้รหัส | M00, M11 |
| F04–F09 คลัง/ชื่อ/รูป/Tags | M01, M02 |
| F10–F12 ลำดับ/เลือกรูป/atomic save | M01, M03 |
| F13–F14 snapshot/รักษารูปเก่า | M01, M03, M04 |
| F15–F16 ลบคลังและผลกระทบ | M00, M04 |
| F17–F19 พอร์ต/สำเนา/autosave | M05 |
| F20–F26 ฟอร์ม/อายุ/ช่องว่าง/accordion/visibility | M06, M08 |
| F27–F29 มือถือ/fit/zoom/หน้าแรก | M07 |
| F30–F31 สามเทมเพลต/สองสี | M09 |
| F32–F35 แบ่งหน้า/ไม่มีเพดาน/TOC/เลขหน้า | M08, M10 |
| F36–F37 PDF/ขนาดและคุณภาพ | M10 |
| F38 กัน response เก่าและ state ข้ามพอร์ต | M01, M05 |
| F39 สิทธิ์ข้อมูลและ Storage | M00, M01, M11, M12 |
| F40 ชุดทดสอบเดิมและ regression | ทุกส่วนที่เปลี่ยนพฤติกรรม, M12 |

## 8. เรื่องที่ต้องตรวจหรือกำหนดก่อนลงมือเฉพาะจุด

นี่คือรายการตัดสินใจทางเทคนิค/ช่องว่างหลักฐาน ไม่ใช่การถามผู้ใช้ซ้ำในเรื่องที่ตกลงแล้ว ดำเนินงานที่ไม่ติดประเด็นต่อได้

| ID | ประเด็น | ผู้รับผิดชอบ/จังหวะ | สถานะ | วิธีปิดประเด็น |
| --- | --- | --- | --- | --- |
| D01 | schema/RLS/Storage/Auth จริง และสิทธิ์เข้าถึง | ผู้ทำ M00.03 | RECORDED | ดู M00_SCHEMA_REVIEW.md; การสำรวจเสร็จ ข้อจำกัด live access บันทึกแล้ว การตรวจ runtime รอ staging |
| D02 | เกียรติบัตรเดิมเกิน 2 รูปและช่องวันที่/หน่วยงาน | ผู้ทำ M00.04/M01.03 | OPEN | นับแล้ว: เกียรติบัตรเกินเพดาน 2 รายการ ช่องเก่ายังมีข้อมูล; เจ้าของอนุญาตล้างข้อมูลทดลองแล้ว รอผล reset จริง ไม่ต้อง backup ชุดนี้ |
| D03 | รูปที่ถูกแทน/ลบตอนรับ update | ผู้ทำ M04.02 | OPEN | ออกแบบหน้าสรุปผลและวิธีเลือกรูปใหม่ รักษาหลักผู้ใช้รู้และยืนยัน |
| D04 | UX เมื่อสองแท็บบันทึกชนกัน | ผู้ทำ M01.02/M05.04 | OPEN | ใช้ revision ปฏิเสธการทับเงียบและให้เลือก/กู้ค่าค้าง บันทึกแนวทางที่ใช้ |
| D05 | กฎวันเกิด 29 ก.พ. ในปีไม่อธิกสุรทิน | ผู้ทำ M06.02 | OPEN | ระบุวันอ้างอิงและกฎที่เลือกให้ชัดก่อนรับ AGE-04 ไม่เดาว่าเทสต์ผ่าน |
| D06 | ความคมชัดขั้นต่ำ PDF และคู่สีที่อ่านได้ | ผู้ทำ M09/M10 | OPEN | ทำตัวอย่างจริงให้ตรวจ เปรียบเทียบก่อน/หลัง ไม่อ้างวัดคุณภาพได้จาก bytes อย่างเดียว |
| D07 | ความกะทัดรัดหน้าแรก/ระยะ accordion | ผู้ทำ M07 | OPEN | ทำภาพจริงตาม DESIGN_SYSTEM เพื่อให้เจ้าของตรวจ โดยไม่ต้องรื้อข้อมูลฟอร์มใหม่ |
| D08 | ขนาด/ชนิดไฟล์ภาพที่ยอมรับ | ผู้ทำ M00/M02 | OPEN | ตรวจฐานเดิม 5 MB ต่อรูปและชนิดที่รองรับ; ไม่สับสนกับเป้าหมาย PDF 10 MB และไม่เพิ่มข้อจำกัดเอง |

ข้อกำหนดที่ไม่ต้องถามใหม่: กิจกรรมสูงสุด 4 รูป เกียรติบัตร 2 รูป ชื่อบังคับเท่านั้นในสองหมวด เลือกรูปต่อพอร์ตได้ snapshot แบบ B แจ้งรับอัปเดต ลบคลังส่งผลทุกพอร์ต ลบพอร์ตไม่ลบคลัง autosave พอร์ต จำนวนหน้าไม่จำกัด และ PDF ต้องขอยืนยันเมื่อไม่ต่ำกว่าเป้าหมาย 10 MB

## 9. ขั้นตอนทำงานมาตรฐานต่อหนึ่งงานย่อย

1. อ่านงาน/ผลส่งมอบ/dependency และไฟล์จริง ตรวจ HEAD ล่าสุด ไม่อาศัยรายงานเก่าเป็นสถานะปัจจุบันตลอดไป
2. อธิบายปัญหาที่พบและสิ่งที่จะแก้แก่ผู้ใช้ก่อนเริ่มส่วน บันทึก Task ID ผู้รับผิดชอบและสถานะ IN_PROGRESS
3. อ่านคู่มือ Next.js ที่ติดตั้งก่อนเขียนโค้ดตาม AGENTS วางขอบเขตไฟล์ที่จะเปลี่ยน รักษางานค้างของผู้ใช้
4. ทำ implementation ตามสัญญาข้อมูล ทดสอบปกติ/ผิดพลาด/ขอบเขตที่เกี่ยวข้อง และเพิ่ม regression เมื่อมีความเสี่ยงจริง
5. ย้ายเป็น VERIFY เมื่อโค้ดพร้อม บันทึกคำสั่ง ผลจริง หรือสิ่งที่ยังตรวจไม่ได้ ไม่ใส่ PASS ล่วงหน้า
6. เมื่อตรวจครบเป็น READY_TO_PUSH ตรวจ diff ไม่มี secret/ไฟล์นอกขอบเขต commit และ push แบบไม่ force
7. ตรวจ remote HEAD แล้วบันทึก commit/link/หลักฐานเป็น DONE อัปเดตเอกสารเมื่อพฤติกรรมหรือข้อตกลงเปลี่ยน
8. ส่งต่อด้วยงานถัดไปและประเด็นค้าง หากเกิดปัญหาให้ BLOCKED/REOPENED พร้อมเหตุผล ไม่เงียบหรืออ้างเสร็จเพียงเพราะมี commit

สำหรับงานย่อยที่เป็นการสำรวจ ใช้รายงานหลักฐานแทน test ของฟีเจอร์ที่ยังไม่ได้ทำได้ แต่การปิดส่วนใหญ่ต้องได้ผลส่งมอบของส่วนนั้นจริง การทดสอบความสามารถที่จะเกิดในส่วนถัดไปให้ระบุ “รอตรวจรวม Mxx” ชัดเจน ไม่อ้างว่าผ่านแล้ว

## 10. ทะเบียนงานและแบบส่งต่อ

ตารางงานย่อยในข้อ 6 เป็นสถานะปัจจุบันหลัก ส่วนตารางนี้เก็บเจ้าของงานและหลักฐานละเอียด แถววันที่ 15 ต.ค. เป็น checkpoint ประวัติ ไม่ใช่คำสั่งให้รัน reset/foundation ซ้ำ ดูข้อยกเว้น/จุดต้องยืนยันในข้อ 6 และ [M01](M01_DATABASE_SETUP.md) เพิ่มแถวพร้อม Task ID/ขอบเขตเมื่อเริ่มทำ ไม่ถือว่าแผนนี้สั่งให้เรียกหลาย agent โดยอัตโนมัติ

| Task ID | ผู้รับผิดชอบ | สถานะ | เริ่มจาก HEAD | ไฟล์/ขอบเขต | ผลตรวจ/หลักฐาน | Commit ที่ push | อุปสรรค/งานถัดไป | อัปเดตเวลาไทย |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M00.01 | ไค | DONE | 957e35d | repository/กติกา | [รายงาน](M00_BASELINE_REPORT.md) | commit ที่เพิ่มรายงาน M00 นี้ | ตรวจ remote อีกครั้งเมื่อกลับมาทำงาน | 2026-10-15 |
| M00.02 | ไค | DONE | 957e35d | lint/unit/build/E2E mock | [รายงาน](M00_BASELINE_REPORT.md) | commit ที่เพิ่มรายงาน M00 นี้ | PASS baseline; ไม่แทน integration จริง | 2026-10-15 |
| M00.03 | ไค | DONE | 885706c | metadata/Auth และ probes | [ผลตรวจ](M00_SCHEMA_REVIEW.md) | commit ที่เพิ่ม M00_SCHEMA_REVIEW.md | สำรวจเสร็จ; ยังไม่ใช่ live integration PASS | 2026-10-15 |
| M00.04 | ไค | BLOCKED | c1cca0a | inventory/backup guide | [รายงาน](M00_INVENTORY_REVIEW.md) | commit ที่เพิ่ม M00_INVENTORY_REVIEW.md บน branch ใหม่ | ได้ยอดจริงและ function bodies ครบ reset ขึ้น 4c870cc แล้ว รอ live reset/verify; backup ชุดทดลองถูกยกเว้นโดยเจ้าของ | 2026-10-15 |
| M01.03/.04 | ไค | IN_PROGRESS | 4c870cc | foundation migration และ tests | ดู M01_DATABASE_SETUP.md; local suite 10/10 | checkpoint ที่เพิ่ม migration 202610150001 | รอ live verify และทำ snapshot/revision/image limits ต่อ | 2026-10-15 |
| M00.05 | ไค | BLOCKED | 957e35d | fixture manifest | [รายงาน](M00_BASELINE_REPORT.md) | commit ที่เพิ่มรายงาน M00 นี้ | รอ staging accounts/assets/seed ตาม schema | 2026-10-15 |
| M12.01 — types/status checkpoint | Sol | PARTIAL | e9c6c19 | tests 4 ไฟล์และเอกสารสถานะ ไม่ใช่ feature ใหม่ | [ผลตรวจรอบนี้/ตารางก่อนหลัง](verification/TEST_TYPES_AND_STATUS_REVIEW.md) | A: 80a4f4588fa0e459268f21d315e579af1cef80ff; B: commit ที่เพิ่ม checkpoint นี้ ตรวจ SHA จริงใน handoff | ไม่ปิด M12; integration/100 เคส/อุปกรณ์จริงยังค้าง | 2026-10-20 |

แบบส่งต่อที่ต้องกรอกก่อนหยุดงาน:

```text
Task ID:
ผู้รับผิดชอบ / เวลาไทย:
สถานะ:
Branch / HEAD ล่าสุด / Commit ที่ push:
สิ่งที่ทำเสร็จจริง:
ไฟล์ที่แก้และสิ่งที่ยังค้าง:
คำสั่งตรวจและผลจริง:
หลักฐาน/Defect/Decision IDs:
ข้อมูลหรือ migration ที่เปลี่ยน:
ความเสี่ยงหรือสิ่งที่ยังตรวจไม่ได้:
ขั้นตอนถัดไปที่ทำได้ทันที:
```

ห้ามกรอก password, service role key, reset token หรือข้อมูลนักเรียนจริงในทะเบียน/หลักฐาน

## 11. เกณฑ์จบทั้งโครงการและการรายงานความคืบหน้า

- M00–M12 มีผลส่งมอบครบ งานย่อย DONE พร้อม commit/หลักฐานตรวจย้อนหลัง
- AC-01–AC-20 ผ่านบน build ส่งมอบ และแผน 100 เคสมีผลจริงครบตามขอบเขตที่รับรอง รวม E2E-A ถึง E2E-D
- ไม่มีปัญหาค้างเรื่องข้อมูลหาย/ข้ามบัญชี/รายการถูกลบกลับคืน/PDF ขาดหน้า; ข้อยกเว้นอื่นต้องระบุผู้รับรองและผลกระทบ
- Supabase/email/Storage และมือถือจริงได้รับการตรวจ ไม่ใช้ผล mock แทน
- Migration มีสำรอง/กู้คืนและตรวจผลกระทบ; เอกสารตรงกับ implementation หลังแก้
- แสดง commit ที่ push และวิธีให้เจ้าของเปิดตรวจ main/deploy แยกจากการจบงานใน branch นี้

รายงานความคืบหน้าเป็น “จบส่วนใด งานย่อยใดผ่าน เหลืออะไร ติดอะไร” หากนับ DONE/65 ให้เรียกว่า “สัดส่วนจำนวนงานย่อย” ไม่ใช่เปอร์เซ็นต์เวลาหรือความสมบูรณ์ของผลิตภัณฑ์ เพราะขนาดงานไม่เท่ากัน

## 12. ประวัติเอกสารและจุดเริ่มรอบถัดไป

| วันที่ | ฉบับ | การเปลี่ยนแปลง |
| --- | --- | --- |
| 2026-10-20 | 1.5 | ปรับสถานะส่วนใหญ่/งานย่อยตามรายงาน UI/resilience/Accordion/Tags/Minimal/เลข/TOC/PDF; นิยาม PARTIAL และแยกประวัติ/ผลรอบนี้; ไม่เริ่ม feature ใหม่ |
| 2026-10-15 | 1.4 | รับอนุญาตล้างข้อมูลทดลองเก็บบัญชี; reset ขึ้น 4c870cc; foundation migration ผ่าน local tests ยังรอ live execution |
| 2026-10-15 | 1.3 | รับยอดจริง/trigger metadata แล้ว; main รับ snapshot เดิมตามคำสั่ง; ทำต่อบน codex/portfolio-next-phase และเตรียม backup |
| 2026-10-15 | 1.2 | รับ metadata/Auth แล้ว ปิดงานสำรวจ M00.03; เพิ่ม probes และ SQL inventory; M00.04/.05 ยังรอฐานจริง |
| 2026-10-15 | 1.1 | บันทึก baseline จริงและ checkpoint M00; รอข้อมูล Supabase; แก้จำนวน E2E เป็น 9 |
| 2026-10-15 | 1.0 | สร้างแผน 13 ส่วน 65 งานย่อยจากเอกสารและ audit ที่เผยแพร่แล้ว แยกสถานะของเดิม/งานใหม่ พร้อม dependency เกณฑ์จบและทะเบียนส่งต่อ |

**จุดทำต่อหลังมอบหมายรอบใหม่:** reset/foundation ใน M01_DATABASE_SETUP.md มีหลักฐานเจ้าของทำแล้ว ห้ามรันซ้ำจากข้อความแผนเก่า; ยืนยัน staging/ทะเบียน M00 ที่ยังค้าง แล้วออกแบบ data contract snapshot/revision/asset ตาม M01.01/.02/.05 ก่อนปิด M01 ทั้งส่วน ไม่ขอ metadata/function bodies เดิมซ้ำ รอบนี้หยุดหลัง types/status ส่งครบ ไม่ถือว่าอนุญาตเริ่มงานเหล่านี้เอง


### Checkpoint หน้าปก 2026-10-15

คำขอแทรกจากเจ้าของ: เพิ่มชื่อ–นามสกุลฝั่งซ้ายของหน้าปก ดำเนินการบนฐาน edf2c0e ใช้ cover fields + migration 202610150002; save แบบ upsert ตาม unique portfolio_id ป้องกันแถวซ้ำ แสดงชื่อบน preview ทั้งสองแบบและรวมชื่อใน dirty state การเปลี่ยนพอร์ต reset ค่าเหมือนส่วนอื่น ยังไม่ถือว่า M06 ทั้งส่วนหรือ autosave เสร็จ
