"use client";
import { saveSelection } from "@/lib/editor/save-selection";

import { useEditorSession } from "@/components/editor/EditorSession";
import { errorMessage as getErrorMessage } from "@/lib/errors";

import {
  useEffect,
  useRef,
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
  const { reportLoaded, markSaved, status, exporting } = useEditorSession();
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
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
    let cancelled = false;
    let loadSucceeded = true;
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

          if (cancelled) return;

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

          if (cancelled) return;

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
            throw activityImageError;
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
          error: unknown
        ) {
          if (cancelled) return;
          loadSucceeded = false;
          console.error(
            "Load activity form error:",
            error
          );

          setLoadError(
            getErrorMessage(error) ||
              "ไม่สามารถโหลดผลงานและกิจกรรมได้"
          );
        } finally {
          if (!cancelled) {
            reportLoaded("activity", loadSucceeded);
          setIsLoading(false);
        }
          }
      };

    loadData();
    return () => { cancelled = true; };
  }, [
    portfolioId,
    supabase,
    setActivities,
    reportLoaded,
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
      await saveSelection(supabase, portfolioId, "activity", activities.map(item => item.id));

      if (!mounted.current) return;
      markSaved("activity");
      setSuccessMessage(
        "บันทึกผลงานและกิจกรรมเรียบร้อยแล้ว"
      );

      onNext();
    } catch (
      error: unknown
    ) {
      console.error(
        "Save portfolio activities error:",
        error
      );

      setSaveError(
        getErrorMessage(error) ||
          "ไม่สามารถบันทึกผลงานและกิจกรรมได้"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleNext} className="@container flex min-w-0 flex-col gap-5 pb-6">
      <fieldset disabled={exporting || isSaving || isLoading || status.activity === "error"} className="contents">
        <div className="min-w-0 space-y-3">
          <h3 className="border-l-4 border-blue-500 pl-2 text-sm font-bold text-slate-800">หน้าที่ 5: ผลงานและกิจกรรม</h3>
          <p className="text-sm leading-6 text-slate-600">
            เลือกผลงานและกิจกรรมจากคลังข้อมูลของคุณ รายการที่เลือกจะถูกบันทึกเฉพาะ Portfolio เล่มนี้
          </p>
          {!isLoading && !loadError && (
            <p role="status" className="w-fit rounded-full bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
              เลือกแล้ว {activities.length} รายการ
            </p>
          )}
        </div>

        {!isLoading && !loadError && libraryActivities.length > 0 && activities.length === 0 && (
          <p className="text-sm leading-6 text-slate-600">ยังไม่ได้เลือกรายการ เลือกผลงานและกิจกรรมที่ต้องการใส่ในพอร์ต แล้วกดบันทึก</p>
        )}

        {tags.length > 0 && (
          <div role="group" aria-label="กรองผลงานและกิจกรรมด้วย Tag" className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-700"><FaFilter aria-hidden="true" />กรองด้วย Tag</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" aria-pressed={selectedFilterTag === null} onClick={() => setSelectedFilterTag(null)}
                className={`min-h-11 max-w-full rounded-full border px-3 py-2 text-left text-sm font-semibold wrap-anywhere transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${selectedFilterTag === null ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"}`}>ทั้งหมด</button>
              {tags.map(tag => (
                <button key={tag.id} type="button" aria-pressed={selectedFilterTag === tag.id} onClick={() => setSelectedFilterTag(tag.id)}
                  className={`inline-flex min-h-11 min-w-0 max-w-full items-center gap-2 rounded-full border px-3 py-2 text-left text-sm font-semibold wrap-anywhere transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${selectedFilterTag === tag.id ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"}`}>
                  <FaTag aria-hidden="true" className="shrink-0 text-xs" /><span className="min-w-0">{tag.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {isLoading && (
          <div role="status" className="flex min-h-44 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-center">
              <div aria-hidden="true" className="mx-auto h-7 w-7 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
              <p className="mt-3 text-sm text-slate-600">กำลังโหลดผลงานและกิจกรรม...</p>
            </div>
          </div>
        )}
        {!isLoading && loadError && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium leading-6 text-red-700 wrap-anywhere">{loadError}</div>
        )}
        {!isLoading && !loadError && libraryActivities.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center">
            <FaTrophy aria-hidden="true" className="mx-auto text-2xl text-blue-600" />
            <h4 className="mt-3 text-sm font-bold text-slate-800">ยังไม่มีผลงานและกิจกรรมในคลัง</h4>
            <p className="mt-2 text-sm leading-6 text-slate-600">เพิ่มผลงานและกิจกรรมที่คลังข้อมูลก่อน แล้วกลับมาเลือกใช้งานใน Portfolio</p>
            <Link href="/my-data" className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500">
              <FaPlus aria-hidden="true" />ไปเพิ่มข้อมูล
            </Link>
          </div>
        )}
        {!isLoading && !loadError && libraryActivities.length > 0 && filteredActivities.length === 0 && (
          <p role="status" className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">ไม่มีผลงานและกิจกรรมที่ตรงกับ Tag นี้ ลองเลือก Tag อื่นหรือทั้งหมด</p>
        )}

        {!isLoading && !loadError && filteredActivities.length > 0 && (
          <div role="group" aria-label="รายการผลงานและกิจกรรมจากคลัง" className="flex min-w-0 flex-col gap-3">
            {filteredActivities.map(activity => {
              const selected = isSelected(activity.id);
              const itemTags = tags.filter(tag => activity.tagIds.includes(tag.id));
              return (
                <label key={activity.id} className={`block min-w-0 cursor-pointer rounded-xl border p-3 text-left wrap-anywhere transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-500 ${selected ? "border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-200" : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"}`}>
                  <span className="flex min-w-0 items-start gap-3">
                    <input type="checkbox" checked={selected} onChange={() => toggleActivity(activity)}
                      aria-labelledby={`activity-title-${activity.id}`}
                      className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-blue-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-500 disabled:cursor-not-allowed" />
                    <span className="block min-w-0 flex-1">
                      <span id={`activity-title-${activity.id}`} className="block text-sm font-bold leading-6 text-slate-800">{activity.title}</span>
                      {activity.organization && <span className="mt-1 block text-sm leading-6 text-slate-600">{activity.organization}</span>}
                      {selected && <span className="mt-2 inline-block max-w-full rounded-md bg-blue-100 px-2 py-1 text-xs font-semibold leading-5 text-blue-800">เลือกแล้ว · ลำดับ {selectedIds.indexOf(activity.id) + 1}</span>}
                      {activity.description && <span className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{activity.description}</span>}
                      {activity.activity_date && <span className="mt-2 block text-xs leading-5 text-slate-500">วันที่ทำกิจกรรม {activity.activity_date}</span>}
                      {activity.images.length > 0 && <span className="mt-3 flex min-w-0 flex-wrap gap-2">
                        {activity.images.slice(0, 4).map(image => <span key={image.id} className="block h-20 w-20 max-w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                          <img src={image.image_url} alt="" className="h-full w-full object-cover" />
                        </span>)}
                      </span>}
                      {itemTags.length > 0 && <span className="mt-3 flex min-w-0 flex-wrap gap-2">
                        {itemTags.map(tag => <span key={tag.id} className="min-w-0 max-w-full rounded-full bg-slate-100 px-2 py-1 text-xs font-medium leading-5 text-slate-600">{tag.name}</span>)}
                      </span>}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        )}

        {libraryActivities.length > 0 && (
          <Link href="/my-data" className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-center text-sm font-semibold leading-6 text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500">
            <FaImage aria-hidden="true" className="shrink-0" />จัดการผลงานและกิจกรรมในคลัง
          </Link>
        )}
        <div className="space-y-3 border-t border-slate-200 pt-4">
          <p className="text-sm leading-6 text-slate-600">กดบันทึกเพื่อเก็บรายการที่เลือกและไปเลือกเกียรติบัตร</p>
          {saveError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700 wrap-anywhere">{saveError}</div>}
          {successMessage && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium leading-6 text-emerald-700">{successMessage}</div>}
          <button type="submit" disabled={isLoading || isSaving} aria-busy={isSaving}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-60">
            <FaCheck aria-hidden="true" />{isSaving ? "กำลังบันทึก..." : "บันทึกและไปหน้าถัดไป"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
