"use client";

import { useEducationStore } from "@/store/useEducationStore";
import { FaGraduationCap } from "react-icons/fa";

export default function EducationPreview() {
  const store = useEducationStore();

  return (
    // โครงสร้างกระดาษ A4 สีขาวจำลอง
    <div className="bg-white w-[210mm] min-h-[297mm] shadow-2xl rounded-sm relative overflow-hidden flex flex-col justify-between p-16 mx-auto my-auto border border-slate-300 text-slate-800">
      
      {/* ส่วนหัว */}
      <div className="flex items-center gap-3 border-b pb-4 mb-8">
        <h2 className="text-3xl font-bold tracking-wider">ประวัติการศึกษา</h2>
      </div>

      {/* ส่วนเนื้อหา: ลูปแสดงรายการประวัติการศึกษา */}
      <div className="flex-1 flex flex-col gap-6">
        {store.educations && store.educations.map((edu, index) => (
          <div key={edu.id} className="flex gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
            
            {/* โลโก้สถานศึกษา */}
            <div className="w-16 h-16 bg-white rounded-lg border flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
              {edu.logoUrl ? (
                <img src={edu.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <FaGraduationCap className="text-2xl text-slate-400" />
              )}
            </div>

            {/* รายละเอียดการศึกษา */}
            <div className="flex flex-col justify-center text-sm gap-1">
              <span className="text-xs font-bold text-blue-600">ช่วงการศึกษาที่ {index + 1}</span>
              <h3 className="font-bold text-base text-slate-800">{edu.schoolName || "ชื่อสถานศึกษา / โรงเรียน"}</h3>
              <p className="text-slate-600"><span className="font-semibold">ระดับชั้น :</span> {edu.level || "-"}</p>
              <p className="text-slate-600"><span className="font-semibold">แผนการเรียน :</span> {edu.studyPlan || "-"}</p>
              <p className="text-slate-600"><span className="font-semibold">เกรดเฉลี่ย (GPAX) :</span> {edu.gpa || "-"}</p>
            </div>

          </div>
        ))}
      </div>

      {/* ส่วนท้ายกระดาษ */}
      <div className="border-t pt-4 mt-6 text-center text-xs text-slate-400">
        Portfolio - หน้าประวัติการศึกษา
      </div>

    </div>
  );
}