// src/components/CertificateForm.tsx
"use client";

import { useCertificateStore } from "@/store/useCertificateStore";
import { FaPlus, FaTrash, FaCheck, FaAward, FaImage } from "react-icons/fa";

export default function CertificateForm({ onNext }: { onNext: () => void }) {
  const store = useCertificateStore();

  const handleImageUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      store.setCertificateImage(id, imageUrl);
    }
  };
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    alert("บันทึกข้อมูลเกีตรติบัตรเรียบร้อย!");
    onNext();
  };

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6 pb-10">
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-slate-800 border-l-4 border-blue-500 pl-2">
          หน้าที่ 6: เกียรติบัตร (Certificates)
        </h3>
        
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-4">
          {store.certificates.map((cert, index) => (
            <div key={cert.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-xs font-bold text-amber-600 flex items-center gap-1.5">
                  <FaAward /> เกียรติบัตรใบที่ {index + 1}
                </span>
                {store.certificates.length > 1 && (
                  <button type="button" onClick={() => store.removeCertificate(cert.id)} className="text-red-500 text-xs"><FaTrash /></button>
                )}
              </div>

              <input 
                placeholder="ชื่อเกียรติบัตร" 
                value={cert.title}
                onChange={(e) => store.updateCertificate(cert.id, 'title', e.target.value)}
                className="w-full text-sm border p-2 rounded-md outline-none"
              />
              <textarea 
                placeholder="รายละเอียดเพิ่มเติม (เช่น หน่วยงานที่ออกให้)" 
                value={cert.description}
                onChange={(e) => store.updateCertificate(cert.id, 'description', e.target.value)}
                className="w-full text-sm border p-2 rounded-md outline-none"
              />

              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-slate-100 rounded border flex items-center justify-center overflow-hidden">
                  {cert.imageUrl ? <img src={cert.imageUrl} className="w-full h-full object-cover"/> : <FaImage className="text-slate-400"/>}
                </div>
                <label className="text-xs bg-slate-100 p-2 rounded cursor-pointer hover:bg-slate-200">
                  อัปโหลดรูป
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(cert.id, e)} />
                </label>
              </div>
            </div>
          ))}

          <button type="button" onClick={store.addCertificate} className="text-xs text-blue-600 font-bold flex items-center justify-center gap-2 border border-dashed p-3 rounded-lg hover:bg-blue-50">
            <FaPlus /> เพิ่มเกียรติบัตรอีก
          </button>
        </div>
      </div>

      <button type="submit" className="bg-slate-800 text-white font-bold py-3 rounded-lg hover:bg-slate-900 transition-colors shadow-md text-sm mt-2 flex items-center justify-center gap-2">
       💾 บันทึกข้อมูลเกียรติบัตรทั้งหมด
      </button>
    </form>
  );
}