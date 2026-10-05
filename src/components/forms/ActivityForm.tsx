// src/components/ActivityForm.tsx
"use client";

import { useActivityStore } from "@/store/useActivityStore";
import { FaPlus, FaTrash, FaCheck, FaTrophy, FaImage } from "react-icons/fa";

export default function ActivityForm({ onNext }: { onNext: () => void }) {
  const store = useActivityStore();

  // ฟังก์ชันอัปโหลดรูปภาพเข้ากิจกรรม
  const handleImageUpload = (activityId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const imageUrl = URL.createObjectURL(files[0]);
      store.addImageToActivity(activityId, imageUrl);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    alert("บันทึกข้อมูลผลงานและกิจกรรมเรียบร้อย!");
    onNext();
  };

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6 pb-10">
      
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-slate-800 border-l-4 border-blue-500 pl-2">
          หน้าที่ 5: ผลงานและกิจกรรม (Activities & Portfolio)
        </h3>
        
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-4">
          
          {/* ลูปแสดงรายการกิจกรรมแต่ละชิ้น */}
          {store.activities.map((act, index) => (
            <div key={act.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3 relative">
              
              {/* หัวข้อและปุ่มลบกิจกรรม */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-blue-600 flex items-center gap-1.5">
                  <FaTrophy /> กิจกรรมที่ {index + 1}
                </span>
                {store.activities.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => store.removeActivity(act.id)}
                    className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 p-1"
                  >
                    <FaTrash /> ลบกิจกรรมนี้
                  </button>
                )}
              </div>

              {/* ช่องกรอกชื่อกิจกรรม */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  ชื่อกิจกรรม / ผลงาน <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={act.title} 
                  onChange={(e) => store.updateActivity(act.id, 'title', e.target.value)} 
                  placeholder="เช่น การแข่งขันเขียนโปรแกรมคอมพิวเตอร์ระดับชาติ" 
                  className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-blue-500 font-semibold" 
                  required 
                />
              </div>

              {/* ช่องกรอกรายละเอียด */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  รายละเอียด / หน้าที่ที่ได้รับมอบหมาย <span className="text-red-500">*</span>
                </label>
                <textarea 
                  value={act.description} 
                  onChange={(e) => store.updateActivity(act.id, 'description', e.target.value)} 
                  rows={3}
                  placeholder="อธิบายสั้นๆ เกี่ยวกับกิจกรรมนี้ เช่น ได้รับรางวัลรองชนะเลิศอันดับ 1..." 
                  className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-blue-500 resize-none" 
                  required 
                />
              </div>

              {/* ส่วนอัปโหลดรูปภาพผลงาน */}
              <div className="flex flex-col gap-2 pt-1">
                <label className="block text-[11px] font-semibold text-slate-500">
                  รูปภาพประกอบผลงาน (อัปโหลดได้หลายรูป)
                </label>
                
                <div className="flex flex-wrap gap-3 items-center">
                  {/* แสดงรูปที่อัปโหลดแล้ว */}
                  {act.images.map((img, imgIdx) => (
                    <div key={imgIdx} className="w-20 h-20 bg-slate-100 rounded-lg overflow-hidden border border-slate-300 relative group">
                      <img src={img} alt={`Activity ${imgIdx}`} className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => store.removeImageFromActivity(act.id, imgIdx)}
                        className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  ))}

                  {/* ปุ่มกดเลือกรูปเพิ่ม */}
                  {act.images.length < 4 &&(
                  <label className="w-20 h-20 border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors text-slate-500 hover:text-blue-600">
                    <FaImage className="text-xl mb-1" />
                    <span className="text-[10px] font-bold">เพิ่มรูป</span>
                    <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={(e) => handleImageUpload(act.id, e)} />
                  </label>
                  )}
                </div>
              </div>

            </div>
          ))}

          {/* ปุ่มกดเพิ่มกิจกรรมใหม่ */}
          <button 
            type="button" 
            onClick={store.addActivity}
            className="flex items-center justify-center gap-2 border border-dashed border-blue-300 bg-white hover:bg-blue-50 text-blue-600 font-bold py-2.5 px-4 rounded-lg text-xs transition-colors shadow-sm mt-1"
          >
            <FaPlus /> + เพิ่มกิจกรรมใหม่
          </button>

        </div>
      </div>

      <button type="submit" className="bg-slate-800 text-white font-bold py-3 rounded-lg hover:bg-slate-900 transition-colors shadow-md text-sm mt-2 flex items-center justify-center gap-2">
        💾 บันทึกข้อมูลผลงานและกิจกรรม
      </button>

    </form>
  );
}