"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

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

  tagIds: string[];
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

type UserTag = {
  id: string;
  name: string;
};

type EducationTagRow = {
  education_id: string;
  tag_id: string;
};

export default function EducationForm({
  onNext,
}: {
  onNext: () => void;
}) {
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
              educationData,
            error:
              educationError,
          },

          {
            data: tagData,
            error: tagError,
          },

          {
            data:
              educationTagData,
            error:
              educationTagError,
          },
        ] =
          await Promise.all([
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
                "user_library_education_tags"
              )
              .select(
                "education_id, tag_id"
              ),
          ]);

        if (
          educationError
        ) {
          console.error(
            "Load education library error:",
            educationError
          );

          setLoadError(
            "ไม่สามารถโหลดประวัติการศึกษาได้"
          );

          setIsLoading(false);

          return;
        }

        if (tagError) {
          console.error(
            "Load education tags error:",
            tagError
          );
        }

        if (
          educationTagError
        ) {
          console.error(
            "Load education tag links error:",
            educationTagError
          );
        }

        const rows:
          EducationRow[] =
          educationData ?? [];

        const tagRows:
          EducationTagRow[] =
          educationTagData ??
          [];

        setTags(
          tagData ?? []
        );

        setLibraryEducations(
          rows.map(
            (
              education
            ) => ({
              ...education,

              tagIds:
                tagRows
                  .filter(
                    (
                      relation
                    ) =>
                      relation.education_id ===
                      education.id
                  )
                  .map(
                    (
                      relation
                    ) =>
                      relation.tag_id
                  ),
            })
          )
        );

        setIsLoading(false);
      };

    loadLibrary();
  }, [supabase]);

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

  const mapLibraryEducationToStore = (
    education: LibraryEducation
  ): EducationItem => ({
    id: education.id,

    level:
      education.level ??
      "",

    schoolName:
      education.school_name ??
      "",

    studyPlan:
      education.study_plan ??
      "",

    gpa:
      education.gpa ===
      null
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

  const toggleEducation = (
    education: LibraryEducation
  ) => {
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

  const filteredEducations =
    selectedFilterTag
      ? libraryEducations.filter(
          (education) =>
            education.tagIds.includes(
              selectedFilterTag
            )
        )
      : libraryEducations;

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
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="border-l-4 border-blue-500 pl-2 text-sm font-bold text-slate-800">
              หน้าที่ 4:
              ประวัติการศึกษา
            </h3>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              เลือกประวัติการศึกษาจากคลังข้อมูลของคุณ
              รายการที่เลือกจะปรากฏใน
              Portfolio
            </p>
          </div>

          <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
            เลือกแล้ว{" "}
            {
              educations.length
            }{" "}
            รายการ
          </span>
        </div>
      </div>

      {/* TAG FILTER */}

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
              กำลังโหลดประวัติการศึกษา...
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
        libraryEducations.length ===
          0 && (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FaGraduationCap />
            </div>

            <h4 className="mt-3 text-sm font-bold text-slate-800">
              ยังไม่มีประวัติการศึกษาในคลัง
            </h4>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              เพิ่มประวัติการศึกษาที่คลังข้อมูลก่อน
              แล้วกลับมาเลือกใช้งานใน
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
        libraryEducations.length >
          0 &&
        filteredEducations.length ===
          0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
            <p className="text-xs font-semibold text-slate-500">
              ไม่มีประวัติการศึกษาที่ตรงกับ
              Tag นี้
            </p>
          </div>
        )}

      {/* EDUCATION LIST */}

      {!isLoading &&
        !loadError &&
        filteredEducations.length >
          0 && (
          <div className="flex flex-col gap-3">
            {filteredEducations.map(
              (
                education
              ) => {
                const selected =
                  isSelected(
                    education.id
                  );

                const itemTags =
                  tags.filter(
                    (
                      tag
                    ) =>
                      education.tagIds.includes(
                        tag.id
                      )
                  );

                return (
                  <button
                    key={
                      education.id
                    }
                    type="button"
                    onClick={() =>
                      toggleEducation(
                        education
                      )
                    }
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      selected
                        ? "border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-200"
                        : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* CHECKBOX */}

                      <div
                        className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition ${
                          selected
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-300 bg-white text-transparent"
                        }`}
                      >
                        <FaCheck className="text-[10px]" />
                      </div>

                      {/* LOGO */}

                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                        {education.logo_url ? (
                          <img
                            src={
                              education.logo_url
                            }
                            alt={
                              education.school_name
                            }
                            className="h-full w-full object-contain p-1"
                          />
                        ) : (
                          <FaSchool className="text-xl text-slate-300" />
                        )}
                      </div>

                      {/* DETAIL */}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-[11px] font-bold text-blue-600">
                              {
                                education.level
                              }
                            </p>

                            <h4 className="mt-0.5 break-words text-sm font-black text-slate-800">
                              {
                                education.school_name
                              }
                            </h4>
                          </div>

                          {selected && (
                            <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-bold text-white">
                              เลือกแล้ว
                            </span>
                          )}
                        </div>

                        {education.study_plan && (
                          <p className="mt-1 text-xs text-slate-500">
                            {
                              education.study_plan
                            }
                          </p>
                        )}

                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
                          {education.gpa !==
                            null && (
                            <span>
                              GPAX{" "}
                              {
                                education.gpa
                              }
                            </span>
                          )}

                          {(education.start_year ||
                            education.end_year) && (
                            <span>
                              {education.start_year ||
                                "?"}{" "}
                              -{" "}
                              {education.end_year ||
                                "ปัจจุบัน"}
                            </span>
                          )}
                        </div>

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

      {/* MANAGE LIBRARY */}

      {libraryEducations.length >
        0 && (
        <Link
          href="/my-data"
          className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-xs font-bold text-slate-500 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
        >
          <FaBook />
          จัดการประวัติการศึกษาในคลัง
        </Link>
      )}

      {/* NEXT */}

      <button
        type="submit"
        className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-slate-800 py-3 text-sm font-bold text-white shadow-md transition hover:bg-slate-900"
      >
        <FaCheck />
        ยืนยันประวัติการศึกษา
      </button>
    </form>
  );
}