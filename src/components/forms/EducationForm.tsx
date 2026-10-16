"use client";
import { EditorTagNotice } from "@/components/editor/EditorTagNotice";
import { useEditorTags } from "@/components/editor/useEditorTags";
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
  FaBook,
  FaCheck,
  FaFilter,
  FaGraduationCap,
  FaPlus,
  FaSchool,
  FaTag,
} from "react-icons/fa";

import {
  EducationItem,
  useEducationStore,
} from "@/store/useEducationStore";

import { createClient } from "@/lib/supabase/client";

type LibraryEducation = {
  id: string;

  level: string;

  school_name: string;

  study_plan: string;

  gpa: number | null;

  logo_url: string | null;

  start_year: string | null;

  end_year: string | null;

};

type EducationRow = {
  id: string;

  level: string;

  school_name: string;

  study_plan: string;

  gpa: number | null;

  logo_url: string | null;

  start_year: string | null;

  end_year: string | null;
};

type PortfolioEducationRow = {
  education_id: string;
  sort_order: number;
};

export default function EducationForm({
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
    educations,
    setEducations,
  } = useEducationStore();

  const [
    libraryEducations,
    setLibraryEducations,
  ] =
    useState<
      LibraryEducation[]
    >([]);

  const tagLoad = useEditorTags(supabase, "education");
  const { tags, filterTag: selectedFilterTag, setFilterTag: setSelectedFilterTag, load: loadTags } = tagLoad;

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

  // =====================================================
  // MAP LIBRARY -> STORE
  // =====================================================

  const mapLibraryEducationToStore = (
    education: LibraryEducation
  ): EducationItem => ({
    id: education.id,

    level:
      education.level ?? "",

    schoolName:
      education.school_name ??
      "",

    studyPlan:
      education.study_plan ??
      "",

    gpa:
      education.gpa === null
        ? ""
        : String(
            education.gpa
          ),

    logoUrl:
      education.logo_url ??
      "",

    startYear:
      education.start_year ??
      "",

    endYear:
      education.end_year ??
      "",
  });

  // =====================================================
  // LOAD LIBRARY + PORTFOLIO SELECTION
  // =====================================================

  useEffect(() => {
    let cancelled = false;
    let loadSucceeded = true;
    const loadData =
      async () => {
        setIsLoading(true);

        setLoadError("");
        setSaveError("");
        setSuccessMessage("");

        /*
          สำคัญ:
          เคลียร์ค่าที่ค้างใน Zustand ก่อน

          เพื่อไม่ให้ Portfolio ก่อนหน้า
          โผล่มาชั่วคราวใน Portfolio ใหม่
        */
        setEducations([]);

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

          void loadTags(user.id);

          const [
            {
              data:
                educationData,
              error:
                educationError,
            },

            {
              data:
                portfolioEducationData,
              error:
                portfolioEducationError,
            },
          ] =
            await Promise.all([
              // =========================================
              // Library Educations
              // =========================================

              supabase
                .from(
                  "user_library_educations"
                )
                .select(
                  `
                    id,
                    level,
                    school_name,
                    study_plan,
                    gpa,
                    logo_url,
                    start_year,
                    end_year
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

              // Portfolio <-> Education

              supabase
                .from(
                  "portfolio_educations"
                )
                .select(
                  "education_id, sort_order"
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
            educationError
          ) {
            throw educationError;
          }

          if (
            portfolioEducationError
          ) {
            throw portfolioEducationError;
          }

          const rows:
            EducationRow[] =
            educationData ?? [];

          const portfolioRows:
            PortfolioEducationRow[] =
            portfolioEducationData ??
            [];

          // =========================================
          // สร้าง Library (Tags แยกโหลดเพื่อไม่แตะ selection ตอน retry)
          // =========================================

          const mappedLibrary:
            LibraryEducation[] =
            rows.map(
              (
                education
              ) => ({
                ...education,
              })
            );

          setLibraryEducations(
            mappedLibrary
          );

          // =========================================
          // โหลด Education ที่ Portfolio นี้เลือกไว้
          // =========================================

          const selectedItems =
            portfolioRows
              .map(
                (
                  relation
                ) =>
                  mappedLibrary.find(
                    (
                      education
                    ) =>
                      education.id ===
                      relation.education_id
                  )
              )
              .filter(
                (
                  education
                ): education is LibraryEducation =>
                  Boolean(
                    education
                  )
              )
              .map(
                mapLibraryEducationToStore
              );

          setEducations(
            selectedItems
          );
        } catch (
          error: unknown
        ) {
          if (cancelled) return;
          loadSucceeded = false;
          console.error(
            "Load education form error:",
            error
          );

          setLoadError(
            getErrorMessage(error) ||
              "ไม่สามารถโหลดประวัติการศึกษาได้"
          );
        } finally {
          if (!cancelled) {
            reportLoaded("education", loadSucceeded);
          setIsLoading(false);
        }
          }
      };

    loadData();
    return () => { cancelled = true; };
  }, [
    portfolioId,
    supabase,
    setEducations,
    reportLoaded,
    loadTags,
  ]);

  // =====================================================
  // SELECTED IDS
  // =====================================================

  const selectedIds =
    educations.map(
      (education) =>
        education.id
    );

  const isSelected = (
    id: string
  ) =>
    selectedIds.includes(
      id
    );

  // =====================================================
  // TOGGLE EDUCATION
  // =====================================================

  const toggleEducation = (
    education: LibraryEducation
  ) => {
    setSaveError("");
    setSuccessMessage("");

    if (
      isSelected(
        education.id
      )
    ) {
      setEducations(
        educations.filter(
          (item) =>
            item.id !==
            education.id
        )
      );

      return;
    }

    setEducations([
      ...educations,

      mapLibraryEducationToStore(
        education
      ),
    ]);
  };

  // =====================================================
  // FILTER
  // =====================================================

  const filteredEducations =
    selectedFilterTag
      ? libraryEducations.filter(
          (education) =>
            tagLoad.hasTag(education.id, selectedFilterTag)
        )
      : libraryEducations;

  // =====================================================
  // SAVE PORTFOLIO EDUCATIONS
  // =====================================================

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
      await saveSelection(supabase, portfolioId, "education", educations.map(item => item.id));

      if (!mounted.current) return;
      markSaved("education");
      setSuccessMessage(
        "บันทึกประวัติการศึกษาเรียบร้อยแล้ว"
      );

      onNext();
    } catch (
      error: unknown
    ) {
      console.error(
        "Save portfolio educations error:",
        error
      );

      setSaveError(
        getErrorMessage(error) ||
          "ไม่สามารถบันทึกประวัติการศึกษาได้"
      );
    } finally {
      setIsSaving(false);
    }
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <form onSubmit={handleNext} className="@container flex min-w-0 flex-col gap-5 pb-6">
      <fieldset disabled={exporting || isSaving || isLoading || status.education === "error"} className="contents">
        <div className="min-w-0 space-y-3">
          <h3 className="border-l-4 border-blue-500 pl-2 text-sm font-bold text-slate-800">หน้าที่ 4: ประวัติการศึกษา</h3>
          <p className="text-sm leading-6 text-slate-600">
            เลือกประวัติการศึกษาจากคลังข้อมูลของคุณ รายการที่เลือกจะถูกบันทึกเฉพาะ Portfolio เล่มนี้
          </p>
          {!isLoading && !loadError && (
            <p role="status" className="w-fit rounded-full bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
              เลือกแล้ว {educations.length} รายการ
            </p>
          )}
        </div>

        {!isLoading && !loadError && libraryEducations.length > 0 && educations.length === 0 && (
          <p className="text-sm leading-6 text-slate-600">ยังไม่ได้เลือกรายการ เลือกประวัติการศึกษาที่ต้องการใส่ในพอร์ต แล้วกดบันทึก</p>
        )}

        <EditorTagNotice state={tagLoad} disabled={exporting || isSaving} />

        {tags.length > 0 && (
          <div role="group" aria-label="กรองประวัติการศึกษาด้วย Tag" className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-700"><FaFilter aria-hidden="true" />กรองด้วย Tag</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" disabled={!tagLoad.ready} aria-pressed={selectedFilterTag === null} onClick={() => setSelectedFilterTag(null)}
                className={`min-h-11 max-w-full rounded-full border px-3 py-2 text-left text-sm font-semibold wrap-anywhere transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${selectedFilterTag === null ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"}`}>ทั้งหมด</button>
              {tags.map(tag => (
                <button key={tag.id} type="button" disabled={!tagLoad.ready} aria-pressed={selectedFilterTag === tag.id} onClick={() => setSelectedFilterTag(tag.id)}
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
              <p className="mt-3 text-sm text-slate-600">กำลังโหลดประวัติการศึกษา...</p>
            </div>
          </div>
        )}
        {!isLoading && loadError && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium leading-6 text-red-700 wrap-anywhere">{loadError}</div>
        )}
        {!isLoading && !loadError && libraryEducations.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center">
            <FaGraduationCap aria-hidden="true" className="mx-auto text-2xl text-blue-600" />
            <h4 className="mt-3 text-sm font-bold text-slate-800">ยังไม่มีประวัติการศึกษาในคลัง</h4>
            <p className="mt-2 text-sm leading-6 text-slate-600">เพิ่มประวัติการศึกษาที่คลังข้อมูลก่อน แล้วกลับมาเลือกใช้งานใน Portfolio</p>
            <Link href="/my-data" className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500">
              <FaPlus aria-hidden="true" />ไปเพิ่มข้อมูล
            </Link>
          </div>
        )}
        {!isLoading && !loadError && libraryEducations.length > 0 && filteredEducations.length === 0 && (
          <p role="status" className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">ไม่มีประวัติการศึกษาที่ตรงกับ Tag นี้ ลองเลือก Tag อื่นหรือทั้งหมด</p>
        )}

        {!isLoading && !loadError && filteredEducations.length > 0 && (
          <div role="group" aria-label="รายการประวัติการศึกษาจากคลัง" className="flex min-w-0 flex-col gap-3">
            {filteredEducations.map(education => {
              const selected = isSelected(education.id);
              const itemTags = tagLoad.tagsFor(education.id);
              return (
                <label key={education.id} className={`block min-w-0 cursor-pointer rounded-xl border p-3 text-left wrap-anywhere transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-500 ${selected ? "border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-200" : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"}`}>
                  <span className="flex min-w-0 items-start gap-3">
                    <input type="checkbox" checked={selected} onChange={() => toggleEducation(education)}
                      aria-labelledby={`education-title-${education.id}`}
                      className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-blue-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-500 disabled:cursor-not-allowed" />
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                      {education.logo_url ? <img src={education.logo_url} alt="" className="h-full w-full object-contain p-1" /> : <FaSchool aria-hidden="true" className="text-xl text-slate-400" />}
                    </span>
                    <span className="block min-w-0 flex-1">
                      <span id={`education-title-${education.id}`} className="block text-sm font-bold leading-6 text-slate-800">{education.school_name}</span>
                      <span className="mt-1 block text-sm font-semibold leading-6 text-blue-700">{education.level}</span>
                      {selected && <span className="mt-2 inline-block max-w-full rounded-md bg-blue-100 px-2 py-1 text-xs font-semibold leading-5 text-blue-800">เลือกแล้ว · ลำดับ {selectedIds.indexOf(education.id) + 1}</span>}
                      {education.study_plan && <span className="mt-2 block text-sm leading-6 text-slate-600">{education.study_plan}</span>}
                      <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs leading-5 text-slate-500">
                        {education.gpa !== null && <span>GPAX {education.gpa}</span>}
                        {(education.start_year || education.end_year) && <span>{education.start_year || "?"} - {education.end_year || "ปัจจุบัน"}</span>}
                      </span>
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

        {libraryEducations.length > 0 && (
          <Link href="/my-data" className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-center text-sm font-semibold leading-6 text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500">
            <FaBook aria-hidden="true" className="shrink-0" />จัดการประวัติการศึกษาในคลัง
          </Link>
        )}
        <div className="space-y-3 border-t border-slate-200 pt-4">
          <p className="text-sm leading-6 text-slate-600">กดบันทึกเพื่อเก็บรายการที่เลือกและไปเลือกผลงานและกิจกรรม</p>
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
