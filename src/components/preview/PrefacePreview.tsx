"use client";

import { useCoverStore } from "@/store/useCoverStore";

export default function PrefacePreview() {
  // ดึงข้อมูลคำนำและชื่อผู้จัดทำมาจาก useCoverStore
  const coverStore = useCoverStore();

  return (
    // โครงสร้างกระดาษ A4 สีขาวจำลอง
    <div className="bg-white w-[210mm] min-h-[297mm] shadow-2xl rounded-sm relative overflow-hidden flex flex-col justify-between p-16 mx-auto my-auto border border-slate-300 text-slate-800">
      
      {/*ด้านบน: หัวข้อหน้าคำนำ*/}
      <div className="flex flex-col items-center">
        <h2 className="text-4xl font-bold tracking-wider mb-12">คำนำ</h2>
      </div>

      {/*ส่วนกลาง: ข้อความคำนำที่ผู้ใช้พิมพ์*/}
      <div className="flex-1 px-8">
        <p className="text-base leading-relaxed whitespace-pre-line text-slate-700">
          {coverStore.prefaceText || "พิมพ์ข้อความคำนำของคุณที่นี่ ."}
        </p>
      </div>

      {/*ส่วนท้าย: ลงชื่อผู้จัดทำ*/}
      <div className="flex flex-col items-end pr-12 mt-10">
        <p className="text-sm mb-6">ด้วยความเคารพอย่างสูง</p>
        <p className="text-base font-bold">
          {coverStore.authorName || "ชื่อผู้จัดทำ"}
        </p>
        <p className="text-sm text-slate-500 mt-1">ผู้จัดทำ</p>
      </div>

    </div>
  );
}