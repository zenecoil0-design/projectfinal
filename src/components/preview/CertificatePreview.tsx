"use client";

import { useCertificateStore } from "@/store/useCertificateStore";

export default function CertificatePreview() {
  const store = useCertificateStore();
  const certificates = store.certificates || [];

  // 🎯 กำหนดให้ 1 หน้า A4 แสดงผลได้สูงสุด 2 เกียรติบัตร
  const ITEMS_PER_PAGE = 2;
  const certPages = [];

  for (let i = 0; i < certificates.length; i += ITEMS_PER_PAGE) {
    certPages.push(certificates.slice(i, i + ITEMS_PER_PAGE));
  }

  if (certPages.length === 0) {
    certPages.push([]);
  }

  return (
    <>
      {certPages.map((pageCerts, pageIndex) => (
        <div 
          key={pageIndex} 
          className="bg-white w-[210mm] min-h-[297mm] shadow-2xl rounded-sm relative overflow-hidden flex flex-col justify-between p-16 mx-auto my-auto border border-slate-300 text-slate-800 mb-10"
        >
          {/* ส่วนหัว */}
          <div className="flex items-center justify-between border-b pb-4 mb-6">
            <h2 className="text-3xl font-bold tracking-wider">เกียรติบัตร (Certificates)</h2>
            <span className="text-sm font-semibold text-slate-400">
              หน้าที่ {pageIndex + 1} / {certPages.length}
            </span>
          </div>

          {/* ส่วนเนื้อหา: แสดงเกียรติบัตรเฉพาะของหน้านั้นๆ */}
          <div className="flex-1 flex flex-col gap-6">
            {pageCerts.map((cert, index) => {
              const actualIndex = (pageIndex * ITEMS_PER_PAGE) + index;
              return (
                <div key={cert.id} className="flex flex-col gap-3 p-5 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                      เกียรติบัตรที่ {actualIndex + 1}
                    </span>
                  </div>

                  <h3 className="font-bold text-lg text-slate-800">{cert.title || "ชื่อเกียรติบัตร / รางวัล"}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{cert.description || "รายละเอียดเกียรติบัตร..."}</p>

                  {cert.imageUrl && (
                    <div className="w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-700 shadow-sm flex items-center justify-center p-1 mt-2">
                      <img 
                        src={cert.imageUrl} 
                        alt={`Certificate ${actualIndex + 1}`} 
                        className="w-full h-auto max-h-[240px] object-contain rounded" 
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ส่วนท้ายกระดาษ */}
          <div className="border-t pt-4 mt-6 text-center text-xs text-slate-400">
            Portfolio - หน้าเกียรติบัตร (หน้า {pageIndex + 1})
          </div>
        </div>
      ))}
    </>
  );
}