"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  FaCheck,
  FaFilter,
  FaImage,
  FaPlus,
  FaTag,
  FaTrophy,
} from "react-icons/fa";

import {
  ActivityItem,
  useActivityStore,
} from "@/store/useActivityStore";

import { createClient } from "@/lib/supabase/client";

type UserTag = {
  id: string;
  name: string;
};

type LibraryActivityImage = {
  id: string;

  image_url: string;

  sort_order: number;
};

type LibraryActivity = {
  id: string;

  title: string;

  description: string;

  activity_date: string | null;

  organization: string | null;

  tagIds: string[];

  images: LibraryActivityImage[];
};

type ActivityRow = {
  id: string;

  title: string;

  description: string;

  activity_date: string | null;

  organization: string | null;
};

type ActivityTagRow = {
  activity_id: string;

  tag_id: string;
};

type ActivityImageRow = {
  id: string;

  activity_id: string;

  image_url: string;

  sort_order: number;
};

export default function ActivityForm({
  onNext,
}: {
  onNext: () => void;
}) {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const {
    activities,
    setActivities,
  } = useActivityStore();

  const [
    libraryActivities,
    setLibraryActivities,
  ] =
    useState<
      LibraryActivity[]
    >([]);

  const [tags, setTags] =
    useState<UserTag[]>([]);

  const [
    selectedFilterTag,
    setSelectedFilterTag,
  ] =
    useState<
      string | null
    >(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState("");

  useEffect(() => {
    const loadLibrary =
      async () => {
        setIsLoading(true);

        setLoadError("");

        const {
          data: { user },
          error: userError,
        } =
          await supabase.auth.getUser();

        if (
          userError ||
          !user
        ) {
          setLoadError(
            "ไม่สามารถตรวจสอบผู้ใช้งานได้"
          );

          setIsLoading(false);

          return;
        }

        const [
          {
            data:
              activityData,

            error:
              activityError,
          },

          {
            data:
              tagData,

            error:
              tagError,
          },

          {
            data:
              activityTagData,

            error:
              activityTagError,
          },

          {
            data:
              activityImageData,

            error:
              activityImageError,
          },
        ] =
          await Promise.all([
            supabase
              .from(
                "user_library_activities"
              )
              .select(
                `
                id,
                title,
                description,
                activity_date,
                organization
              `
              )
              .eq(
                "user_id",
                user.id
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                }
              ),

            supabase
              .from(
                "user_tags"
              )
              .select(
                "id, name"
              )
              .eq(
                "user_id",
                user.id
              )
              .order(
                "name",
                {
                  ascending:
                    true,
                }
              ),

            supabase
              .from(
                "user_library_activity_tags"
              )
              .select(
                "activity_id, tag_id"
              ),

            supabase
              .from(
                "user_library_activity_images"
              )
              .select(
                "id, activity_id, image_url, sort_order"
              )
              .order(
                "sort_order",
                {
                  ascending:
                    true,
                }
              ),
          ]);

        if (
          activityError
        ) {
          console.error(
            "Load activities error:",
            activityError
          );

          setLoadError(
            "ไม่สามารถโหลดผลงานและกิจกรรมได้"
          );

          setIsLoading(false);

          return;
        }

        if (tagError) {
          console.error(
            "Load tags error:",
            tagError
          );
        }

        if (
          activityTagError
        ) {
          console.error(
            "Load activity tags error:",
            activityTagError
          );
        }

        if (
          activityImageError
        ) {
          console.error(
            "Load activity images error:",
            activityImageError
          );
        }

        const activityRows:
          ActivityRow[] =
          activityData ?? [];

        const tagRows:
          ActivityTagRow[] =
          activityTagData ??
          [];

        const imageRows:
          ActivityImageRow[] =
          activityImageData ??
          [];

        setTags(
          tagData ?? []
        );

        setLibraryActivities(
          activityRows.map(
            (
              activity
            ) => ({
              ...activity,

              tagIds:
                tagRows
                  .filter(
                    (
                      relation
                    ) =>
                      relation.activity_id ===
                      activity.id
                  )
                  .map(
                    (
                      relation
                    ) =>
                      relation.tag_id
                  ),

              images:
                imageRows
                  .filter(
                    (
                      image
                    ) =>
                      image.activity_id ===
                      activity.id
                  )
                  .sort(
                    (
                      a,
                      b
                    ) =>
                      a.sort_order -
                      b.sort_order
                  )
                  .map(
                    (
                      image
                    ) => ({
                      id:
                        image.id,

                      image_url:
                        image.image_url,

                      sort_order:
                        image.sort_order,
                    })
                  ),
            })
          )
        );

        setIsLoading(false);
      };

    loadLibrary();
  }, [supabase]);

  const selectedIds =
    activities.map(
      (activity) =>
        activity.id
    );

  const isSelected = (
    id: string
  ) =>
    selectedIds.includes(
      id
    );

  const mapLibraryActivityToStore = (
    activity: LibraryActivity
  ): ActivityItem => ({
    id:
      activity.id,

    title:
      activity.title ??
      "",

    description:
      activity.description ??
      "",

    activityDate:
      activity.activity_date ??
      "",

    organization:
      activity.organization ??
      "",

    images:
      activity.images.map(
        (image) =>
          image.image_url
      ),
  });

  const toggleActivity = (
    activity: LibraryActivity
  ) => {
    if (
      isSelected(
        activity.id
      )
    ) {
      setActivities(
        activities.filter(
          (item) =>
            item.id !==
            activity.id
        )
      );

      return;
    }

    setActivities([
      ...activities,

      mapLibraryActivityToStore(
        activity
      ),
    ]);
  };

  const filteredActivities =
    selectedFilterTag
      ? libraryActivities.filter(
          (activity) =>
            activity.tagIds.includes(
              selectedFilterTag
            )
        )
      : libraryActivities;

  const handleNext = (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    onNext();
  };

  return (
    <form
      onSubmit={handleNext}
      className="flex flex-col gap-5 pb-10"
    >
      {/* HEADER */}

      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="border-l-4 border-blue-500 pl-2 text-sm font-bold text-slate-800">
              หน้าที่ 5:
              ผลงานและกิจกรรม
            </h3>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              เลือกผลงานหรือกิจกรรมจากคลังข้อมูล
              รายการที่เลือกจะถูกนำไปแสดงใน
              Portfolio
            </p>
          </div>

          <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
            เลือกแล้ว{" "}
            {
              activities.length
            }{" "}
            รายการ
          </span>
        </div>
      </div>

      {/* FILTER */}

      {tags.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <FaFilter />
            กรองด้วย Tag
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setSelectedFilterTag(
                  null
                )
              }
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                selectedFilterTag ===
                null
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"
              }`}
            >
              ทั้งหมด
            </button>

            {tags.map(
              (tag) => (
                <button
                  key={
                    tag.id
                  }
                  type="button"
                  onClick={() =>
                    setSelectedFilterTag(
                      tag.id
                    )
                  }
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                    selectedFilterTag ===
                    tag.id
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"
                  }`}
                >
                  <FaTag className="text-[9px]" />

                  {
                    tag.name
                  }
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* LOADING */}

      {isLoading && (
        <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
          <div className="text-center">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

            <p className="mt-3 text-xs font-medium text-slate-500">
              กำลังโหลดผลงานและกิจกรรม...
            </p>
          </div>
        </div>
      )}

      {/* ERROR */}

      {!isLoading &&
        loadError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-bold text-red-700">
              {
                loadError
              }
            </p>
          </div>
        )}

      {/* EMPTY */}

      {!isLoading &&
        !loadError &&
        libraryActivities.length ===
          0 && (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FaTrophy />
            </div>

            <h4 className="mt-3 text-sm font-bold text-slate-800">
              ยังไม่มีผลงานหรือกิจกรรมในคลัง
            </h4>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              เพิ่มข้อมูลในคลังของคุณก่อน
              แล้วกลับมาเลือกใช้ใน
              Portfolio
            </p>

            <Link
              href="/my-data"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700"
            >
              <FaPlus />
              ไปเพิ่มข้อมูล
            </Link>
          </div>
        )}

      {/* NO FILTER RESULT */}

      {!isLoading &&
        !loadError &&
        libraryActivities.length >
          0 &&
        filteredActivities.length ===
          0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
            <p className="text-xs font-semibold text-slate-500">
              ไม่มีผลงานหรือกิจกรรมที่ตรงกับ
              Tag นี้
            </p>
          </div>
        )}

      {/* ACTIVITY LIST */}

      {!isLoading &&
        !loadError &&
        filteredActivities.length >
          0 && (
          <div className="flex flex-col gap-3">
            {filteredActivities.map(
              (
                activity
              ) => {
                const selected =
                  isSelected(
                    activity.id
                  );

                const itemTags =
                  tags.filter(
                    (
                      tag
                    ) =>
                      activity.tagIds.includes(
                        tag.id
                      )
                  );

                return (
                  <button
                    key={
                      activity.id
                    }
                    type="button"
                    onClick={() =>
                      toggleActivity(
                        activity
                      )
                    }
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      selected
                        ? "border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-200"
                        : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* CHECK */}

                      <div
                        className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
                          selected
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-300 bg-white text-transparent"
                        }`}
                      >
                        <FaCheck className="text-[10px]" />
                      </div>

                      {/* MAIN */}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="break-words text-sm font-black text-slate-800">
                              {
                                activity.title
                              }
                            </h4>

                            {activity.organization && (
                              <p className="mt-1 text-xs font-semibold text-slate-500">
                                {
                                  activity.organization
                                }
                              </p>
                            )}
                          </div>

                          {selected && (
                            <span className="shrink-0 rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-bold text-white">
                              เลือกแล้ว
                            </span>
                          )}
                        </div>

                        {activity.description && (
                          <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-500">
                            {
                              activity.description
                            }
                          </p>
                        )}

                        {activity.activity_date && (
                          <p className="mt-2 text-[11px] font-medium text-slate-400">
                            วันที่{" "}
                            {
                              activity.activity_date
                            }
                          </p>
                        )}

                        {/* IMAGES */}

                        {activity.images.length >
                          0 && (
                          <div className="mt-3 flex gap-2 overflow-hidden">
                            {activity.images
                              .slice(
                                0,
                                4
                              )
                              .map(
                                (
                                  image
                                ) => (
                                  <div
                                    key={
                                      image.id
                                    }
                                    className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                                  >
                                    <img
                                      src={
                                        image.image_url
                                      }
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                )
                              )}

                            {activity.images.length >
                              4 && (
                              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">
                                +
                                {
                                  activity.images.length -
                                  4
                                }
                              </div>
                            )}
                          </div>
                        )}

                        {/* TAGS */}

                        {itemTags.length >
                          0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {itemTags.map(
                              (
                                tag
                              ) => (
                                <span
                                  key={
                                    tag.id
                                  }
                                  className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-500"
                                >
                                  {
                                    tag.name
                                  }
                                </span>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              }
            )}
          </div>
        )}

      {/* LIBRARY LINK */}

      {libraryActivities.length >
        0 && (
        <Link
          href="/my-data"
          className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-xs font-bold text-slate-500 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
        >
          <FaImage />
          จัดการผลงานและกิจกรรมในคลัง
        </Link>
      )}

      {/* NEXT */}

      <button
        type="submit"
        className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-slate-800 py-3 text-sm font-bold text-white shadow-md transition hover:bg-slate-900"
      >
        <FaCheck />
        ยืนยันผลงานและกิจกรรม
      </button>
    </form>
  );
}