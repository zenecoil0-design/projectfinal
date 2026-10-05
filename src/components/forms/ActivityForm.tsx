"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  useSearchParams,
} from "next/navigation";

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

type PortfolioActivityRow = {
  activity_id: string;
  sort_order: number;
};

export default function ActivityForm({
  onNext,
}: {
  onNext: () => void;
}) {
  const searchParams =
    useSearchParams();

  const portfolioId =
    searchParams.get("portfolio");

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
  ] = useState<
    string | null
  >(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [loadError, setLoadError] =
    useState("");

  const [
    saveError,
    setSaveError,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const mapLibraryActivityToStore = (
    activity: LibraryActivity
  ): ActivityItem => ({
    id: activity.id,

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

  useEffect(() => {
    const loadData =
      async () => {
        setIsLoading(true);

        setLoadError("");
        setSaveError("");
        setSuccessMessage("");

        setActivities([]);

        if (!portfolioId) {
          setLoadError(
            "ไม่พบ Portfolio ID"
          );

          setIsLoading(false);

          return;
        }

        try {
          const {
            data: { user },
            error: userError,
          } =
            await supabase.auth.getUser();

          if (
            userError ||
            !user
          ) {
            throw new Error(
              "ไม่สามารถตรวจสอบผู้ใช้งานได้"
            );
          }

          const [
            {
              data:
                activityData,
              error:
                activityError,
            },

            {
              data: tagData,
              error: tagError,
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

            {
              data:
                portfolioActivityData,
              error:
                portfolioActivityError,
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

              supabase
                .from(
                  "portfolio_activities"
                )
                .select(
                  "activity_id, sort_order"
                )
                .eq(
                  "portfolio_id",
                  portfolioId
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
            throw activityError;
          }

          if (tagError) {
            console.error(
              "Load activity tags error:",
              tagError
            );
          }

          if (
            activityTagError
          ) {
            console.error(
              "Load activity tag relations error:",
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

          if (
            portfolioActivityError
          ) {
            throw portfolioActivityError;
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

          const portfolioRows:
            PortfolioActivityRow[] =
            portfolioActivityData ??
            [];

          const mappedLibrary:
            LibraryActivity[] =
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
            );

          setTags(
            tagData ?? []
          );

          setLibraryActivities(
            mappedLibrary
          );

          const selectedItems =
            portfolioRows
              .map(
                (
                  relation
                ) =>
                  mappedLibrary.find(
                    (
                      activity
                    ) =>
                      activity.id ===
                      relation.activity_id
                  )
              )
              .filter(
                (
                  activity
                ): activity is LibraryActivity =>
                  Boolean(
                    activity
                  )
              )
              .map(
                mapLibraryActivityToStore
              );

          setActivities(
            selectedItems
          );
        } catch (
          error: any
        ) {
          console.error(
            "Load activity form error:",
            error
          );

          setLoadError(
            error?.message ||
              "ไม่สามารถโหลดผลงานและกิจกรรมได้"
          );
        } finally {
          setIsLoading(false);
        }
      };

    loadData();
  }, [
    portfolioId,
    supabase,
    setActivities,
  ]);

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

  const toggleActivity = (
    activity: LibraryActivity
  ) => {
    setSaveError("");
    setSuccessMessage("");

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

  const handleNext = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!portfolioId) {
      setSaveError(
        "ไม่พบ Portfolio ID"
      );

      return;
    }

    setIsSaving(true);
    setSaveError("");
    setSuccessMessage("");

    try {
      const {
        error:
          deleteError,
      } = await supabase
        .from(
          "portfolio_activities"
        )
        .delete()
        .eq(
          "portfolio_id",
          portfolioId
        );

      if (deleteError) {
        throw deleteError;
      }

      if (
        activities.length > 0
      ) {
        const rowsToInsert =
          activities.map(
            (
              activity,
              index
            ) => ({
              portfolio_id:
                portfolioId,

              activity_id:
                activity.id,

              sort_order:
                index,
            })
          );

        const {
          error:
            insertError,
        } = await supabase
          .from(
            "portfolio_activities"
          )
          .insert(
            rowsToInsert
          );

        if (insertError) {
          throw insertError;
        }
      }

      setSuccessMessage(
        "บันทึกผลงานและกิจกรรมเรียบร้อยแล้ว"
      );

      onNext();
    } catch (
      error: any
    ) {
      console.error(
        "Save portfolio activities error:",
        error
      );

      setSaveError(
        error?.message ||
          "ไม่สามารถบันทึกผลงานและกิจกรรมได้"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleNext}
      className="flex flex-col gap-5 pb-10"
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="border-l-4 border-blue-500 pl-2 text-sm font-bold text-slate-800">
              หน้าที่ 5:
              ผลงานและกิจกรรม
            </h3>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              เลือกผลงานหรือกิจกรรมจากคลังข้อมูล
              รายการที่เลือกจะถูกบันทึกเฉพาะ
              Portfolio เล่มนี้
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

                  {tag.name}
                </button>
              )
            )}
          </div>
        </div>
      )}

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

      {!isLoading &&
        loadError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-bold text-red-700">
              {loadError}
            </p>
          </div>
        )}

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
                      <div
                        className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
                          selected
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-300 bg-white text-transparent"
                        }`}
                      >
                        <FaCheck className="text-[10px]" />
                      </div>

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
                          </div>
                        )}

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

      {saveError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold leading-5 text-red-600">
          {saveError}
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold leading-5 text-emerald-700">
          {successMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={
          isLoading ||
          isSaving
        }
        className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-slate-800 py-3 text-sm font-bold text-white shadow-md transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <FaCheck />

        {isSaving
          ? "กำลังบันทึก..."
          : "ยืนยันผลงานและกิจกรรม"}
      </button>
    </form>
  );
}