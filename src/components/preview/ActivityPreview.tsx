"use client";
import { FaImage } from "react-icons/fa";
import { useActivityStore } from "@/store/useActivityStore";
import PaginatedSection from "./PaginatedSection";
export default function ActivityPreview() {
  const activities = useActivityStore(state => state.activities);
  return <PaginatedSection title="ผลงานและกิจกรรม" cards={activities.map((activity, index) => (
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
                                index +
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
  ))} />;
}
