"use client";

import { useActivityStore } from "@/store/useActivityStore";
import A4Page from "@/components/preview/A4Page";

export default function ActivityPreview() {
  const { activities } = useActivityStore();
  const pages = activities.length > 0 ? activities : [null];

  return (
    <div className="flex flex-col gap-10">
      {pages.map((activity, pageIndex) => (
        <A4Page
          key={activity?.id ?? "empty"}
          className="flex flex-col justify-between p-16 text-slate-800"
        >
          <div className="mb-6 flex items-center justify-between border-b pb-4">
            <h2 className="text-3xl font-bold tracking-wider">
              ผลงานและกิจกรรม
            </h2>
            {activities.length > 1 && (
              <span className="text-sm font-semibold text-slate-400">
                หน้า {pageIndex + 1} / {activities.length}
              </span>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            {activity ? (
              <div className="flex h-full flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
                <span className="w-max rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-600">
                  กิจกรรมที่ {pageIndex + 1}
                </span>

                <h3 className="break-words text-lg font-bold text-slate-800">
                  {activity.title || "ชื่อกิจกรรม"}
                </h3>

                <p className="max-h-28 overflow-hidden whitespace-pre-line break-words text-sm leading-relaxed text-slate-600">
                  {activity.description || "รายละเอียดกิจกรรม..."}
                </p>

                {activity.images.length > 0 && (
                  <div
                    className={`mt-2 grid min-h-0 flex-1 gap-3 ${
                      activity.images.length === 1
                        ? "grid-cols-1"
                        : "grid-cols-2"
                    }`}
                  >
                    {activity.images.map((imageUrl, imageIndex) => (
                      <div
                        key={imageIndex}
                        className="flex min-h-0 items-center justify-center overflow-hidden rounded-lg border border-slate-700 bg-slate-900 p-1"
                      >
                        <img
                          src={imageUrl}
                          alt={`Activity ${pageIndex + 1} image ${imageIndex + 1}`}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                ยังไม่มีข้อมูลผลงานหรือกิจกรรม
              </div>
            )}
          </div>

          <div className="mt-6 border-t pt-4 text-center text-xs text-slate-400">
            Portfolio - หน้าผลงานและกิจกรรม
          </div>
        </A4Page>
      ))}
    </div>
  );
}
