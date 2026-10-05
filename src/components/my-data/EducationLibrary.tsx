"use client";

import {
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
  "w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

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
  }, [supabase]);

  const loadData = async (
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
  };

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
      <section className="mt-8">
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
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
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
                    className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 gap-4">
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

                        <div>
                          <p className="text-xs font-bold text-blue-600">
                            {
                              education.level
                            }
                          </p>

                          <h3 className="mt-1 text-lg font-black text-slate-900">
                            {
                              education.school_name
                            }
                          </h3>

                          {education.study_plan && (
                            <p className="mt-1 text-sm text-slate-500">
                              {
                                education.study_plan
                              }
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openEdit(
                              education
                            )
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500"
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
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-500"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4">
                      <div>
                        <p className="text-xs text-slate-400">
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
                        <p className="text-xs text-slate-400">
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
                      <div className="mt-4 flex flex-wrap gap-2">
                        {itemTags.map(
                          (
                            tag
                          ) => (
                            <span
                              key={
                                tag.id
                              }
                              className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="flex h-[calc(100dvh-32px)] w-full max-w-2xl flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl sm:h-[min(760px,calc(100dvh-40px))]">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-black">
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
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500"
              >
                <FaTimes />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <form
                id="education-form"
                onSubmit={
                  handleSave
                }
                className="space-y-4"
              >
                <div>
                  <label className="mb-2 block text-sm font-bold">
                    ตราโรงเรียน / โลโก้สถานศึกษา
                  </label>

                  <div className="flex gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
  <div className="w-28 shrink-0">
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
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold shadow-sm"
      >
        <FaTrash />
        ลบรูป
      </button>
    )}
  </div>

  <div className="flex-1">
    <input
      ref={fileInputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      onChange={handleLogo}
      className="hidden"
    />

    <button
      type="button"
      onClick={() => fileInputRef.current?.click()}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700"
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

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="ระดับการศึกษา *">
                    <input
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

                  <Field label="GPAX">
                    <input
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

                <Field label="ชื่อสถานศึกษา *">
                  <input
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

                <Field label="แผนการเรียน / สาขาวิชา">
                  <input
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

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="ปีที่เริ่มศึกษา">
                    <input
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

                  <Field label="ปีที่จบ">
                    <input
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

            <div className="flex shrink-0 justify-end gap-3 border-t px-6 py-3">
              <button
                type="button"
                onClick={
                  resetForm
                }
                className="rounded-xl border px-5 py-2.5 text-sm font-bold"
              >
                ยกเลิก
              </button>

              <button
                form="education-form"
                type="submit"
                disabled={
                  isSaving
                }
                className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {isSaving
                  ? "กำลังบันทึก..."
                  : editingId
                  ? "บันทึกการแก้ไข"
                  : "เพิ่มลงคลัง"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-bold text-slate-700">
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
      <div className="flex justify-between">
        <label className="text-sm font-bold">
          Tags
        </label>

        <button
          type="button"
          onClick={() =>
            setIsAddingTag(true)
          }
          className="text-xs font-bold text-blue-600"
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
              className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
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
        <div className="mt-3 flex gap-2 rounded-xl bg-slate-50 p-3">
          <input
            value={
              newTagName
            }
            onChange={(e) =>
              setNewTagName(
                e.target.value
              )
            }
            className={`${inputClass} flex-1`}
          />

          <button
            type="button"
            onClick={
              handleAddTag
            }
            className="rounded-lg bg-blue-600 px-4 text-xs font-bold text-white"
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
            className="px-2 text-xs font-bold"
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
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-black">
          ประวัติการศึกษา
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          มีทั้งหมด {count} รายการ
        </p>
      </div>

      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white"
      >
        <FaPlus />
        เพิ่มประวัติการศึกษา
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-6 flex min-h-[300px] flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-slate-300 bg-white">
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
    <div className="mt-8 flex min-h-[300px] items-center justify-center rounded-[24px] bg-white">
      <p className="text-sm text-slate-500">
        {text}
      </p>
    </div>
  );
}