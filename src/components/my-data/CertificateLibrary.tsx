"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FaCertificate,
  FaEdit,
  FaImage,
  FaPlus,
  FaTag,
  FaTrash,
  FaTimes,
} from "react-icons/fa";

import { createClient } from "@/lib/supabase/client";

type UserTag = {
  id: string;
  name: string;
};

type CertificateItem = {
  id: string;
  title: string;
  description: string;
  issued_by: string | null;
  issued_date: string | null;
  image_url: string | null;
  created_at: string;
  tagIds: string[];
};

type CertificateRow = {
  id: string;
  title: string;
  description: string;
  issued_by: string | null;
  issued_date: string | null;
  image_url: string | null;
  created_at: string;
};

type CertificateTagRow = {
  certificate_id: string;
  tag_id: string;
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export default function CertificateLibrary() {
  const supabase = useMemo(() => createClient(), []);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [userId, setUserId] = useState("");

  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [tags, setTags] = useState<UserTag[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [issuedBy, setIssuedBy] = useState("");
  const [issuedDate, setIssuedDate] = useState("");

  const [currentImageUrl, setCurrentImageUrl] = useState("");
  const [selectedImageFile, setSelectedImageFile] =
    useState<File | null>(null);

  const [imagePreviewUrl, setImagePreviewUrl] = useState("");

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
      if (imagePreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const loadData = async (currentUserId: string) => {
    const [
      { data: certificateData, error: certificateError },
      { data: tagData, error: tagError },
      { data: certificateTagData, error: certificateTagError },
    ] = await Promise.all([
      supabase
        .from("user_library_certificates")
        .select(
          `
          id,
          title,
          description,
          issued_by,
          issued_date,
          image_url,
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
        .from("user_library_certificate_tags")
        .select("certificate_id, tag_id"),
    ]);

    if (certificateError) {
      console.error("Load certificates error:", certificateError);
    }

    if (tagError) {
      console.error("Load tags error:", tagError);
    }

    if (certificateTagError) {
      console.error(
        "Load certificate tags error:",
        certificateTagError
      );
    }

    const cleanCertificates: CertificateRow[] =
      certificateData ?? [];

    const cleanTags: UserTag[] = tagData ?? [];

    const cleanCertificateTags: CertificateTagRow[] =
      certificateTagData ?? [];

    setTags(cleanTags);

    setCertificates(
      cleanCertificates.map((certificate) => ({
        ...certificate,

        tagIds: cleanCertificateTags
          .filter(
            (item) =>
              item.certificate_id === certificate.id
          )
          .map((item) => item.tag_id),
      }))
    );
  };

  const clearImagePreview = () => {
    if (imagePreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setImagePreviewUrl("");
    setSelectedImageFile(null);
  };

  const resetForm = () => {
    setEditingId(null);

    setTitle("");
    setDescription("");
    setIssuedBy("");
    setIssuedDate("");

    setCurrentImageUrl("");
    clearImagePreview();

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

  const openEditForm = (certificate: CertificateItem) => {
    clearImagePreview();

    setEditingId(certificate.id);

    setTitle(certificate.title);
    setDescription(certificate.description);
    setIssuedBy(certificate.issued_by ?? "");
    setIssuedDate(certificate.issued_date ?? "");

    setCurrentImageUrl(certificate.image_url ?? "");

    setSelectedTagIds(certificate.tagIds);

    setShowForm(true);
  };

  const handleImageChange = (
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

    if (imagePreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setSelectedImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
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

  const uploadCertificateImage = async (
    certificateId: string,
    file: File
  ) => {
    const extension =
      file.name.split(".").pop()?.toLowerCase() || "jpg";

    const fileName =
      `certificate-${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const filePath =
      `users/${userId}/certificates/${certificateId}/${fileName}`;

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

    if (!title.trim()) {
      alert("กรุณากรอกชื่อเกียรติบัตรหรือรางวัล");
      return;
    }

    setIsSaving(true);

    try {
      let certificateId = editingId;

      const basePayload = {
        title: title.trim(),
        description: description.trim(),
        issued_by: issuedBy.trim() || null,
        issued_date: issuedDate || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("user_library_certificates")
          .update(basePayload)
          .eq("id", editingId)
          .eq("user_id", userId);

        if (error) {
          throw error;
        }
      } else {
        const { data, error } = await supabase
          .from("user_library_certificates")
          .insert({
            ...basePayload,
            user_id: userId,
            image_url: null,
          })
          .select("id")
          .single();

        if (error) {
          throw error;
        }

        certificateId = data.id;
      }

      if (!certificateId) {
        throw new Error("ไม่พบ Certificate ID");
      }

      if (selectedImageFile) {
        const uploadedUrl = await uploadCertificateImage(
          certificateId,
          selectedImageFile
        );

        const { error: imageUpdateError } = await supabase
          .from("user_library_certificates")
          .update({
            image_url: uploadedUrl,
          })
          .eq("id", certificateId)
          .eq("user_id", userId);

        if (imageUpdateError) {
          throw imageUpdateError;
        }
      }

      const { error: deleteTagError } = await supabase
        .from("user_library_certificate_tags")
        .delete()
        .eq("certificate_id", certificateId);

      if (deleteTagError) {
        throw deleteTagError;
      }

      if (selectedTagIds.length > 0) {
        const { error: insertTagError } = await supabase
          .from("user_library_certificate_tags")
          .insert(
            selectedTagIds.map((tagId) => ({
              certificate_id: certificateId,
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
      console.error("Save certificate error:", error);

      alert("ไม่สามารถบันทึกเกียรติบัตรได้");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (
    certificateId: string
  ) => {
    const confirmed = window.confirm(
      "ต้องการลบเกียรติบัตรนี้ออกจากคลังใช่หรือไม่?"
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("user_library_certificates")
      .delete()
      .eq("id", certificateId)
      .eq("user_id", userId);

    if (error) {
      console.error("Delete certificate error:", error);
      alert("ไม่สามารถลบข้อมูลได้");
      return;
    }

    setCertificates((current) =>
      current.filter(
        (certificate) =>
          certificate.id !== certificateId
      )
    );
  };

  const getTags = (certificate: CertificateItem) => {
    return tags.filter((tag) =>
      certificate.tagIds.includes(tag.id)
    );
  };

  if (isLoading) {
    return (
      <div className="mt-8 flex min-h-[300px] items-center justify-center rounded-[24px] border border-slate-200 bg-white">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-3 text-sm text-slate-500">
            กำลังโหลดเกียรติบัตร...
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
              เกียรติบัตร
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              มีทั้งหมด {certificates.length} รายการ
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
          >
            <FaPlus />
            เพิ่มเกียรติบัตร
          </button>
        </div>

        {certificates.length === 0 ? (
          <div className="mt-6 flex min-h-[320px] flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-slate-300 bg-white px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-xl text-blue-600">
              <FaCertificate />
            </div>

            <h3 className="mt-5 text-lg font-black text-slate-900">
              ยังไม่มีเกียรติบัตร
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              เพิ่มเกียรติบัตรหรือรางวัลไว้ในคลัง
              แล้วนำไปเลือกใช้ใน Portfolio ได้ภายหลัง
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {certificates.map((certificate) => {
              const certificateTags =
                getTags(certificate);

              return (
                <article
                  key={certificate.id}
                  className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm"
                >
                  {certificate.image_url && (
                    <div className="aspect-[16/9] w-full overflow-hidden bg-slate-100">
                      <img
                        src={certificate.image_url}
                        alt={certificate.title}
                        className="h-full w-full object-contain"
                      />
                    </div>
                  )}

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="break-words text-lg font-black text-slate-900">
                          {certificate.title}
                        </h3>

                        {certificate.issued_by && (
                          <p className="mt-1 text-sm font-semibold text-slate-500">
                            {certificate.issued_by}
                          </p>
                        )}

                        {certificate.issued_date && (
                          <p className="mt-2 text-xs font-semibold text-slate-400">
                            วันที่ {certificate.issued_date}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openEditForm(certificate)
                          }
                          aria-label="แก้ไขเกียรติบัตร"
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <FaEdit />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(certificate.id)
                          }
                          aria-label="ลบเกียรติบัตร"
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>

                    {certificate.description && (
                      <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-600">
                        {certificate.description}
                      </p>
                    )}

                    {certificateTags.length > 0 && (
                      <div className="mt-5 flex flex-wrap gap-2">
                        {certificateTags.map((tag) => (
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
                  </div>
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
                    ? "แก้ไขเกียรติบัตร"
                    : "เพิ่มเกียรติบัตร"}
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
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  รูปเกียรติบัตร
                </label>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex min-h-[220px] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                    {imagePreviewUrl || currentImageUrl ? (
                      <img
                        src={
                          imagePreviewUrl ||
                          currentImageUrl
                        }
                        alt="ตัวอย่างเกียรติบัตร"
                        className="max-h-[320px] w-full object-contain"
                      />
                    ) : (
                      <div className="text-center text-slate-300">
                        <FaImage className="mx-auto text-3xl" />

                        <p className="mt-2 text-xs">
                          ยังไม่ได้เลือกรูป
                        </p>
                      </div>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                  >
                    <FaImage />
                    เลือกรูปเกียรติบัตร
                  </button>

                  <p className="mt-2 text-xs text-slate-400">
                    รองรับ JPG, PNG และ WEBP
                    ขนาดไม่เกิน 5MB
                  </p>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  ชื่อเกียรติบัตร / รางวัล *
                </label>

                <input
                  type="text"
                  value={title}
                  onChange={(event) =>
                    setTitle(event.target.value)
                  }
                  placeholder="เช่น รางวัลการแข่งขันเขียนโปรแกรม"
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  รายละเอียด
                </label>

                <textarea
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  rows={4}
                  placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับเกียรติบัตรหรือรางวัล"
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    หน่วยงานที่ออกให้
                  </label>

                  <input
                    type="text"
                    value={issuedBy}
                    onChange={(event) =>
                      setIssuedBy(event.target.value)
                    }
                    placeholder="เช่น มหาวิทยาลัย..."
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    วันที่ได้รับ
                  </label>

                  <input
                    type="date"
                    value={issuedDate}
                    onChange={(event) =>
                      setIssuedDate(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

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
                        setNewTagName(event.target.value)
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