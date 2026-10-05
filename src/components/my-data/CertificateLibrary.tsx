"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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

type CertificateImage = {
  id: string;
  image_url: string;
  sort_order: number;
};

type CertificateItem = {
  id: string;
  title: string;
  description: string;
  issued_by: string | null;
  issued_date: string | null;
  tagIds: string[];
  images: CertificateImage[];
};

type CertificateTagRow = {
  certificate_id: string;
  tag_id: string;
};

type CertificateImageRow = {
  id: string;
  certificate_id: string;
  image_url: string;
  sort_order: number;
};

const MAX_IMAGES = 4;
const MAX_SIZE =
  5 * 1024 * 1024;

const inputClass =
  "w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export default function CertificateLibrary() {
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

  const [
    certificates,
    setCertificates,
  ] =
    useState<CertificateItem[]>([]);

  const [tags, setTags] =
    useState<UserTag[]>([]);

  const [showForm, setShowForm] =
    useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [issuedBy, setIssuedBy] =
    useState("");

  const [issuedDate, setIssuedDate] =
    useState("");

  const [
    existingImages,
    setExistingImages,
  ] = useState<CertificateImage[]>([]);

  const [
    removedImageIds,
    setRemovedImageIds,
  ] = useState<string[]>([]);

  const [newFiles, setNewFiles] =
    useState<File[]>([]);

  const [newPreviews, setNewPreviews] =
    useState<string[]>([]);

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
        data: certificateData,
        error: certificateError,
      },
      {
        data: tagsData,
        error: tagsError,
      },
      {
        data: tagLinks,
        error: tagLinksError,
      },
      {
        data: imageData,
        error: imageError,
      },
    ] = await Promise.all([
      supabase
        .from(
          "user_library_certificates"
        )
        .select(
          `
          id,
          title,
          description,
          issued_by,
          issued_date
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
          "user_library_certificate_tags"
        )
        .select(
          "certificate_id, tag_id"
        ),

      supabase
        .from(
          "user_library_certificate_images"
        )
        .select(
          "id, certificate_id, image_url, sort_order"
        )
        .order("sort_order"),
    ]);

    if (
      certificateError ||
      tagsError ||
      tagLinksError ||
      imageError
    ) {
      console.error(
        certificateError ||
          tagsError ||
          tagLinksError ||
          imageError
      );
    }

    const tagsLinks: CertificateTagRow[] =
      tagLinks ?? [];

    const images: CertificateImageRow[] =
      imageData ?? [];

    setTags(
      tagsData ?? []
    );

    setCertificates(
      (certificateData ?? []).map(
        (certificate) => ({
          ...certificate,

          tagIds:
            tagsLinks
              .filter(
                (item) =>
                  item.certificate_id ===
                  certificate.id
              )
              .map(
                (item) =>
                  item.tag_id
              ),

          images:
            images
              .filter(
                (image) =>
                  image.certificate_id ===
                  certificate.id
              )
              .map(
                (image) => ({
                  id: image.id,
                  image_url:
                    image.image_url,
                  sort_order:
                    image.sort_order,
                })
              ),
        })
      )
    );
  };

  const resetForm = () => {
    setEditingId(null);

    setTitle("");
    setDescription("");
    setIssuedBy("");
    setIssuedDate("");

    setExistingImages([]);
    setRemovedImageIds([]);

    setNewFiles([]);
    setNewPreviews([]);

    setSelectedTagIds([]);

    setNewTagName("");
    setIsAddingTag(false);

    setShowForm(false);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (
    certificate: CertificateItem
  ) => {
    setEditingId(
      certificate.id
    );

    setTitle(
      certificate.title
    );

    setDescription(
      certificate.description
    );

    setIssuedBy(
      certificate.issued_by ??
        ""
    );

    setIssuedDate(
      certificate.issued_date ??
        ""
    );

    setExistingImages(
      certificate.images
    );

    setRemovedImageIds([]);

    setNewFiles([]);
    setNewPreviews([]);

    setSelectedTagIds(
      certificate.tagIds
    );

    setShowForm(true);
  };

  const fileToPreview = (
    file: File
  ) =>
    new Promise<string | null>(
      (resolve) => {
        const reader =
          new FileReader();

        reader.onload = () =>
          resolve(
            typeof reader.result ===
              "string"
              ? reader.result
              : null
          );

        reader.onerror = () =>
          resolve(null);

        reader.readAsDataURL(
          file
        );
      }
    );

  const handleFiles = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(
      event.target.files ?? []
    );

    event.target.value = "";

    const remaining =
      MAX_IMAGES -
      existingImages.length -
      newFiles.length;

    if (remaining <= 0) {
      alert(
        "เพิ่มได้สูงสุด 4 รูป"
      );
      return;
    }

    const accepted =
      files
        .filter(
          (file) =>
            [
              "image/jpeg",
              "image/png",
              "image/webp",
            ].includes(
              file.type
            ) &&
            file.size <=
              MAX_SIZE
        )
        .slice(
          0,
          remaining
        );

    const previews =
      await Promise.all(
        accepted.map(
          fileToPreview
        )
      );

    const finalFiles: File[] =
      [];

    const finalPreviews: string[] =
      [];

    previews.forEach(
      (preview, index) => {
        if (!preview) return;

        finalFiles.push(
          accepted[index]
        );

        finalPreviews.push(
          preview
        );
      }
    );

    setNewFiles(
      (current) => [
        ...current,
        ...finalFiles,
      ]
    );

    setNewPreviews(
      (current) => [
        ...current,
        ...finalPreviews,
      ]
    );
  };

  const removeOld = (
    image: CertificateImage
  ) => {
    setExistingImages(
      (current) =>
        current.filter(
          (item) =>
            item.id !== image.id
        )
    );

    setRemovedImageIds(
      (current) => [
        ...current,
        image.id,
      ]
    );
  };

  const removeNew = (
    index: number
  ) => {
    setNewFiles(
      (current) =>
        current.filter(
          (_, i) =>
            i !== index
        )
    );

    setNewPreviews(
      (current) =>
        current.filter(
          (_, i) =>
            i !== index
        )
    );
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

  const toggleTag = (
    id: string
  ) =>
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
      if (
        !selectedTagIds.includes(
          existing.id
        )
      ) {
        setSelectedTagIds(
          (current) => [
            ...current,
            existing.id,
          ]
        );
      }

      setNewTagName("");
      setIsAddingTag(false);

      return;
    }

    const {
      data,
      error,
    } =
      await supabase
        .from("user_tags")
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
        "สร้าง Tag ไม่สำเร็จ"
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

  const uploadImages = async (
    certificateId: string
  ) => {
    const rows = [];

    for (
      let i = 0;
      i < newFiles.length;
      i++
    ) {
      const file =
        newFiles[i];

      const extension =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase() ||
        "jpg";

      const path =
        `users/${userId}/certificates/${certificateId}/${crypto.randomUUID()}.${extension}`;

      const { error } =
        await supabase.storage
          .from(
            "portfolio-images"
          )
          .upload(
            path,
            file,
            {
              contentType:
                file.type,
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

      rows.push({
        certificate_id:
          certificateId,

        image_url:
          publicUrl,

        sort_order:
          existingImages.length +
          i,
      });
    }

    if (rows.length) {
      const { error } =
        await supabase
          .from(
            "user_library_certificate_images"
          )
          .insert(rows);

      if (error) {
        throw error;
      }
    }
  };

  const deleteRemoved =
    async () => {
      if (
        !removedImageIds.length
      ) {
        return;
      }

      const oldImages =
        certificates
          .flatMap(
            (item) =>
              item.images
          )
          .filter(
            (image) =>
              removedImageIds.includes(
                image.id
              )
          );

      const { error } =
        await supabase
          .from(
            "user_library_certificate_images"
          )
          .delete()
          .in(
            "id",
            removedImageIds
          );

      if (error) {
        throw error;
      }

      const paths =
        oldImages
          .map((image) =>
            pathFromUrl(
              image.image_url
            )
          )
          .filter(
            (
              item
            ): item is string =>
              Boolean(item)
          );

      if (paths.length) {
        await supabase.storage
          .from(
            "portfolio-images"
          )
          .remove(paths);
      }
    };

  const handleSave = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!title.trim()) {
      alert(
        "กรุณากรอกชื่อเกียรติบัตร"
      );
      return;
    }

    setIsSaving(true);

    try {
      let id =
        editingId;

      const payload = {
        title:
          title.trim(),

        description:
          description.trim(),

        issued_by:
          issuedBy.trim() ||
          null,

        issued_date:
          issuedDate ||
          null,
      };

      if (editingId) {
        const { error } =
          await supabase
            .from(
              "user_library_certificates"
            )
            .update(payload)
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
              "user_library_certificates"
            )
            .insert({
              ...payload,

              user_id:
                userId,

              image_url:
                null,
            })
            .select("id")
            .single();

        if (error) {
          throw error;
        }

        id = data.id;
      }

      if (!id) {
        throw new Error();
      }

      await deleteRemoved();

      await uploadImages(id);

      await supabase
        .from(
          "user_library_certificate_tags"
        )
        .delete()
        .eq(
          "certificate_id",
          id
        );

      if (
        selectedTagIds.length
      ) {
        const { error } =
          await supabase
            .from(
              "user_library_certificate_tags"
            )
            .insert(
              selectedTagIds.map(
                (tagId) => ({
                  certificate_id:
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

      await loadData(userId);

      resetForm();
    } catch (error) {
      console.error(error);

      alert(
        "ไม่สามารถบันทึกเกียรติบัตรได้"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (
    item: CertificateItem
  ) => {
    if (
      !window.confirm(
        "ต้องการลบเกียรติบัตรนี้ใช่หรือไม่?"
      )
    ) {
      return;
    }

    const paths =
      item.images
        .map((image) =>
          pathFromUrl(
            image.image_url
          )
        )
        .filter(
          (
            path
          ): path is string =>
            Boolean(path)
        );

    const { error } =
      await supabase
        .from(
          "user_library_certificates"
        )
        .delete()
        .eq(
          "id",
          item.id
        )
        .eq(
          "user_id",
          userId
        );

    if (error) {
      alert(
        "ลบข้อมูลไม่สำเร็จ"
      );
      return;
    }

    if (paths.length) {
      await supabase.storage
        .from(
          "portfolio-images"
        )
        .remove(paths);
    }

    await loadData(userId);
  };

  const totalImages =
    existingImages.length +
    newFiles.length;

  if (isLoading) {
    return (
      <div className="mt-8 flex min-h-[300px] items-center justify-center rounded-[24px] bg-white">
        กำลังโหลดเกียรติบัตร...
      </div>
    );
  }

  return (
    <>
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black">
              เกียรติบัตร
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              มีทั้งหมด{" "}
              {
                certificates.length
              }{" "}
              รายการ
            </p>
          </div>

          <button
            type="button"
            onClick={
              openCreate
            }
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white"
          >
            <FaPlus />
            เพิ่มเกียรติบัตร
          </button>
        </div>

        {certificates.length ===
        0 ? (
          <div className="mt-6 flex min-h-[300px] flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-slate-300 bg-white">
            <FaCertificate className="text-3xl text-blue-600" />

            <h3 className="mt-4 text-lg font-black">
              ยังไม่มีเกียรติบัตร
            </h3>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {certificates.map(
              (item) => {
                const itemTags =
                  tags.filter(
                    (tag) =>
                      item.tagIds.includes(
                        tag.id
                      )
                  );

                return (
                  <article
                    key={
                      item.id
                    }
                    className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm"
                  >
                    {item.images.length >
                      0 && (
                      <div className="grid grid-cols-2 gap-1 bg-slate-100">
                        {item.images.map(
                          (
                            image
                          ) => (
                            <div
                              key={
                                image.id
                              }
                              className="h-40 overflow-hidden"
                            >
                              <img
                                src={
                                  image.image_url
                                }
                                alt=""
                                className="h-full w-full object-contain"
                              />
                            </div>
                          )
                        )}
                      </div>
                    )}

                    <div className="p-5">
                      <div className="flex justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-black">
                            {
                              item.title
                            }
                          </h3>

                          {item.issued_by && (
                            <p className="mt-1 text-sm text-slate-500">
                              {
                                item.issued_by
                              }
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openEdit(
                                item
                              )
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-lg border"
                          >
                            <FaEdit />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(
                                item
                              )
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-500"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>

                      {item.description && (
                        <p className="mt-4 text-sm leading-6 text-slate-600">
                          {
                            item.description
                          }
                        </p>
                      )}

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
                    </div>
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
            <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-black">
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
                onClick={
                  resetForm
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100"
              >
                <FaTimes />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <form
                id="certificate-form"
                onSubmit={
                  handleSave
                }
                className="space-y-4"
              >
                <div>
                  <div className="mb-2 flex justify-between">
                    <label className="text-sm font-bold">
                      รูปเกียรติบัตร
                    </label>

                    <span className="text-xs font-bold text-slate-400">
                      {
                        totalImages
                      }{" "}
                      / 4 รูป
                    </span>
                  </div>

                  <input
                    ref={
                      fileInputRef
                    }
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    onChange={
                      handleFiles
                    }
                    className="hidden"
                  />

                  <button
                    type="button"
                    disabled={
                      totalImages >=
                      4
                    }
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold disabled:bg-slate-100"
                  >
                    <FaImage />

                    {totalImages >=
                    4
                      ? "ครบ 4 รูปแล้ว"
                      : "เพิ่มรูปเกียรติบัตร"}
                  </button>

                  {(existingImages.length >
                    0 ||
                    newPreviews.length >
                      0) && (
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {existingImages.map(
                        (
                          image
                        ) => (
                          <ImageCard
                            key={
                              image.id
                            }
                            src={
                              image.image_url
                            }
                            onDelete={() =>
                              removeOld(
                                image
                              )
                            }
                          />
                        )
                      )}

                      {newPreviews.map(
                        (
                          preview,
                          index
                        ) => (
                          <ImageCard
                            key={
                              index
                            }
                            src={
                              preview
                            }
                            onDelete={() =>
                              removeNew(
                                index
                              )
                            }
                          />
                        )
                      )}
                    </div>
                  )}
                </div>

                <Field label="ชื่อเกียรติบัตร / รางวัล *">
                  <input
                    value={
                      title
                    }
                    onChange={(e) =>
                      setTitle(
                        e.target.value
                      )
                    }
                    required
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field label="รายละเอียด">
                  <textarea
                    rows={3}
                    value={
                      description
                    }
                    onChange={(e) =>
                      setDescription(
                        e.target.value
                      )
                    }
                    className={`${inputClass} resize-none`}
                  />
                </Field>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="หน่วยงานที่ออกให้">
                    <input
                      value={
                        issuedBy
                      }
                      onChange={(e) =>
                        setIssuedBy(
                          e.target.value
                        )
                      }
                      className={
                        inputClass
                      }
                    />
                  </Field>

                  <Field label="วันที่ได้รับ">
                    <input
                      type="date"
                      value={
                        issuedDate
                      }
                      onChange={(e) =>
                        setIssuedDate(
                          e.target.value
                        )
                      }
                      className={
                        inputClass
                      }
                    />
                  </Field>
                </div>

                <div>
                  <div className="flex justify-between">
                    <label className="text-sm font-bold">
                      Tags
                    </label>

                    <button
                      type="button"
                      onClick={() =>
                        setIsAddingTag(
                          true
                        )
                      }
                      className="text-xs font-bold text-blue-600"
                    >
                      + สร้าง Tag ใหม่
                    </button>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {tags.map(
                      (
                        tag
                      ) => (
                        <button
                          key={
                            tag.id
                          }
                          type="button"
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
                              : ""
                          }`}
                        >
                          {
                            tag.name
                          }
                        </button>
                      )
                    )}
                  </div>

                  {isAddingTag && (
                    <div className="mt-3 flex gap-2 bg-slate-50 p-3">
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
                    </div>
                  )}
                </div>
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
                form="certificate-form"
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

function ImageCard({
  src,
  onDelete,
}: {
  src: string;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
      <div className="h-24 w-full overflow-hidden rounded-lg bg-slate-100">
        <img
          src={src}
          alt="รูปเกียรติบัตร"
          className="h-full w-full object-contain"
        />
      </div>

      <button
        type="button"
        onClick={onDelete}
        style={{
          backgroundColor: "#dc2626",
          color: "#ffffff",
        }}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold shadow-sm transition hover:opacity-90"
      >
        <FaTrash />
        ลบรูป
      </button>
    </div>
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
      <label className="mb-1.5 block text-sm font-bold">
        {label}
      </label>

      {children}
    </div>
  );
}