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
  FaEdit,
  FaImage,
  FaPlus,
  FaTag,
  FaTrash,
  FaTrophy,
  FaTimes,
} from "react-icons/fa";

import { createClient } from "@/lib/supabase/client";

type UserTag = {
  id: string;
  name: string;
};

type ActivityImage = {
  id: string;
  image_url: string;
  sort_order: number;
};

type Activity = {
  id: string;
  title: string;
  description: string;
  activity_date: string | null;
  organization: string | null;
  created_at: string;
  tagIds: string[];
  images: ActivityImage[];
};

type ActivityRow = {
  id: string;
  title: string;
  description: string;
  activity_date: string | null;
  organization: string | null;
  created_at: string;
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

const MAX_IMAGES = 4;
const MAX_IMAGE_SIZE =
  5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export default function ActivityLibrary({ ownerId }: { ownerId: string }) {
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

  const [activities, setActivities] =
    useState<Activity[]>([]);

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

  const [activityDate, setActivityDate] =
    useState("");

  const [organization, setOrganization] =
    useState("");

  const [
    existingImages,
    setExistingImages,
  ] = useState<ActivityImage[]>([]);

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
    open: showForm, saving: isSaving, values: [title, description, activityDate, organization, newTagName],
    tagIds: selectedTagIds, images: existingImages, files: newFiles,
  });
  const draftReads = useRef(0);
  const saveLifetime = useRef(0);
  useEffect(() => () => { draftReads.current++; saveLifetime.current++; }, []);

  const loadData = useCallback((uid: string, fresh = false) => run(uid,
    () => Promise.all([
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
          organization,
          created_at
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
        .order("sort_order"),
    ]),
    result => {
    const [
      {
        data: activitiesData,
        error: activitiesError,
      },
      {
        data: tagsData,
        error: tagsError,
      },
      {
        data: activityTagsData,
        error: activityTagsError,
      },
      {
        data: imagesData,
        error: imagesError,
      },
    ] = result;
      const mainFailed = Boolean(activitiesError || imagesError);
      const tagsFailed = Boolean(tagsError || activityTagsError);
      const links: ActivityTagRow[] = activityTagsData ?? [];
      const images: ActivityImageRow[] = imagesData ?? [];
      if (!tagsFailed) setTags(tagsData ?? []);
      if (!mainFailed) {
        const rows: ActivityRow[] = activitiesData ?? [];
        setActivities(previous => rows.map(row => ({
          ...row,
          tagIds: tagsFailed
            ? previous.find(item => item.id === row.id)?.tagIds ?? []
            : links.filter(link => link.activity_id === row.id).map(link => link.tag_id),
          images: images.filter(image => image.activity_id === row.id).map(image => ({
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
    setActivityDate("");
    setOrganization("");

    setExistingImages([]);
    setRemovedImageIds([]);

    setNewFiles([]);
    setNewPreviews([]);

    setSelectedTagIds([]);

    setNewTagName("");
    setIsAddingTag(false);

    if (fileInputRef.current) {
      fileInputRef.current.value =
        "";
    }

    setShowForm(false);
  };

  const requestClose = () => requestExit(resetForm);

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (
    activity: Activity
  ) => {
    draftReads.current++;
    setEditingId(activity.id);

    setTitle(activity.title);

    setDescription(
      activity.description
    );

    setActivityDate(
      activity.activity_date ??
        ""
    );

    setOrganization(
      activity.organization ??
        ""
    );

    setExistingImages(
      [...activity.images].sort(
        (a, b) =>
          a.sort_order -
          b.sort_order
      )
    );

    setRemovedImageIds([]);

    setNewFiles([]);
    setNewPreviews([]);

    setSelectedTagIds(
      activity.tagIds
    );

    setShowForm(true);
  };

  const fileToDataUrl = (
    file: File
  ) =>
    new Promise<string | null>(
      (resolve) => {
        const reader =
          new FileReader();

        reader.onload = () => {
          resolve(
            typeof reader.result ===
              "string"
              ? reader.result
              : null
          );
        };

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

    const currentCount =
      existingImages.length +
      newFiles.length;

    const remaining =
      MAX_IMAGES -
      currentCount;

    if (remaining <= 0) {
      alert(
        "เพิ่มรูปได้สูงสุด 4 รูป"
      );
      return;
    }

    const validFiles =
      files.filter((file) => {
        if (
          !ALLOWED_IMAGE_TYPES.includes(
            file.type
          )
        ) {
          alert(
            `${file.name} รองรับเฉพาะ JPG, PNG หรือ WEBP`
          );

          return false;
        }

        if (
          file.size >
          MAX_IMAGE_SIZE
        ) {
          alert(
            `${file.name} มีขนาดเกิน 5MB`
          );

          return false;
        }

        return true;
      });

    if (
      validFiles.length >
      remaining
    ) {
      alert(
        `เพิ่มได้อีก ${remaining} รูป`
      );
    }

    const acceptedFiles =
      validFiles.slice(
        0,
        remaining
      );

    const previews =
      await Promise.all(
        acceptedFiles.map(
          (file) =>
            fileToDataUrl(file)
        )
      );

    if (ticket !== draftReads.current) return;

    const finalFiles: File[] =
      [];

    const finalPreviews: string[] =
      [];

    previews.forEach(
      (preview, index) => {
        if (!preview) {
          return;
        }

        finalFiles.push(
          acceptedFiles[index]
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

  const removeExistingImage = (
    image: ActivityImage
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

  const removeNewImage = (
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

  const toggleTag = (
    tagId: string
  ) => {
    setSelectedTagIds(
      (current) =>
        current.includes(tagId)
          ? current.filter(
              (id) =>
                id !== tagId
            )
          : [
              ...current,
              tagId,
            ]
    );
  };

  const handleAddTag = async () => {
    if (!canSave) return;
    const clean =
      newTagName.trim();

    if (!clean || !userId) {
      return;
    }

    const existing =
      tags.find(
        (tag) =>
          tag.name.toLowerCase() ===
          clean.toLowerCase()
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
    } = await supabase
      .from("user_tags")
      .insert({
        user_id: userId,
        name: clean,
      })
      .select("id, name")
      .single();

    if (error) {
      alert(
        "ไม่สามารถสร้าง Tag ได้"
      );
      return;
    }

    setTags((current) => [
      ...current,
      data,
    ]);

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
    publicUrl: string
  ) => {
    try {
      const url =
        new URL(publicUrl);

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

  const uploadImages = async (
    activityId: string
  ) => {
    const rows: {
      activity_id: string;
      image_url: string;
      sort_order: number;
    }[] = [];

    for (
      let index = 0;
      index <
      newFiles.length;
      index++
    ) {
      const file =
        newFiles[index];

      const extension =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase() ||
        "jpg";

      const path =
        `users/${userId}/activities/${activityId}/${crypto.randomUUID()}.${extension}`;

      const {
        error: uploadError,
      } =
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

      if (uploadError) {
        throw uploadError;
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
        activity_id:
          activityId,

        image_url:
          publicUrl,

        sort_order:
          existingImages.length +
          index,
      });
    }

    if (
      rows.length > 0
    ) {
      const { error } =
        await supabase
          .from(
            "user_library_activity_images"
          )
          .insert(rows);

      if (error) {
        throw error;
      }
    }
  };

  const deleteRemovedImages =
    async () => {
      if (
        removedImageIds.length ===
        0
      ) {
        return;
      }

      const oldImages =
        activities
          .flatMap(
            (activity) =>
              activity.images
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
            "user_library_activity_images"
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
              path
            ): path is string =>
              Boolean(path)
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

    if (!userId) return;

    if (!title.trim()) {
      alert(
        "กรุณากรอกชื่อผลงานหรือกิจกรรม"
      );
      return;
    }

    const lifetime = saveLifetime.current;
    const saveCurrent = () => lifetime === saveLifetime.current;
    setIsSaving(true);

    try {
      let activityId =
        editingId;

      const payload = {
        title: title.trim(),

        description:
          description.trim(),

        activity_date:
          activityDate || null,

        organization:
          organization.trim() ||
          null,
      };

      if (editingId) {
        const { error } =
          await supabase
            .from(
              "user_library_activities"
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
              "user_library_activities"
            )
            .insert({
              ...payload,
              user_id:
                userId,
            })
            .select("id")
            .single();

        if (error) {
          throw error;
        }

        activityId =
          data.id;
      }

      if (!saveCurrent()) return;
      if (!activityId) {
        throw new Error(
          "Activity ID missing"
        );
      }

      await deleteRemovedImages();

      await uploadImages(
        activityId
      );

      const {
        error:
          deleteTagsError,
      } =
        await supabase
          .from(
            "user_library_activity_tags"
          )
          .delete()
          .eq(
            "activity_id",
            activityId
          );

      if (
        deleteTagsError
      ) {
        throw deleteTagsError;
      }

      if (
        selectedTagIds.length
      ) {
        const { error } =
          await supabase
            .from(
              "user_library_activity_tags"
            )
            .insert(
              selectedTagIds.map(
                (tagId) => ({
                  activity_id:
                    activityId,

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
        "ไม่สามารถบันทึกข้อมูลได้"
      );
    } finally {
      if (saveCurrent()) setIsSaving(false);
    }
  };

  const handleDelete = async (
    activity: Activity
  ) => {
    if (
      !window.confirm(
        "ต้องการลบรายการนี้ใช่หรือไม่?"
      )
    ) {
      return;
    }

    const paths =
      activity.images
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
          "user_library_activities"
        )
        .delete()
        .eq(
          "id",
          activity.id
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
      <Loading text="กำลังโหลดผลงานและกิจกรรม..." />
    );
  }

  return (
    <>
      <LibraryLoadStatus isLoading={isLoading} loaded={loaded} loadError={loadError} tagsError={tagsLoadError} retry={() => void loadData(userId)} />
      <section className="mt-6 min-w-0">
        <SectionHeader
          title="ผลงานและกิจกรรม"
          count={loaded ? activities.length : null}
          buttonText="เพิ่มผลงานหรือกิจกรรม"
          onAdd={openCreateForm}
        />

        {loaded && !loadError && activities.length ===
        0 ? (
          <EmptyState
            icon={
              <FaTrophy />
            }
            title="ยังไม่มีผลงานหรือกิจกรรม"
          />
        ) : (
          <div className="mt-5 grid min-w-0 grid-cols-1 gap-4 @min-[48rem]:grid-cols-2">
            {activities.map(
              (activity) => {
                const itemTags =
                  tags.filter(
                    (tag) =>
                      activity.tagIds.includes(
                        tag.id
                      )
                  );

                return (
                  <article
                    key={
                      activity.id
                    }
                    className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm wrap-anywhere"
                  >
                    {activity.images.length >
                      0 && (
                      <div
                        className={`grid min-w-0 gap-1 bg-slate-100 ${
                          activity
                            .images
                            .length ===
                          1
                            ? "grid-cols-1"
                            : "grid-cols-2"
                        }`}
                      >
                        {activity.images.map(
                          (
                            image
                          ) => (
                            <div
                              key={
                                image.id
                              }
                              className="h-40 min-w-0 overflow-hidden"
                            >
                              <img
                                src={
                                  image.image_url
                                }
                                alt={
                                  activity.title
                                }
                                className="h-full w-full object-cover"
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
                              activity.title
                            }
                          </h3>

                          {activity.organization && (
                            <p className="mt-1 text-sm text-slate-500">
                              {
                                activity.organization
                              }
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap justify-end gap-2">
                          <IconButton
                            disabled={!canSave}
                            label="แก้ไข"
                            onClick={() =>
                              openEditForm(
                                activity
                              )
                            }
                          >
                            <FaEdit />
                          </IconButton>

                          <IconButton
                            danger
                            label="ลบ"
                            onClick={() =>
                              handleDelete(
                                activity
                              )
                            }
                          >
                            <FaTrash />
                          </IconButton>
                        </div>
                      </div>

                      {activity.activity_date && (
                        <p className="mt-3 text-xs font-semibold text-slate-400">
                          วันที่{" "}
                          {
                            activity.activity_date
                          }
                        </p>
                      )}

                      {activity.description && (
                        <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-600">
                          {
                            activity.description
                          }
                        </p>
                      )}

                      {!tagsLoadError && <TagList
                        tags={
                          itemTags
                        }
                      />}
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>

      {showForm && (
        <LibraryModal
          title={
            editingId
              ? "แก้ไขผลงานหรือกิจกรรม"
              : "เพิ่มผลงานหรือกิจกรรม"
          }
          isSaving={
            isSaving
          }
          canSave={canSave}
          submitText={
            editingId
              ? "บันทึกการแก้ไข"
              : "บันทึก"
          }
          formId="activity-library-form"
          onClose={
            requestClose
          }
        >
          <form
            id="activity-library-form"
            onSubmit={handleSave}
            aria-busy={isSaving}
            className="@container min-w-0 space-y-5"
          >
                <fieldset disabled={isSaving} className="min-w-0 space-y-5">
                <LibraryLoadStatus isLoading={isLoading} loaded={loaded} loadError={loadError} tagsError={tagsLoadError} retry={() => void loadData(userId)} />
            <Field htmlFor="activity-library-title" label="ชื่อผลงาน / กิจกรรม *">
              <input id="activity-library-title" autoFocus
                value={title}
                onChange={(e) =>
                  setTitle(
                    e.target.value
                  )
                }
                required
                className={inputClass}
              />
            </Field>

            <Field htmlFor="activity-library-description" label="รายละเอียด">
              <textarea id="activity-library-description"
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

            <Field
              htmlFor="activity-library-images"
              label="รูปภาพผลงาน / กิจกรรม"
              right={`${totalImages} / 4 รูป`}
            >
              <CropInput id="activity-library-images"
                ref={fileInputRef}
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
                  MAX_IMAGES
                }
                onClick={() =>
                  fileInputRef.current?.click()
                }
                className="inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FaImage />

                {totalImages >=
                MAX_IMAGES
                  ? "ครบ 4 รูปแล้ว"
                  : "เพิ่มรูปภาพ"}
              </button>

              <p className="mt-2 text-xs text-slate-400">
                JPG, PNG หรือ WEBP ไม่เกิน 5MB ต่อรูป
              </p>

              {(existingImages.length >
                0 ||
                newPreviews.length >
                  0) && (
                <div className="mt-3 grid min-w-0 grid-cols-2 gap-3 @min-[32rem]:grid-cols-4">
                  {existingImages.map(
                    (image) => (
                      <ImageTile
                        key={
                          image.id
                        }
                        src={
                          image.image_url
                        }
                        onDelete={() =>
                          removeExistingImage(
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
                      <ImageTile
                        key={`new-${index}`}
                        src={
                          preview
                        }
                        onDelete={() =>
                          removeNewImage(
                            index
                          )
                        }
                      />
                    )
                  )}
                </div>
              )}
            </Field>

            <div className="grid min-w-0 grid-cols-1 gap-5 @min-[24rem]:grid-cols-2">
              <Field htmlFor="activity-library-date" label="วันที่">
                <input id="activity-library-date"
                  type="date"
                  value={
                    activityDate
                  }
                  onChange={(e) =>
                    setActivityDate(
                      e.target.value
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </Field>

              <Field htmlFor="activity-library-organization" label="หน่วยงาน / สถานที่">
                <input id="activity-library-organization"
                  value={
                    organization
                  }
                  onChange={(e) =>
                    setOrganization(
                      e.target.value
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </Field>
            </div>

            <fieldset disabled={!canSave} className="min-w-0 disabled:opacity-60"><TagSelector
              tags={tags}
              selectedTagIds={
                selectedTagIds
              }
              toggleTag={
                toggleTag
              }
              isAddingTag={
                isAddingTag
              }
              setIsAddingTag={
                setIsAddingTag
              }
              newTagName={
                newTagName
              }
              setNewTagName={
                setNewTagName
              }
              handleAddTag={
                handleAddTag
              }
            /></fieldset>
          </fieldset>
              </form>
        </LibraryModal>
      )}
    </>
  );
}

/* ---------- UI ---------- */

const inputClass =
  "min-h-11 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-800 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:text-sm";

function ImageTile({
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
          alt="รูปผลงานหรือกิจกรรม"
          className="h-full w-full object-cover"
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

function LibraryModal({
  title,
  children,
  formId,
  isSaving,
  submitText,
  canSave,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  formId: string;
  isSaving: boolean;
  submitText: string;
  canSave: boolean;
  onClose: () => void;
}) {
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="activity-library-dialog-title" className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/60 p-2 backdrop-blur-sm sm:p-4">
      <div className="flex h-[calc(100dvh-16px)] min-w-0 w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:h-[min(760px,calc(100dvh-32px))]">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6">
          <div>
            <h2 id="activity-library-dialog-title" className="text-base font-bold leading-6 text-slate-900">
              {title}
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              ข้อมูลนี้จะถูกบันทึกไว้ในบัญชีของคุณ
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving} aria-label="ปิดฟอร์มผลงานหรือกิจกรรม" className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            <FaTimes />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {children}
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={
              isSaving
            }
            className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:opacity-60"
          >
            ยกเลิก
          </button>

          <button
            type="submit"
            form={formId}
            disabled={
              isSaving || !canSave
            }
            aria-busy={isSaving} className="min-h-11 rounded-lg bg-blue-600 px-3 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving
              ? "กำลังบันทึก..."
              : submitText}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  htmlFor,
  label,
  right,
  children,
}: {
  label: string;
  htmlFor: string;
  right?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex min-w-0 flex-wrap items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="text-sm font-semibold leading-5 text-slate-700">
          {label}
        </label>

        {right && (
          <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
            {right}
          </span>
        )}
      </div>

      {children}
    </div>
  );
}

function TagSelector({
  tags,
  selectedTagIds,
  toggleTag,
  isAddingTag,
  setIsAddingTag,
  newTagName,
  setNewTagName,
  handleAddTag,
}: {
  tags: UserTag[];
  selectedTagIds: string[];
  toggleTag: (
    id: string
  ) => void;
  isAddingTag: boolean;
  setIsAddingTag: (
    value: boolean
  ) => void;
  newTagName: string;
  setNewTagName: (
    value: string
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
          (tag) => {
            const selected =
              selectedTagIds.includes(
                tag.id
              );

            return (
              <button
                type="button"
                key={tag.id}
                onClick={() =>
                  toggleTag(
                    tag.id
                  )
                }
                aria-pressed={selected}
                className={`min-h-11 min-w-0 max-w-full rounded-full border px-3 py-2 text-left text-sm font-semibold wrap-anywhere focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                  selected
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                {selected
                  ? "✓ "
                  : ""}
                {tag.name}
              </button>
            );
          }
        )}
      </div>

      {isAddingTag && (
        <div className="mt-3 flex min-w-0 flex-wrap gap-2 rounded-lg bg-slate-50 p-3">
          <input aria-label="ชื่อ Tag ใหม่"
            value={
              newTagName
            }
            onChange={(e) =>
              setNewTagName(
                e.target.value
              )
            }
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
  title,
  count,
  buttonText,
  onAdd,
}: {
  title: string;
  count: number | null;
  buttonText: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-4 @min-[40rem]:flex-row @min-[40rem]:items-center @min-[40rem]:justify-between">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          {title}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {count === null ? "ยังโหลดรายการไม่สำเร็จ" : `มีทั้งหมด ${count} รายการ`}
        </p>
      </div>

      <button
        type="button"
        onClick={onAdd}
        className="inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
      >
        <FaPlus />
        {buttonText}
      </button>
    </div>
  );
}

function EmptyState({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="mt-5 flex min-h-52 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white p-5 text-center">
      <div className="text-3xl text-blue-600">
        {icon}
      </div>

      <h3 className="mt-4 text-lg font-black text-slate-900">
        {title}
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

function IconButton({
  children,
  danger = false,
  disabled = false,
  label,
  onClick,
}: {
  children: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      onClick={onClick}
      className={`flex min-h-11 min-w-11 items-center justify-center rounded-lg border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
        danger
          ? "border-red-200 text-red-500 hover:bg-red-50"
          : "border-slate-200 text-slate-500 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function TagList({
  tags,
}: {
  tags: UserTag[];
}) {
  if (!tags.length) {
    return null;
  }

  return (
    <div className="mt-4 flex min-w-0 flex-wrap gap-2">
      {tags.map(
        (tag) => (
          <span
            key={tag.id}
            className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold leading-5 text-blue-700"
          >
            <FaTag />
            {tag.name}
          </span>
        )
      )}
    </div>
  );
}
