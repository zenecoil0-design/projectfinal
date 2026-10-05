// src/components/PrefaceForm.tsx
"use client";

import { useCoverStore } from "@/store/useCoverStore";
import { FaCheck } from "react-icons/fa";

export default function PrefaceForm({ onNext }: { onNext: () => void }) {
  const store = useCoverStore();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    alert("บันทึกข้อมูลหน้าคำนำเรียบร้อย!");
    onNext();
  };

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6 pb-10">
      
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-slate-800 border-l-4 border-blue-500 pl-2">
          หน้าที่ 2: คำนำ (Preface)
        </h3>
        
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-4">
          
          {/* ช่องกรอกข้อความคำนำ */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              ข้อความคำนำ (Preface Text) <span className="text-red-500">*</span>
            </label>
            <textarea 
              value={store.prefaceText} 
              onChange={(e) => store.setCover("prefaceText", e.target.value)} 
              rows={6}
              placeholder="พิมพ์ข้อความคำนำของคุณที่นี่..." 
              className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-blue-500 resize-none leading-relaxed" 
              required 
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              💡 คำแนะนำ: เราใส่ข้อความมาตรฐานไว้ให้แล้ว นักเรียนสามารถปรับแต่งเพิ่มเติมได้ทันทีเพื่อลดภาระการพิมพ์
            </span>
          </div>

          {/* 🎯 เปลี่ยนมาเป็นช่องกรอกชื่อผู้จัดทำเองแบบอิสระ */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                ชื่อผู้จัดทำ (ลงท้ายหน้าคำนำ) <span className="text-red-500">*</span>
              </label>
              <input 
                type="text"
                value={store.authorName}
                onChange={(e) => store.setCover("authorName", e.target.value)}
                placeholder="เช่น นายศิวกร เห็มสุข"
                className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-blue-500 bg-white"
                required
              />
            </div>
          </div>

        </div>
      </div>

      <button type="submit" className="bg-slate-800 text-white font-bold py-3 rounded-lg hover:bg-slate-900 transition-colors shadow-md text-sm mt-2 flex items-center justify-center gap-2">
        💾 บันทึกข้อมูลคำนำ
      </button>

    </form>
  );
}