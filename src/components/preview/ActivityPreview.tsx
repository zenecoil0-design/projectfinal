"use client";

import { useActivityStore } from "@/store/useActivityStore";

export default function ActivityPreview() {
  const store = useActivityStore();
  const activities = store.activities || [];

  // 🎯 กำหนดให้ 1 หน้า A4 แสดงผลได้สูงสุด 2 กิจกรรม เพื่อไม่ให้ล้นหน้ากระดาษ
  const ITEMS_PER_PAGE = 2;
  const activityPages = [];
  
  for (let i = 0; i < activities.length; i += ITEMS_PER_PAGE) {
    activityPages.push(activities.slice(i, i + ITEMS_PER_PAGE));
  }

  // ถ้ายังไม่มีกิจกรรมเลย ให้แสดงหน้าเปล่าๆ ไว้ 1 หน้าอย่างน้อย
  if (activityPages.length === 0) {
    activityPages.push([]);
  }

  return (
    <>
      {activityPages.map((pageActs, pageIndex) => (
        <div 
          key={pageIndex} 
          className="bg-white w-[210mm] min-h-[297mm] shadow-2xl rounded-sm relative overflow-hidden flex flex-col justify-between p-16 mx-auto my-auto border border-slate-300 text-slate-800 mb-10"
        >
          {/* ส่วนหัว */}
          <div className="flex items-center justify-between border-b pb-4 mb-6">
            <h2 className="text-3xl font-bold tracking-wider">ผลงานและกิจกรรม (Activities)</h2>
            <span className="text-sm font-semibold text-slate-400">
              หน้าที่ {pageIndex + 1} / {activityPages.length}
            </span>
          </div>

          {/* ส่วนเนื้อหา: แสดงกิจกรรมเฉพาะของหน้านั้นๆ */}
          <div className="flex-1 flex flex-col gap-6">
            {pageActs.map((act, index) => {
              const actualIndex = (pageIndex * ITEMS_PER_PAGE) + index;
              return (
                <div key={act.id} className="flex flex-col gap-3 p-5 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                      กิจกรรมที่ {actualIndex + 1}
                    </span>
                  </div>

                  <h3 className="font-bold text-lg text-slate-800">{act.title || "ชื่อกิจกรรม"}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{act.description || "รายละเอียดกิจกรรม..."}</p>

                  {act.images && act.images.length > 0 && (
                    <div className={`grid gap-3 mt-3 ${act.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                      {act.images.map((imgUrl, imgIndex) => (
                        <div key={imgIndex} className="w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-700 shadow-sm flex items-center justify-center p-1">
                          {imgUrl ? (
                            <img src={imgUrl} alt={`Activity ${imgIndex + 1}`} className="w-full h-auto max-h-[200px] object-contain rounded" />
                          ) : (
                            <span className="text-xs text-slate-400">รูปภาพ</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ส่วนท้ายกระดาษ */}
          <div className="border-t pt-4 mt-6 text-center text-xs text-slate-400">
            Portfolio - หน้าผลงานและกิจกรรม (หน้า {pageIndex + 1})
          </div>
        </div>
      ))}
    </>
  );
}