// src/components/EducationForm.tsx
"use client";

import { useEducationStore } from "@/store/useEducationStore";
import { revokeObjectUrl, validateImageFile } from "@/lib/imageUtils";
import { FaPlus, FaTrash, FaSchool, FaImage } from "react-icons/fa";

export default function EducationForm({ onNext }: { onNext: () => void }) {
  const store = useEducationStore();

  const handleLogoUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      alert(validationError);
      e.target.value = "";
      return;
    }

    const currentLogo = store.educations.find((education) => education.id === id)?.logoUrl ?? "";
    revokeObjectUrl(currentLogo);
    const imageUrl = URL.createObjectURL(file);
    store.updateEducation(id, "logoUrl", imageUrl);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6 pb-10">
      
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-slate-800 border-l-4 border-blue-500 pl-2">
          หน้าที่ 4: ประวัติการศึกษา (Educations)
        </h3>
        
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-4">
          
          {/* ลูปแสดงรายการประวัติการศึกษาแต่ละระดับ */}
          {store.educations.map((edu, index) => (
            <div key={edu.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3 relative">
              
              {/* หัวข้อแถว และปุ่มลบ */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-blue-600 flex items-center gap-1.5">
                  <FaSchool /> ช่วงการศึกษาที่ {index + 1}
                </span>
                {store.educations.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => store.removeEducation(edu.id)}
                    className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 p-1"
                  >
                    <FaTrash /> ลบช่วงนี้
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* ระดับการศึกษา */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">ระดับชั้น <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    value={edu.level} 
                    onChange={(e) => store.updateEducation(edu.id, 'level', e.target.value)} 
                    placeholder="เช่น มัธยมศึกษาตอนปลาย" 
                    className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-blue-500" 
                    required 
                  />
                </div>

                {/* ชื่อโรงเรียน */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">ชื่อสถานศึกษา / โรงเรียน <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    value={edu.schoolName} 
                    onChange={(e) => store.updateEducation(edu.id, 'schoolName', e.target.value)} 
                    placeholder="เช่น โรงเรียนเบ็ญจะมะมหาราช" 
                    className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-blue-500" 
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* แผนการเรียน */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">แผนการเรียน / สาขาวิชา</label>
                  <input 
                    type="text" 
                    value={edu.studyPlan} 
                    onChange={(e) => store.updateEducation(edu.id, 'studyPlan', e.target.value)} 
                    placeholder="เช่น วิทยาศาสตร์ - คณิตศาสตร์" 
                    className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-blue-500" 
                  />
                </div>

                {/* เกรดเฉลี่ย */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">เกรดเฉลี่ย (GPAX)</label>
                  <input 
                    type="number" 
                    min="0"
                    max="4"
                    step="0.01"
                    value={edu.gpa} 
                    onChange={(e) => store.updateEducation(edu.id, 'gpa', e.target.value)} 
                    placeholder="เช่น 3.85" 
                    className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-blue-500" 
                  />
                </div>
              </div>

              {/* อัปโหลดโลโก้โรงเรียน */}
              <div className="flex items-center gap-3 pt-2">
                <div className="w-12 h-12 bg-slate-100 rounded-md overflow-hidden flex items-center justify-center border border-slate-200 shrink-0">
                  {edu.logoUrl ? (
                    <img src={edu.logoUrl} alt="School Logo" className="w-full h-full object-cover" />
                  ) : (
                    <FaImage className="text-slate-400 text-lg" />
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-1 rounded text-xs font-semibold cursor-pointer hover:bg-slate-200 transition-colors w-max">
                    <FaImage /> อัปโหลดตราโรงเรียน
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handleLogoUpload(edu.id, e)} />
                  </label>
                  <span className="text-[10px] text-slate-400">รูปตราสัญลักษณ์โรงเรียนขนาดเล็ก</span>
                </div>
              </div>

            </div>
          ))}

          {/* ปุ่มกดเพิ่มระดับการศึกษาใหม่ */}
          <button 
            type="button" 
            onClick={store.addEducation}
            className="flex items-center justify-center gap-2 border border-dashed border-blue-300 bg-white hover:bg-blue-50 text-blue-600 font-bold py-2.5 px-4 rounded-lg text-xs transition-colors shadow-sm mt-1"
          >
            <FaPlus /> + เพิ่มประวัติการศึกษา (เช่น ระดับชั้นอื่นๆ)
          </button>

        </div>
      </div>

      <button type="submit" className="bg-slate-800 text-white font-bold py-3 rounded-lg hover:bg-slate-900 transition-colors shadow-md text-sm mt-2 flex items-center justify-center gap-2">
        ถัดไป →
      </button>

    </form>
  );
}