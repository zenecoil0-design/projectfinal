"use client";

import A4Page from "@/components/preview/A4Page";
import { packItemsByHeight } from "@/lib/autoPagination";
import {
  type ActivityItem,
  useActivityStore,
} from "@/store/useActivityStore";

const PAGE_CAPACITY = 790;
const ITEM_GAP = 20;

function getDescriptionLines(description: string) {
  if (!description.trim()) {
    return 2;
  }

  return Math.min(
    6,
    Math.max(2, Math.ceil(description.length / 70))
  );
}

function getActivityHeight(activity: ActivityItem) {
  const textHeight = 118 + getDescriptionLines(activity.description) * 22;

  if (activity.images.length === 0) {
    return Math.max(220, textHeight);
  }

  if (activity.images.length === 1) {
    return Math.max(470, textHeight + 300);
  }

  if (activity.images.length === 2) {
    return Math.max(430, textHeight + 250);
  }

  return Math.max(560, textHeight + 360);
}

function getImageGridClass(imageCount: number) {
  if (imageCount <= 1) {
    return "grid-cols-1";
  }

  return "grid-cols-2";
}

export default function ActivityPreview() {
  const { activities } = useActivityStore();

  const pages = packItemsByHeight(
    activities,
    getActivityHeight,
    PAGE_CAPACITY,
    ITEM_GAP
  );

  let runningIndex = 0;

  return (
    <div className="flex flex-col gap-10">
      {pages.map((pageItems, pageIndex) => (
        <A4Page
          key={pageIndex}
          className="flex flex-col p-16 text-slate-800"
        >
          <div className="mb-6 flex shrink-0 items-center justify-between border-b pb-4">
            <h2 className="text-3xl font-bold tracking-wider">
              ผลงานและกิจกรรม
            </h2>

            {pages.length > 1 && (
              <span className="text-sm font-semibold text-slate-400">
                หน้า {pageIndex + 1} / {pages.length}
              </span>
            )}
          </div>

          <div
            className="min-h-0 flex-1 overflow-hidden"
            style={{ display: "flex", flexDirection: "column", gap: ITEM_GAP }}
          >
            {pageItems.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
                ยังไม่มีข้อมูลผลงานหรือกิจกรรม
              </div>
            ) : (
              pageItems.map((activity) => {
                runningIndex += 1;
                const activityNumber = runningIndex;
                const reservedHeight = getActivityHeight(activity);

                return (
                  <article
                    key={activity.id}
                    className="flex shrink-0 flex-col gap-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-5"
                    style={{ height: reservedHeight }}
                  >
                    <span className="w-max rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-600">
                      กิจกรรมที่ {activityNumber}
                    </span>

                    <h3 className="break-words text-lg font-bold text-slate-800">
                      {activity.title || "ชื่อกิจกรรม"}
                    </h3>

                    <p className="max-h-32 overflow-hidden whitespace-pre-line break-words text-sm leading-relaxed text-slate-600">
                      {activity.description || "รายละเอียดกิจกรรม..."}
                    </p>

                    {activity.images.length > 0 && (
                      <div
                        className={`mt-1 grid min-h-0 flex-1 gap-3 ${getImageGridClass(
                          activity.images.length
                        )}`}
                      >
                        {activity.images.map((imageUrl, imageIndex) => (
                          <div
                            key={imageIndex}
                            className="flex min-h-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white p-1"
                          >
                            <img
                              src={imageUrl}
                              alt={`Activity ${activityNumber} image ${imageIndex + 1}`}
                              className="h-full w-full object-contain"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>

          <div className="mt-6 shrink-0 border-t pt-4 text-center text-xs text-slate-400">
            Portfolio - หน้าผลงานและกิจกรรม
          </div>
        </A4Page>
      ))}
    </div>
  );
}
