"use client";
import CropInput from "@/components/images/CropInput";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  FaBook,
  FaEdit,
  FaImage,
  FaPlus,
  FaSchool,
  FaTag,
  FaTrash,
  FaTimes,
} from "react-icons/fa";

import { createClient } from "@/lib/supabase/client";

type UserTag = {
  id: string;
  name: string;
};

type Education = {
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

type EducationTagRow = {
  education_id: string;
  tag_id: string;
};

const inputClass =
  "min-h-11 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-800 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:text-sm";

export default function EducationLibrary() {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const [userId, setUserId] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [educations, setEducations] =
    useState<Education[]>([]);

  const [tags, setTags] =
    useState<UserTag[]>([]);

  const [showForm, setShowForm] =
    useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [level, setLevel] =
    useState("");

  const [schoolName, setSchoolName] =
    useState("");

  const [studyPlan, setStudyPlan] =
    useState("");

  const [gpa, setGpa] =
    useState("");

  const [startYear, setStartYear] =
    useState("");

  const [endYear, setEndYear] =
    useState("");

  const [
    currentLogoUrl,
    setCurrentLogoUrl,
  ] = useState("");

  const [
    selectedLogo,
    setSelectedLogo,
  ] = useState<File | null>(null);

  const [
    logoPreview,
    setLogoPreview,
  ] = useState("");

  const [
    removeLogo,
    setRemoveLogo,
  ] = useState(false);

  const [
    selectedTagIds,
    setSelectedTagIds,
  ] = useState<string[]>([]);

  const [newTagName, setNewTagName] =
    useState("");

  const [isAddingTag, setIsAddingTag] =
    useState(false);

  const loadData = useCallback(async (
    uid: string
  ) => {
    const [
      {
        data: educationData,
        error: educationError,
      },
      {
        data: tagsData,
        error: tagsError,
      },
      {
        data: tagLinks,
        error: tagLinksError,
      },
    ] = await Promise.all([
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
          uid
        )
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("user_tags")
        .select("id, name")
        .eq(
          "user_id",
          uid
        )
        .order("name"),

      supabase
        .from(
          "user_library_education_tags"
        )
        .select(
          "education_id, tag_id"
        ),
    ]);

    if (
      educationError ||
      tagsError ||
      tagLinksError
    ) {
      console.error(
        educationError ||
          tagsError ||
          tagLinksError
      );
    }

    const links: EducationTagRow[] =
      tagLinks ?? [];

    setTags(
      tagsData ?? []
    );

    setEducations(
      (educationData ?? []).map(
        (education) => ({
          ...education,

          tagIds: links
            .filter(
              (item) =>
                item.education_id ===
                education.id
            )
            .map(
              (item) =>
                item.tag_id
            ),
        })
      )
    );
  }, [supabase]);

  useEffect(() => {
    const initialize = async () => {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        setIsLoading(false);
        return;
      }

      setUserId(user.id);

      await loadData(user.id);

      setIsLoading(false);
    };

    initialize();
  }, [supabase, loadData]);

  const resetForm = () => {
    setEditingId(null);

    setLevel("");
    setSchoolName("");
    setStudyPlan("");
    setGpa("");

    setStartYear("");
    setEndYear("");

    setCurrentLogoUrl("");
    setSelectedLogo(null);
    setLogoPreview("");
    setRemoveLogo(false);

    setSelectedTagIds([]);

    setNewTagName("");
    setIsAddingTag(false);

    if (fileInputRef.current) {
      fileInputRef.current.value =
        "";
    }

    setShowForm(false);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (
    education: Education
  ) => {
    setEditingId(
      education.id
    );

    setLevel(
      education.level
    );

    setSchoolName(
      education.school_name
    );

    setStudyPlan(
      education.study_plan
    );

    setGpa(
      education.gpa === null
        ? ""
        : String(
            education.gpa
          )
    );

    setStartYear(
      education.start_year ??
        ""
    );

    setEndYear(
      education.end_year ??
        ""
    );

    setCurrentLogoUrl(
      education.logo_url ??
        ""
    );

    setSelectedLogo(null);

    setLogoPreview("");

    setRemoveLogo(false);

    setSelectedTagIds(
      education.tagIds
    );

    setShowForm(true);
  };

  const handleLogo = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) return;

    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
      ].includes(file.type)
    ) {
      alert(
        "รองรับ JPG, PNG หรือ WEBP"
      );
      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      alert(
        "รูปต้องไม่เกิน 5MB"
      );
      return;
    }

    const reader =
      new FileReader();

    reader.onload = () => {
      if (
        typeof reader.result ===
        "string"
      ) {
        setLogoPreview(
          reader.result
        );

        setSelectedLogo(
          file
        );

        setRemoveLogo(
          false
        );
      }
    };

    reader.readAsDataURL(file);
  };

  const toggleTag = (
    id: string
  ) => {
    setSelectedTagIds(
      (current) =>
        current.includes(id)
          ? current.filter(
              (item) =>
                item !== id
            )
          : [
              ...current,
              id,
            ]
    );
  };

  const handleAddTag = async () => {
    const name =
      newTagName.trim();

    if (!name) return;

    const existing =
      tags.find(
        (tag) =>
          tag.name.toLowerCase() ===
          name.toLowerCase()
      );

    if (existing) {
      toggleTag(
        existing.id
      );

      setNewTagName("");
      setIsAddingTag(false);

      return;
    }

    const {
      data,
      error,
    } =
      await supabase
        .from(
          "user_tags"
        )
        .insert({
          user_id:
            userId,

          name,
        })
        .select(
          "id, name"
        )
        .single();

    if (error) {
      alert(
        "เพิ่ม Tag ไม่สำเร็จ"
      );
      return;
    }

    setTags(
      (current) => [
        ...current,
        data,
      ]
    );

    setSelectedTagIds(
      (current) => [
        ...current,
        data.id,
      ]
    );

    setNewTagName("");
    setIsAddingTag(false);
  };

  const pathFromUrl = (
    urlString: string
  ) => {
    try {
      const url =
        new URL(urlString);

      const marker =
        "/storage/v1/object/public/portfolio-images/";

      const index =
        url.pathname.indexOf(
          marker
        );

      if (index < 0) {
        return null;
      }

      return decodeURIComponent(
        url.pathname.slice(
          index +
            marker.length
        )
      );
    } catch {
      return null;
    }
  };

  const uploadLogo = async (
    educationId: string
  ) => {
    if (!selectedLogo) {
      return currentLogoUrl ||
        null;
    }

    const extension =
      selectedLogo.name
        .split(".")
        .pop()
        ?.toLowerCase() ||
      "jpg";

    const path =
      `users/${userId}/education/${educationId}/${crypto.randomUUID()}.${extension}`;

    const { error } =
      await supabase.storage
        .from(
          "portfolio-images"
        )
        .upload(
          path,
          selectedLogo,
          {
            contentType:
              selectedLogo.type,
          }
        );

    if (error) {
      throw error;
    }

    const {
      data: {
        publicUrl,
      },
    } =
      supabase.storage
        .from(
          "portfolio-images"
        )
        .getPublicUrl(path);

    return publicUrl;
  };

  const handleSave = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (
      !level.trim() ||
      !schoolName.trim()
    ) {
      alert(
        "กรุณากรอกข้อมูลที่จำเป็น"
      );
      return;
    }

    setIsSaving(true);

    try {
      let id =
        editingId;

      const payload = {
        level:
          level.trim(),

        school_name:
          schoolName.trim(),

        study_plan:
          studyPlan.trim(),

        gpa:
          gpa === ""
            ? null
            : Number(gpa),

        start_year:
          startYear ||
          null,

        end_year:
          endYear ||
          null,
      };

      if (editingId) {
        const { error } =
          await supabase
            .from(
              "user_library_educations"
            )
            .update(
              payload
            )
            .eq(
              "id",
              editingId
            )
            .eq(
              "user_id",
              userId
            );

        if (error) {
          throw error;
        }
      } else {
        const {
          data,
          error,
        } =
          await supabase
            .from(
              "user_library_educations"
            )
            .insert({
              ...payload,
              user_id:
                userId,

              logo_url:
                null,
            })
            .select(
              "id"
            )
            .single();

        if (error) {
          throw error;
        }

        id = data.id;
      }

      if (!id) {
        throw new Error();
      }

      let logoUrl:
        | string
        | null =
        currentLogoUrl ||
        null;

      if (removeLogo) {
        logoUrl = null;

        if (
          currentLogoUrl
        ) {
          const oldPath =
            pathFromUrl(
              currentLogoUrl
            );

          if (oldPath) {
            await supabase.storage
              .from(
                "portfolio-images"
              )
              .remove([
                oldPath,
              ]);
          }
        }
      }

      if (selectedLogo) {
        logoUrl =
          await uploadLogo(
            id
          );
      }

      const {
        error:
          logoError,
      } =
        await supabase
          .from(
            "user_library_educations"
          )
          .update({
            logo_url:
              logoUrl,
          })
          .eq("id", id)
          .eq(
            "user_id",
            userId
          );

      if (logoError) {
        throw logoError;
      }

      await supabase
        .from(
          "user_library_education_tags"
        )
        .delete()
        .eq(
          "education_id",
          id
        );

      if (
        selectedTagIds.length
      ) {
        const { error } =
          await supabase
            .from(
              "user_library_education_tags"
            )
            .insert(
              selectedTagIds.map(
                (tagId) => ({
                  education_id:
                    id,

                  tag_id:
                    tagId,
                })
              )
            );

        if (error) {
          throw error;
        }
      }

      await loadData(
        userId
      );

      resetForm();
    } catch (error) {
      console.error(error);

      alert(
        "ไม่สามารถบันทึกประวัติการศึกษาได้"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (
    education: Education
  ) => {
    if (
      !window.confirm(
        "ต้องการลบประวัติการศึกษานี้ใช่หรือไม่?"
      )
    ) {
      return;
    }

    const { error } =
      await supabase
        .from(
          "user_library_educations"
        )
        .delete()
        .eq(
          "id",
          education.id
        )
        .eq(
          "user_id",
          userId
        );

    if (error) {
      alert(
        "ไม่สามารถลบข้อมูลได้"
      );
      return;
    }

    if (
      education.logo_url
    ) {
      const path =
        pathFromUrl(
          education.logo_url
        );

      if (path) {
        await supabase.storage
          .from(
            "portfolio-images"
          )
          .remove([
            path,
          ]);
      }
    }

    await loadData(userId);
  };

  if (isLoading) {
    return (
      <Loading text="กำลังโหลดประวัติการศึกษา..." />
    );
  }

  return (
    <>
      <section className="mt-6 min-w-0">
        <SectionHeader
          count={
            educations.length
          }
          onAdd={
            openCreate
          }
        />

        {educations.length ===
        0 ? (
          <EmptyState />
        ) : (
          <div className="mt-5 grid min-w-0 grid-cols-1 gap-4 @min-[48rem]:grid-cols-2">
            {educations.map(
              (education) => {
                const itemTags =
                  tags.filter(
                    (tag) =>
                      education.tagIds.includes(
                        tag.id
                      )
                  );

                return (
                  <article
                    key={
                      education.id
                    }
                    className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm wrap-anywhere"
                  >
                    <div className="flex min-w-0 flex-col gap-4">
                      <div className="flex min-w-0 gap-3">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                          {education.logo_url ? (
                            <img
                              src={
                                education.logo_url
                              }
                              alt=""
                              className="h-full w-full object-contain p-1"
                            />
                          ) : (
                            <FaSchool className="text-xl text-blue-600" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-blue-700">
                            {
                              education.level
                            }
                          </p>

                          <h3 className="mt-1 text-base font-bold leading-7 text-slate-900">
                            {
                              education.school_name
                            }
                          </h3>

                          {education.study_plan && (
                            <p className="mt-1 text-sm leading-6 text-slate-600">
                              {
                                education.study_plan
                              }
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openEdit(
                              education
                            )
                          }
                          aria-label={`แก้ไขประวัติการศึกษา ${education.school_name}`}
                          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                        >
                          <FaEdit />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(
                              education
                            )
                          }
                          aria-label={`ลบประวัติการศึกษา ${education.school_name}`}
                          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 rounded-lg bg-slate-50 p-3 @min-[28rem]:grid-cols-2">
                      <div>
                        <p className="text-xs leading-5 text-slate-500">
                          ช่วงปีการศึกษา
                        </p>

                        <p className="mt-1 text-sm font-bold">
                          {education.start_year ||
                          education.end_year
                            ? `${education.start_year || "?"} - ${education.end_year || "ปัจจุบัน"}`
                            : "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs leading-5 text-slate-500">
                          GPAX
                        </p>

                        <p className="mt-1 text-sm font-bold">
                          {
                            education.gpa ??
                            "-"
                          }
                        </p>
                      </div>
                    </div>

                    {itemTags.length >
                      0 && (
                      <div className="mt-4 flex min-w-0 flex-wrap gap-2">
                        {itemTags.map(
                          (
                            tag
                          ) => (
                            <span
                              key={
                                tag.id
                              }
                              className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold leading-5 text-blue-700"
                            >
                              <FaTag />
                              {
                                tag.name
                              }
                            </span>
                          )
                        )}
                      </div>
                    )}
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>

      {showForm && (
        <div role="dialog" aria-modal="true" aria-labelledby="education-library-title"
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/60 p-2 backdrop-blur-sm sm:p-4">
          <div className="flex h-[calc(100dvh-16px)] min-w-0 w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:h-[min(760px,calc(100dvh-32px))]">
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6">
              <div>
                <h2 id="education-library-title" className="text-base font-bold leading-6 text-slate-900">
                  {editingId
                    ? "แก้ไขประวัติการศึกษา"
                    : "เพิ่มประวัติการศึกษา"}
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  ข้อมูลนี้จะถูกบันทึกไว้ในบัญชีของคุณ
                </p>
              </div>

              <button
                type="button"
                onClick={
                  resetForm
                }
                aria-label="ปิดฟอร์มประวัติการศึกษา"
                className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                <FaTimes />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
              <form
                id="education-form"
                onSubmit={
                  handleSave
                }
                aria-busy={isSaving}
                className="@container min-w-0 space-y-5"
              >
                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700">
                    ตราโรงเรียน / โลโก้สถานศึกษา
                  </p>

                  <div className="flex min-w-0 flex-wrap gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
  <div className="w-24 shrink-0">
    <div className="flex h-24 w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
      {logoPreview || (!removeLogo && currentLogoUrl) ? (
        <img
          src={logoPreview || currentLogoUrl}
          alt="โลโก้สถานศึกษา"
          className="h-full w-full object-contain p-2"
        />
      ) : (
        <FaSchool className="text-2xl text-slate-300" />
      )}
    </div>

    {(logoPreview || (!removeLogo && currentLogoUrl)) && (
      <button
        type="button"
        onClick={() => {
          setSelectedLogo(null);
          setLogoPreview("");
          setRemoveLogo(true);

          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }}
        style={{
          backgroundColor: "#dc2626",
          color: "#ffffff",
        }}
        className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
      >
        <FaTrash />
        ลบรูป
      </button>
    )}
  </div>

  <div className="min-w-0 flex-1 basis-36">
    <CropInput
      ref={fileInputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      onChange={handleLogo}
      className="hidden"
    />

    <button
      type="button"
      onClick={() => fileInputRef.current?.click()}
      className="inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
    >
      <FaImage />
      เลือกโลโก้
    </button>

    <p className="mt-2 text-xs text-slate-400">
      JPG, PNG หรือ WEBP ไม่เกิน 5MB
    </p>
  </div>
</div>
                </div>

                <div className="grid min-w-0 grid-cols-1 gap-5 @min-[24rem]:grid-cols-2">
                  <Field htmlFor="education-library-level" label="ระดับการศึกษา *">
                    <input id="education-library-level" autoFocus
                      value={
                        level
                      }
                      onChange={(e) =>
                        setLevel(
                          e.target.value
                        )
                      }
                      required
                      className={
                        inputClass
                      }
                    />
                  </Field>

                  <Field htmlFor="education-library-gpa" label="GPAX">
                    <input id="education-library-gpa"
                      type="number"
                      min="0"
                      max="4"
                      step="0.01"
                      value={
                        gpa
                      }
                      onChange={(e) =>
                        setGpa(
                          e.target.value
                        )
                      }
                      className={
                        inputClass
                      }
                    />
                  </Field>
                </div>

                <Field htmlFor="education-library-schoolName" label="ชื่อสถานศึกษา *">
                  <input id="education-library-schoolName"
                    value={
                      schoolName
                    }
                    onChange={(e) =>
                      setSchoolName(
                        e.target.value
                      )
                    }
                    required
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field htmlFor="education-library-studyPlan" label="แผนการเรียน / สาขาวิชา">
                  <input id="education-library-studyPlan"
                    value={
                      studyPlan
                    }
                    onChange={(e) =>
                      setStudyPlan(
                        e.target.value
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>

                <div className="grid min-w-0 grid-cols-1 gap-5 @min-[24rem]:grid-cols-2">
                  <Field htmlFor="education-library-startYear" label="ปีที่เริ่มศึกษา">
                    <input id="education-library-startYear"
                      value={
                        startYear
                      }
                      onChange={(e) =>
                        setStartYear(
                          e.target.value
                        )
                      }
                      className={
                        inputClass
                      }
                    />
                  </Field>

                  <Field htmlFor="education-library-endYear" label="ปีที่จบ">
                    <input id="education-library-endYear"
                      value={
                        endYear
                      }
                      onChange={(e) =>
                        setEndYear(
                          e.target.value
                        )
                      }
                      className={
                        inputClass
                      }
                    />
                  </Field>
                </div>

                <TagEditor
                  tags={tags}
                  selectedTagIds={
                    selectedTagIds
                  }
                  toggleTag={
                    toggleTag
                  }
                  newTagName={
                    newTagName
                  }
                  setNewTagName={
                    setNewTagName
                  }
                  isAddingTag={
                    isAddingTag
                  }
                  setIsAddingTag={
                    setIsAddingTag
                  }
                  handleAddTag={
                    handleAddTag
                  }
                />
              </form>
            </div>

            <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
              <button
                type="button"
                onClick={
                  resetForm
                }
                className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                ยกเลิก
              </button>

              <button
                form="education-form"
                type="submit"
                disabled={
                  isSaving
                }
                aria-busy={isSaving}
                className="min-h-11 rounded-lg bg-blue-600 px-3 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving
                  ? "กำลังบันทึก..."
                  : editingId
                  ? "บันทึกการแก้ไข"
                  : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  htmlFor,
  label,
  children,
}: {
  htmlFor: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={htmlFor} className="mb-2 block text-sm font-semibold leading-5 text-slate-700">
        {label}
      </label>

      {children}
    </div>
  );
}

function TagEditor({
  tags,
  selectedTagIds,
  toggleTag,
  newTagName,
  setNewTagName,
  isAddingTag,
  setIsAddingTag,
  handleAddTag,
}: {
  tags: UserTag[];
  selectedTagIds: string[];
  toggleTag: (
    id: string
  ) => void;
  newTagName: string;
  setNewTagName: (
    value: string
  ) => void;
  isAddingTag: boolean;
  setIsAddingTag: (
    value: boolean
  ) => void;
  handleAddTag: () => void;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-700">Tags</p>

        <button
          type="button"
          onClick={() =>
            setIsAddingTag(true)
          }
          className="min-h-11 rounded-lg px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          + สร้าง Tag ใหม่
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {tags.map(
          (tag) => (
            <button
              type="button"
              key={
                tag.id
              }
              onClick={() =>
                toggleTag(
                  tag.id
                )
              }
              aria-pressed={selectedTagIds.includes(tag.id)}
              className={`min-h-11 min-w-0 max-w-full rounded-full border px-3 py-2 text-left text-sm font-semibold wrap-anywhere focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                selectedTagIds.includes(
                  tag.id
                )
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-200 text-slate-600"
              }`}
            >
              {tag.name}
            </button>
          )
        )}
      </div>

      {isAddingTag && (
        <div className="mt-3 flex min-w-0 flex-wrap gap-2 rounded-lg bg-slate-50 p-3">
          <input
            value={
              newTagName
            }
            onChange={(e) =>
              setNewTagName(
                e.target.value
              )
            }
            aria-label="ชื่อ Tag ใหม่"
            className={`${inputClass} flex-1 basis-36`}
          />

          <button
            type="button"
            onClick={
              handleAddTag
            }
            className="min-h-11 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            เพิ่ม
          </button>

          <button
            type="button"
            onClick={() =>
              setIsAddingTag(
                false
              )
            }
            className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            ยกเลิก
          </button>
        </div>
      )}
    </div>
  );
}

function SectionHeader({
  count,
  onAdd,
}: {
  count: number;
  onAdd: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-4 @min-[40rem]:flex-row @min-[40rem]:items-center @min-[40rem]:justify-between">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          ประวัติการศึกษา
        </h2>

        <p className="mt-1 text-sm leading-6 text-slate-600">
          มีทั้งหมด {count} รายการ
        </p>
      </div>

      <button
        type="button"
        onClick={onAdd}
        className="inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
      >
        <FaPlus />
        เพิ่มประวัติการศึกษา
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-5 flex min-h-52 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white p-5 text-center">
      <FaBook className="text-3xl text-blue-600" />

      <h3 className="mt-4 text-lg font-black">
        ยังไม่มีประวัติการศึกษา
      </h3>
    </div>
  );
}

function Loading({
  text,
}: {
  text: string;
}) {
  return (
    <div role="status" className="mt-6 flex min-h-52 items-center justify-center rounded-xl bg-white p-4">
      <p className="text-sm text-slate-500">
        {text}
      </p>
    </div>
  );
}
