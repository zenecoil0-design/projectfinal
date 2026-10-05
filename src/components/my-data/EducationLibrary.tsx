"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  created_at: string;
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
  created_at: string;
};

type EducationTagRow = {
  education_id: string;
  tag_id: string;
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export default function EducationLibrary() {
  const supabase = useMemo(() => createClient(), []);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [userId, setUserId] = useState("");

  const [educations, setEducations] = useState<Education[]>([]);
  const [tags, setTags] = useState<UserTag[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [level, setLevel] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [studyPlan, setStudyPlan] = useState("");
  const [gpa, setGpa] = useState("");

  const [startYear, setStartYear] = useState("");
  const [endYear, setEndYear] = useState("");

  const [currentLogoUrl, setCurrentLogoUrl] = useState("");
  const [selectedLogoFile, setSelectedLogoFile] =
    useState<File | null>(null);

  const [logoPreviewUrl, setLogoPreviewUrl] = useState("");

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const [newTagName, setNewTagName] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        setIsLoading(false);
        return;
      }

      setUserId(user.id);

      await loadData(user.id);

      setIsLoading(false);
    };

    initialize();
  }, [supabase]);

  useEffect(() => {
    return () => {
      if (logoPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreviewUrl);
      }
    };
  }, [logoPreviewUrl]);

  const loadData = async (currentUserId: string) => {
    const [
      { data: educationData, error: educationError },
      { data: tagData, error: tagError },
      { data: educationTagData, error: educationTagError },
    ] = await Promise.all([
      supabase
        .from("user_library_educations")
        .select(
          `
          id,
          level,
          school_name,
          study_plan,
          gpa,
          logo_url,
          start_year,
          end_year,
          created_at
        `
        )
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false }),

      supabase
        .from("user_tags")
        .select("id, name")
        .eq("user_id", currentUserId)
        .order("name", { ascending: true }),

      supabase
        .from("user_library_education_tags")
        .select("education_id, tag_id"),
    ]);

    if (educationError) {
      console.error("Load education error:", educationError);
    }

    if (tagError) {
      console.error("Load tags error:", tagError);
    }

    if (educationTagError) {
      console.error("Load education tags error:", educationTagError);
    }

    const cleanEducations: EducationRow[] = educationData ?? [];
    const cleanTags: UserTag[] = tagData ?? [];
    const cleanEducationTags: EducationTagRow[] =
      educationTagData ?? [];

    setTags(cleanTags);

    setEducations(
      cleanEducations.map((education) => ({
        ...education,

        tagIds: cleanEducationTags
          .filter(
            (item) =>
              item.education_id === education.id
          )
          .map((item) => item.tag_id),
      }))
    );
  };

  const clearLogoPreview = () => {
    if (logoPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(logoPreviewUrl);
    }

    setLogoPreviewUrl("");
    setSelectedLogoFile(null);
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
    clearLogoPreview();

    setSelectedTagIds([]);

    setNewTagName("");
    setIsAddingTag(false);

    setShowForm(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (education: Education) => {
    clearLogoPreview();

    setEditingId(education.id);

    setLevel(education.level);
    setSchoolName(education.school_name);
    setStudyPlan(education.study_plan);

    setGpa(
      education.gpa === null
        ? ""
        : education.gpa.toString()
    );

    setStartYear(education.start_year ?? "");
    setEndYear(education.end_year ?? "");

    setCurrentLogoUrl(education.logo_url ?? "");

    setSelectedTagIds(education.tagIds);

    setShowForm(true);
  };

  const handleLogoChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      alert("รองรับเฉพาะไฟล์ JPG, PNG และ WEBP");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      alert("รูปต้องมีขนาดไม่เกิน 5MB");
      event.target.value = "";
      return;
    }

    if (logoPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(logoPreviewUrl);
    }

    setSelectedLogoFile(file);
    setLogoPreviewUrl(URL.createObjectURL(file));
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((current) => {
      if (current.includes(tagId)) {
        return current.filter((id) => id !== tagId);
      }

      return [...current, tagId];
    });
  };

  const handleAddTag = async () => {
    const cleanName = newTagName.trim();

    if (!cleanName || !userId) {
      return;
    }

    const existingTag = tags.find(
      (tag) =>
        tag.name.toLowerCase() ===
        cleanName.toLowerCase()
    );

    if (existingTag) {
      if (!selectedTagIds.includes(existingTag.id)) {
        setSelectedTagIds((current) => [
          ...current,
          existingTag.id,
        ]);
      }

      setNewTagName("");
      setIsAddingTag(false);

      return;
    }

    const { data, error } = await supabase
      .from("user_tags")
      .insert({
        user_id: userId,
        name: cleanName,
      })
      .select("id, name")
      .single();

    if (error) {
      console.error("Create tag error:", error);

      alert("ไม่สามารถเพิ่ม Tag ได้");
      return;
    }

    setTags((current) =>
      [...current, data].sort((a, b) =>
        a.name.localeCompare(b.name, "th")
      )
    );

    setSelectedTagIds((current) => [
      ...current,
      data.id,
    ]);

    setNewTagName("");
    setIsAddingTag(false);
  };

  const uploadSchoolLogo = async (
    educationId: string,
    file: File
  ) => {
    const extension =
      file.name.split(".").pop()?.toLowerCase() || "jpg";

    const fileName =
      `logo-${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const filePath =
      `users/${userId}/education/${educationId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("portfolio-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = supabase.storage
      .from("portfolio-images")
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSave = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!userId) {
      return;
    }

    if (!level.trim()) {
      alert("กรุณากรอกระดับการศึกษา");
      return;
    }

    if (!schoolName.trim()) {
      alert("กรุณากรอกชื่อสถานศึกษา");
      return;
    }

    if (gpa) {
      const numericGpa = Number(gpa);

      if (
        Number.isNaN(numericGpa) ||
        numericGpa < 0 ||
        numericGpa > 4
      ) {
        alert("GPAX ต้องอยู่ระหว่าง 0.00 - 4.00");
        return;
      }
    }

    if (
      startYear &&
      endYear &&
      Number(startYear) > Number(endYear)
    ) {
      alert("ปีที่เริ่มศึกษาไม่ควรมากกว่าปีที่จบ");
      return;
    }

    setIsSaving(true);

    try {
      let educationId = editingId;

      const basePayload = {
        level: level.trim(),
        school_name: schoolName.trim(),
        study_plan: studyPlan.trim(),
        gpa: gpa ? Number(gpa) : null,
        start_year: startYear.trim() || null,
        end_year: endYear.trim() || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("user_library_educations")
          .update(basePayload)
          .eq("id", editingId)
          .eq("user_id", userId);

        if (error) {
          throw error;
        }
      } else {
        const { data, error } = await supabase
          .from("user_library_educations")
          .insert({
            ...basePayload,
            user_id: userId,
            logo_url: null,
          })
          .select("id")
          .single();

        if (error) {
          throw error;
        }

        educationId = data.id;
      }

      if (!educationId) {
        throw new Error("ไม่พบ Education ID");
      }

      let finalLogoUrl = currentLogoUrl || null;

      if (selectedLogoFile) {
        finalLogoUrl = await uploadSchoolLogo(
          educationId,
          selectedLogoFile
        );

        const { error: logoUpdateError } = await supabase
          .from("user_library_educations")
          .update({
            logo_url: finalLogoUrl,
          })
          .eq("id", educationId)
          .eq("user_id", userId);

        if (logoUpdateError) {
          throw logoUpdateError;
        }
      }

      const { error: deleteTagError } = await supabase
        .from("user_library_education_tags")
        .delete()
        .eq("education_id", educationId);

      if (deleteTagError) {
        throw deleteTagError;
      }

      if (selectedTagIds.length > 0) {
        const { error: insertTagError } = await supabase
          .from("user_library_education_tags")
          .insert(
            selectedTagIds.map((tagId) => ({
              education_id: educationId,
              tag_id: tagId,
            }))
          );

        if (insertTagError) {
          throw insertTagError;
        }
      }

      await loadData(userId);

      resetForm();
    } catch (error) {
      console.error("Save education error:", error);

      alert("ไม่สามารถบันทึกประวัติการศึกษาได้");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (
    educationId: string
  ) => {
    const confirmed = window.confirm(
      "ต้องการลบประวัติการศึกษานี้ออกจากคลังใช่หรือไม่?"
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("user_library_educations")
      .delete()
      .eq("id", educationId)
      .eq("user_id", userId);

    if (error) {
      console.error("Delete education error:", error);

      alert("ไม่สามารถลบข้อมูลได้");
      return;
    }

    setEducations((current) =>
      current.filter(
        (education) =>
          education.id !== educationId
      )
    );
  };

  const getTags = (education: Education) => {
    return tags.filter((tag) =>
      education.tagIds.includes(tag.id)
    );
  };

  if (isLoading) {
    return (
      <div className="mt-8 flex min-h-[300px] items-center justify-center rounded-[24px] border border-slate-200 bg-white">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-3 text-sm text-slate-500">
            กำลังโหลดประวัติการศึกษา...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <section className="mt-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900">
              ประวัติการศึกษา
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              มีทั้งหมด {educations.length} รายการ
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
          >
            <FaPlus />
            เพิ่มประวัติการศึกษา
          </button>
        </div>

        {educations.length === 0 ? (
          <div className="mt-6 flex min-h-[320px] flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-slate-300 bg-white px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-xl text-blue-600">
              <FaBook />
            </div>

            <h3 className="mt-5 text-lg font-black text-slate-900">
              ยังไม่มีประวัติการศึกษา
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              เพิ่มสถานศึกษาของคุณไว้ในคลัง
              แล้วเลือกใช้ภายหลังเมื่อสร้าง Portfolio
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {educations.map((education) => {
              const educationTags =
                getTags(education);

              return (
                <article
                  key={education.id}
                  className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                        {education.logo_url ? (
                          <img
                            src={education.logo_url}
                            alt={`ตรา ${education.school_name}`}
                            className="h-full w-full object-contain p-1"
                          />
                        ) : (
                          <FaSchool className="text-xl text-blue-600" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-blue-600">
                          {education.level}
                        </p>

                        <h3 className="mt-1 break-words text-lg font-black text-slate-900">
                          {education.school_name}
                        </h3>

                        {education.study_plan && (
                          <p className="mt-1 text-sm text-slate-500">
                            {education.study_plan}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          openEditForm(education)
                        }
                        aria-label="แก้ไขประวัติการศึกษา"
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                      >
                        <FaEdit />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(education.id)
                        }
                        aria-label="ลบประวัติการศึกษา"
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm">
                    <div>
                      <p className="text-xs font-semibold text-slate-400">
                        ช่วงปีการศึกษา
                      </p>

                      <p className="mt-1 font-bold text-slate-700">
                        {education.start_year ||
                        education.end_year
                          ? `${
                              education.start_year ||
                              "?"
                            } - ${
                              education.end_year ||
                              "ปัจจุบัน"
                            }`
                          : "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-400">
                        GPAX
                      </p>

                      <p className="mt-1 font-bold text-slate-700">
                        {education.gpa ?? "-"}
                      </p>
                    </div>
                  </div>

                  {educationTags.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {educationTags.map((tag) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700"
                        >
                          <FaTag className="text-[10px]" />
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-xl font-black text-slate-900">
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
                onClick={resetForm}
                aria-label="ปิด"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <FaTimes />
              </button>
            </div>

            <form
              onSubmit={handleSave}
              className="space-y-5 p-6"
            >
              {/* SCHOOL LOGO */}
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  ตราโรงเรียน / โลโก้สถานศึกษา
                </label>

                <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    {logoPreviewUrl || currentLogoUrl ? (
                      <img
                        src={
                          logoPreviewUrl ||
                          currentLogoUrl
                        }
                        alt="ตัวอย่างตราโรงเรียน"
                        className="h-full w-full object-contain p-2"
                      />
                    ) : (
                      <FaSchool className="text-2xl text-slate-300" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleLogoChange}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        fileInputRef.current?.click()
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                    >
                      <FaImage />
                      เลือกรูปตราโรงเรียน
                    </button>

                    <p className="mt-2 text-xs leading-5 text-slate-400">
                      รองรับ JPG, PNG และ WEBP
                      ขนาดไม่เกิน 5MB
                    </p>

                    {selectedLogoFile && (
                      <p className="mt-1 truncate text-xs font-semibold text-blue-600">
                        {selectedLogoFile.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    ระดับการศึกษา *
                  </label>

                  <input
                    type="text"
                    value={level}
                    onChange={(event) =>
                      setLevel(event.target.value)
                    }
                    placeholder="เช่น มัธยมศึกษาตอนปลาย"
                    required
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    GPAX
                  </label>

                  <input
                    type="number"
                    min="0"
                    max="4"
                    step="0.01"
                    value={gpa}
                    onChange={(event) =>
                      setGpa(event.target.value)
                    }
                    placeholder="เช่น 3.75"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  ชื่อสถานศึกษา / โรงเรียน *
                </label>

                <input
                  type="text"
                  value={schoolName}
                  onChange={(event) =>
                    setSchoolName(event.target.value)
                  }
                  placeholder="ชื่อสถานศึกษา"
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  แผนการเรียน / สาขาวิชา
                </label>

                <input
                  type="text"
                  value={studyPlan}
                  onChange={(event) =>
                    setStudyPlan(event.target.value)
                  }
                  placeholder="เช่น วิทยาศาสตร์ - คณิตศาสตร์"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    ปีที่เริ่มศึกษา
                  </label>

                  <input
                    type="number"
                    min="1900"
                    max="2700"
                    value={startYear}
                    onChange={(event) =>
                      setStartYear(event.target.value)
                    }
                    placeholder="เช่น 2565"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    ปีที่จบ
                  </label>

                  <input
                    type="number"
                    min="1900"
                    max="2700"
                    value={endYear}
                    onChange={(event) =>
                      setEndYear(event.target.value)
                    }
                    placeholder="เช่น 2568"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* TAGS */}
              <div>
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-bold text-slate-700">
                    Tags
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      setIsAddingTag(true)
                    }
                    className="text-xs font-bold text-blue-600 hover:text-blue-700"
                  >
                    + สร้าง Tag ใหม่
                  </button>
                </div>

                {tags.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tags.map((tag) => {
                      const selected =
                        selectedTagIds.includes(tag.id);

                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() =>
                            toggleTag(tag.id)
                          }
                          className={`rounded-full border px-3 py-2 text-xs font-bold transition ${
                            selected
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50"
                          }`}
                        >
                          {selected ? "✓ " : ""}
                          {tag.name}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-slate-400">
                    ยังไม่มี Tag
                  </p>
                )}

                {isAddingTag && (
                  <div className="mt-4 flex gap-2 rounded-xl bg-slate-50 p-3">
                    <input
                      type="text"
                      value={newTagName}
                      onChange={(event) =>
                        setNewTagName(
                          event.target.value
                        )
                      }
                      placeholder="ชื่อ Tag"
                      className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />

                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white"
                    >
                      เพิ่ม
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setNewTagName("");
                        setIsAddingTag(false);
                      }}
                      className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200"
                    >
                      ยกเลิก
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving
                    ? "กำลังบันทึก..."
                    : editingId
                    ? "บันทึกการแก้ไข"
                    : "เพิ่มลงคลัง"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}