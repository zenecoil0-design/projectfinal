// src/components/CoverForm.tsx
"use client";

import { useCoverStore } from "@/store/useCoverStore";
import { revokeObjectUrl, validateImageFile } from "@/lib/imageUtils";
import { FaImage, FaTrash } from "react-icons/fa";

export default function CoverForm({ onNext }: { onNext: () => void }) {
  const store = useCoverStore();

  // ฟังก์ชันอัปโหลดรูปหน้าปก
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      alert(validationError);
      e.target.value = "";
      return;
    }

    revokeObjectUrl(store.coverImage);
    const imageUrl = URL.createObjectURL(file);
    store.setCover("coverImage", imageUrl);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6 pb-10">
      
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-slate-800 border-l-4 border-blue-500 pl-2">
          หน้าที 1: ข้อมูลหน้าปก (Cover Page)
        </h3>
        
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-4">
          
          {/* ช่องกรอกหัวข้อหลัก */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              หัวข้อหลักของพอร์ต (เช่น PORTFOLIO / แฟ้มสะสมผลงาน) <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              value={store.portfolioTitle} 
              onChange={(e) => store.setCover("portfolioTitle", e.target.value)} 
              placeholder="PORTFOLIO" 
              className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-blue-500 font-bold" 
              required 
            />
          </div>

          {/* ช่องกรอกชื่อโรงเรียน */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              ชื่อโรงเรียน <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              value={store.schoolName} 
              onChange={(e) => store.setCover("schoolName", e.target.value)} 
              placeholder="เช่น โรงเรียนเบ็ญจะมะมหาราช" 
              className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-blue-500" 
              required 
            />
          </div>

          {/* อัปโหลดรูปหน้าปก */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              รูปภาพพื้นหลังหน้าปก (ถ้ามี)
            </label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-28 bg-slate-200 rounded-md overflow-hidden flex items-center justify-center border border-slate-300 shrink-0">
                {store.coverImage ? (
                  <img src={store.coverImage} alt="Cover Preview" className="w-full h-full object-cover" />
                ) : (
                  <FaImage className="text-2xl text-slate-400" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer hover:bg-blue-100 transition-colors border border-blue-200 w-max">
                  <FaImage /> เลือกรูปหน้าปก
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleCoverUpload} />
                </label>
                {store.coverImage && (
                  <button 
                    type="button" 
                    onClick={() => {
                      revokeObjectUrl(store.coverImage);
                      store.setCover("coverImage", "");
                    }} 
                    className="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-1 text-left"
                  >
                    <FaTrash className="text-[10px]" /> ลบรูปภาพ
                  </button>
                )}
                <span className="text-[10px] text-slate-400">แนะนำขนาดแนวตั้ง (A4 Ratio)</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      <button type="submit" className="bg-slate-800 text-white font-bold py-3 rounded-lg hover:bg-slate-900 transition-colors shadow-md text-sm mt-2 flex items-center justify-center gap-2">
       ถัดไป →
      </button>

    </form>
  );
}