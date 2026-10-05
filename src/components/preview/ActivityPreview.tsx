"use client";

import {
  FaImage,
  FaTrophy,
} from "react-icons/fa";

import { useActivityStore } from "@/store/useActivityStore";

const ITEMS_PER_PAGE = 2;

export default function ActivityPreview() {
  const activities =
    useActivityStore(
      (state) =>
        state.activities
    );

  const pages = [];

  for (
    let index = 0;
    index <
    activities.length;
    index +=
      ITEMS_PER_PAGE
  ) {
    pages.push(
      activities.slice(
        index,
        index +
          ITEMS_PER_PAGE
      )
    );
  }

  if (
    pages.length === 0
  ) {
    pages.push([]);
  }

  return (
    <>
      {pages.map(
        (
          pageActivities,
          pageIndex
        ) => (
          <div
            key={
              pageIndex
            }
            className="relative mx-auto my-auto mb-10 flex min-h-[297mm] w-[210mm] flex-col overflow-hidden rounded-sm border border-slate-300 bg-white p-16 text-slate-800 shadow-2xl"
          >
            {/* HEADER */}

            <div className="mb-6 flex items-center justify-between border-b pb-4">
              <h2 className="text-3xl font-bold tracking-wider">
                ผลงานและกิจกรรม
              </h2>

              <span className="text-sm font-semibold text-slate-400">
                หน้า{" "}
                {
                  pageIndex +
                  1
                }{" "}
                /{" "}
                {
                  pages.length
                }
              </span>
            </div>

            {/* EMPTY */}

            {pageActivities.length ===
            0 ? (
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 text-3xl text-slate-300">
                  <FaTrophy />
                </div>

                <h3 className="mt-5 text-lg font-bold text-slate-500">
                  ยังไม่ได้เลือกผลงานหรือกิจกรรม
                </h3>

                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
                  เลือกรายการจากแบบฟอร์มด้านซ้าย
                  แล้วข้อมูลจะปรากฏในหน้านี้
                </p>
              </div>
            ) : (
              <div className="flex flex-1 flex-col gap-6">
                {pageActivities.map(
                  (
                    activity,
                    index
                  ) => {
                    const actualIndex =
                      pageIndex *
                        ITEMS_PER_PAGE +
                      index;

                    return (
                      <article
                        key={
                          activity.id
                        }
                        className="rounded-xl border border-slate-200 bg-slate-50 p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <span className="rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-600">
                              กิจกรรมที่{" "}
                              {
                                actualIndex +
                                1
                              }
                            </span>

                            <h3 className="mt-3 text-lg font-bold text-slate-800">
                              {
                                activity.title
                              }
                            </h3>

                            {activity.organization && (
                              <p className="mt-1 text-sm font-semibold text-slate-500">
                                {
                                  activity.organization
                                }
                              </p>
                            )}
                          </div>

                          {activity.activityDate && (
                            <span className="shrink-0 text-xs font-semibold text-slate-400">
                              {
                                activity.activityDate
                              }
                            </span>
                          )}
                        </div>

                        {activity.description && (
                          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                            {
                              activity.description
                            }
                          </p>
                        )}

                        {/* IMAGES */}

                        {activity.images.length >
                          0 ? (
                          <div
                            className={`mt-4 grid gap-3 ${
                              activity.images.length ===
                              1
                                ? "grid-cols-1"
                                : "grid-cols-2"
                            }`}
                          >
                            {activity.images
                              .slice(
                                0,
                                4
                              )
                              .map(
                                (
                                  imageUrl,
                                  imageIndex
                                ) => (
                                  <div
                                    key={
                                      `${activity.id}-${imageIndex}`
                                    }
                                    className="flex min-h-[120px] items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white"
                                  >
                                    <img
                                      src={
                                        imageUrl
                                      }
                                      alt={`รูปประกอบ ${imageIndex + 1}`}
                                      className="max-h-[190px] w-full object-contain"
                                    />
                                  </div>
                                )
                              )}
                          </div>
                        ) : (
                          <div className="mt-4 flex h-28 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white text-slate-300">
                            <div className="text-center">
                              <FaImage className="mx-auto" />

                              <p className="mt-1 text-xs">
                                ไม่มีรูปประกอบ
                              </p>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  }
                )}
              </div>
            )}

            {/* FOOTER */}

            <div className="mt-6 border-t pt-4 text-center text-xs text-slate-400">
              Portfolio -
              หน้าผลงานและกิจกรรม
              {pages.length >
                1 &&
                ` (${pageIndex + 1})`}
            </div>
          </div>
        )
      )}
    </>
  );
}