"use client";
import { useLibraryDraft } from "./LibraryDraftGuard";
import LibraryLoadStatus from "./LibraryLoadStatus";
import { useLibraryLoad } from "./useLibraryLoad";
import CropInput from "@/components/images/CropInput";

import {
  useCallback,
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
  "min-h-11 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-800 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:text-sm";

export default function CertificateLibrary({ ownerId }: { ownerId: string }) {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const userId = ownerId;

  const { isLoading, loaded, loadError, tagsError: tagsLoadError, canSave, run } = useLibraryLoad();

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

  const requestExit = useLibraryDraft({
    open: showForm, saving: isSaving, values: [title, description, issuedBy, issuedDate, newTagName],
    tagIds: selectedTagIds, images: existingImages, files: newFiles,
  });
  const draftReads = useRef(0);
  const saveLifetime = useRef(0);
  useEffect(() => () => { draftReads.current++; saveLifetime.current++; }, []);

  const loadData = useCallback((uid: string, fresh = false) => run(uid,
    () => Promise.all([
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
    ]),
    result => {
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
    ] = result;
      const mainFailed = Boolean(certificateError || imageError);
      const tagsFailed = Boolean(tagsError || tagLinksError);
      const links: CertificateTagRow[] = tagLinks ?? [];
      const images: CertificateImageRow[] = imageData ?? [];
      if (!tagsFailed) setTags(tagsData ?? []);
      if (!mainFailed) {
        setCertificates(previous => (certificateData ?? []).map(row => ({
          ...row,
          tagIds: tagsFailed
            ? previous.find(item => item.id === row.id)?.tagIds ?? []
            : links.filter(link => link.certificate_id === row.id).map(link => link.tag_id),
          images: images.filter(image => image.certificate_id === row.id).map(image => ({
            id: image.id, image_url: image.image_url, sort_order: image.sort_order,
          })),
        })));
      }
    return { mainError: mainFailed, tagsError: tagsFailed };
  }, fresh), [supabase, run]);

  useEffect(() => { void loadData(ownerId); }, [loadData, ownerId]);

  const resetForm = () => {
    draftReads.current++;
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

  const requestClose = () => requestExit(resetForm);

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (
    certificate: CertificateItem
  ) => {
    draftReads.current++;
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
    const ticket = draftReads.current;
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

    if (ticket !== draftReads.current) return;

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
    if (!canSave) return;
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
    if (isSaving || !canSave) return;

    if (!title.trim()) {
      alert(
        "กรุณากรอกชื่อเกียรติบัตร"
      );
      return;
    }

    const lifetime = saveLifetime.current;
    const saveCurrent = () => lifetime === saveLifetime.current;
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

      if (!saveCurrent()) return;
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

      if (!saveCurrent()) return;
      await loadData(userId, true);

      if (!saveCurrent()) return;
      resetForm();
    } catch (error) {
      if (!saveCurrent()) return;
      console.error(error);

      alert(
        "ไม่สามารถบันทึกเกียรติบัตรได้"
      );
    } finally {
      if (saveCurrent()) setIsSaving(false);
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

    await loadData(userId, true);
  };

  const totalImages =
    existingImages.length +
    newFiles.length;

  if (isLoading && !loaded && !loadError && !tagsLoadError) {
    return (
      <div role="status" className="mt-6 flex min-h-52 items-center justify-center rounded-xl bg-white p-4">
        กำลังโหลดเกียรติบัตร...
      </div>
    );
  }

  return (
    <>
      <LibraryLoadStatus isLoading={isLoading} loaded={loaded} loadError={loadError} tagsError={tagsLoadError} retry={() => void loadData(userId)} />
      <section className="mt-6 min-w-0">
        <div className="flex min-w-0 flex-col items-start gap-4 @min-[40rem]:flex-row @min-[40rem]:items-center @min-[40rem]:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              เกียรติบัตร
            </h2>

{loaded &&             <p className="mt-1 text-sm text-slate-500">
              มีทั้งหมด{" "}
              {
                certificates.length
              }{" "}
              รายการ
            </p>}
          </div>

          <button
            type="button"
            onClick={
              openCreate
            }
            className="inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            <FaPlus />
            เพิ่มเกียรติบัตร
          </button>
        </div>

        {loaded && !loadError && certificates.length ===
        0 ? (
          <div className="mt-5 flex min-h-52 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white p-5 text-center">
            <FaCertificate className="text-3xl text-blue-600" />

            <h3 className="mt-4 text-lg font-black">
              ยังไม่มีเกียรติบัตร
            </h3>
          </div>
        ) : (
          <div className="mt-5 grid min-w-0 grid-cols-1 gap-4 @min-[48rem]:grid-cols-2">
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
                    className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm wrap-anywhere"
                  >
                    {item.images.length >
                      0 && (
                      <div className="grid min-w-0 grid-cols-2 gap-2 bg-slate-100 p-2">
                        {item.images.map(
                          (
                            image
                          ) => (
                            <div
                              key={
                                image.id
                              }
                              className="h-40 min-w-0 overflow-hidden rounded-lg bg-white p-2"
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

                    <div className="min-w-0 p-4">
                      <div className="flex min-w-0 flex-col gap-3">
                        <div>
                          <h3 className="text-base font-bold leading-7 text-slate-900">
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

                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openEdit(
                                item
                              )
                            }
                            disabled={!canSave}
                          aria-label={`แก้ไขเกียรติบัตร ${item.title}`} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
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
                            aria-label={`ลบเกียรติบัตร ${item.title}`} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>

                      {item.description && (
                        <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-600">
                          {
                            item.description
                          }
                        </p>
                      )}

                      {!tagsLoadError && itemTags.length >
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
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>

      {showForm && (
        <div role="dialog" aria-modal="true" aria-labelledby="certificate-library-dialog-title" className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/60 p-2 backdrop-blur-sm sm:p-4">
          <div className="flex h-[calc(100dvh-16px)] min-w-0 w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:h-[min(760px,calc(100dvh-32px))]">
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6">
              <div>
                <h2 id="certificate-library-dialog-title" className="text-base font-bold leading-6 text-slate-900">
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
                  requestClose
                }
                disabled={isSaving}
                aria-label="ปิดฟอร์มเกียรติบัตร" className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                <FaTimes />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
              <form
                id="certificate-form"
                onSubmit={
                  handleSave
                }
                aria-busy={isSaving} className="@container min-w-0 space-y-5"
              >
                <fieldset disabled={isSaving} className="min-w-0 space-y-5">
                <LibraryLoadStatus isLoading={isLoading} loaded={loaded} loadError={loadError} tagsError={tagsLoadError} retry={() => void loadData(userId)} />
                <div>
                  <div className="mb-2 flex min-w-0 flex-wrap items-center justify-between gap-2">
                    <label htmlFor="certificate-library-images" className="text-sm font-semibold text-slate-700">
                      รูปเกียรติบัตร
                    </label>

                    <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                      {
                        totalImages
                      }{" "}
                      / 4 รูป
                    </span>
                  </div>

                  <CropInput id="certificate-library-images"
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
                    className="inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
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
                    <div className="mt-3 grid min-w-0 grid-cols-2 gap-3 @min-[32rem]:grid-cols-4">
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

                <Field htmlFor="certificate-library-title" label="ชื่อเกียรติบัตร / รางวัล *">
                  <input id="certificate-library-title" autoFocus
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

                <Field htmlFor="certificate-library-description" label="รายละเอียด">
                  <textarea id="certificate-library-description"
                    rows={3}
                    value={
                      description
                    }
                    onChange={(e) =>
                      setDescription(
                        e.target.value
                      )
                    }
                    className={`${inputClass} min-h-32 resize-y leading-7`}
                  />
                </Field>

                <div className="grid min-w-0 grid-cols-1 gap-5 @min-[24rem]:grid-cols-2">
                  <Field htmlFor="certificate-library-issuedBy" label="หน่วยงานที่ออกให้">
                    <input id="certificate-library-issuedBy"
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

                  <Field htmlFor="certificate-library-issuedDate" label="วันที่ได้รับ">
                    <input id="certificate-library-issuedDate"
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

                <fieldset disabled={!canSave} className="min-w-0 disabled:opacity-60">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-700">Tags</p>

                    <button
                      type="button"
                      onClick={() =>
                        setIsAddingTag(
                          true
                        )
                      }
                      className="min-h-11 rounded-lg px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
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
                          aria-pressed={selectedTagIds.includes(tag.id)} className={`min-h-11 min-w-0 max-w-full rounded-full border px-3 py-2 text-left text-sm font-semibold wrap-anywhere focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
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
                        aria-label="ชื่อ Tag ใหม่" className={`${inputClass} flex-1 basis-36`}
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
                    </div>
                  )}
                </fieldset>
              </fieldset>
              </form>
            </div>

            <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
              <button
                type="button"
                onClick={
                  requestClose
                }
                disabled={isSaving}
                className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                ยกเลิก
              </button>

              <button
                form="certificate-form"
                type="submit"
                disabled={
                  isSaving || !canSave
                }
                aria-busy={isSaving} className="min-h-11 rounded-lg bg-blue-600 px-3 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
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

function ImageCard({
  src,
  onDelete,
}: {
  src: string;
  onDelete: () => void;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-2">
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
        className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
      >
        <FaTrash />
        ลบรูป
      </button>
    </div>
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
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-sm font-semibold leading-5 text-slate-700">
        {label}
      </label>

      {children}
    </div>
  );
}
