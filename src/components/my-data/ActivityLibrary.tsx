"use client";

import {
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

export default function ActivityLibrary() {
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
    currentUserId: string
  ) => {
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
    ] = await Promise.all([
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
          currentUserId
        )
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("user_tags")
        .select("id, name")
        .eq(
          "user_id",
          currentUserId
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
    ]);

    if (activitiesError) {
      console.error(
        activitiesError
      );
    }

    if (tagsError) {
      console.error(tagsError);
    }

    if (activityTagsError) {
      console.error(
        activityTagsError
      );
    }

    if (imagesError) {
      console.error(imagesError);
    }

    const cleanActivities: ActivityRow[] =
      activitiesData ?? [];

    const cleanTags: UserTag[] =
      tagsData ?? [];

    const cleanActivityTags: ActivityTagRow[] =
      activityTagsData ?? [];

    const cleanImages: ActivityImageRow[] =
      imagesData ?? [];

    setTags(cleanTags);

    setActivities(
      cleanActivities.map(
        (activity) => ({
          ...activity,

          tagIds:
            cleanActivityTags
              .filter(
                (item) =>
                  item.activity_id ===
                  activity.id
              )
              .map(
                (item) =>
                  item.tag_id
              ),

          images:
            cleanImages
              .filter(
                (image) =>
                  image.activity_id ===
                  activity.id
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

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (
    activity: Activity
  ) => {
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

    if (!userId) return;

    if (!title.trim()) {
      alert(
        "กรุณากรอกชื่อผลงานหรือกิจกรรม"
      );
      return;
    }

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

      await loadData(userId);

      resetForm();
    } catch (error) {
      console.error(error);

      alert(
        "ไม่สามารถบันทึกข้อมูลได้"
      );
    } finally {
      setIsSaving(false);
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

    await loadData(userId);
  };

  const totalImages =
    existingImages.length +
    newFiles.length;

  if (isLoading) {
    return (
      <Loading text="กำลังโหลดผลงานและกิจกรรม..." />
    );
  }

  return (
    <>
      <section className="mt-8">
        <SectionHeader
          title="ผลงานและกิจกรรม"
          count={activities.length}
          buttonText="เพิ่มผลงานหรือกิจกรรม"
          onAdd={openCreateForm}
        />

        {activities.length ===
        0 ? (
          <EmptyState
            icon={
              <FaTrophy />
            }
            title="ยังไม่มีผลงานหรือกิจกรรม"
          />
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
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
                    className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm"
                  >
                    {activity.images.length >
                      0 && (
                      <div
                        className={`grid gap-1 bg-slate-100 ${
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
                              className="h-40 overflow-hidden"
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

                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-black text-slate-900">
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

                        <div className="flex gap-2">
                          <IconButton
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

                      <TagList
                        tags={
                          itemTags
                        }
                      />
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
          submitText={
            editingId
              ? "บันทึกการแก้ไข"
              : "เพิ่มลงคลัง"
          }
          formId="activity-library-form"
          onClose={
            resetForm
          }
        >
          <form
            id="activity-library-form"
            onSubmit={handleSave}
            className="space-y-4"
          >
            <Field label="ชื่อผลงาน / กิจกรรม *">
              <input
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

            <Field
              label="รูปภาพผลงาน / กิจกรรม"
              right={`${totalImages} / 4 รูป`}
            >
              <input
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
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
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
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
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

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="วันที่">
                <input
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

              <Field label="หน่วยงาน / สถานที่">
                <input
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

            <TagSelector
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
            />
          </form>
        </LibraryModal>
      )}
    </>
  );
}

/* ---------- UI ---------- */

const inputClass =
  "w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

function ImageTile({
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
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold shadow-sm transition hover:opacity-90"
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
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  formId: string;
  isSaving: boolean;
  submitText: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="flex h-[calc(100dvh-32px)] w-full max-w-2xl flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl sm:h-[min(760px,calc(100dvh-40px))]">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              {title}
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              ข้อมูลนี้จะถูกบันทึกไว้ในบัญชีของคุณ
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"
          >
            <FaTimes />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {children}
        </div>

        <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-white px-5 py-3 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={
              isSaving
            }
            className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-600"
          >
            ยกเลิก
          </button>

          <button
            type="submit"
            form={formId}
            disabled={
              isSaving
            }
            className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50"
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
  label,
  right,
  children,
}: {
  label: string;
  right?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label className="text-sm font-bold text-slate-700">
          {label}
        </label>

        {right && (
          <span className="text-xs font-bold text-slate-400">
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
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-bold text-slate-700">
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
                className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
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
            className={`${inputClass} min-w-0 flex-1`}
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
            className="px-2 text-xs font-bold text-slate-500"
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
  count: number;
  buttonText: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-2xl font-black text-slate-900">
          {title}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          มีทั้งหมด {count} รายการ
        </p>
      </div>

      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white"
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
    <div className="mt-6 flex min-h-[300px] flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-slate-300 bg-white">
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
    <div className="mt-8 flex min-h-[300px] items-center justify-center rounded-[24px] border border-slate-200 bg-white">
      <p className="text-sm text-slate-500">
        {text}
      </p>
    </div>
  );
}

function IconButton({
  children,
  danger = false,
  label,
  onClick,
}: {
  children: React.ReactNode;
  danger?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`flex h-9 w-9 items-center justify-center rounded-lg border ${
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
    <div className="mt-4 flex flex-wrap gap-2">
      {tags.map(
        (tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700"
          >
            <FaTag />
            {tag.name}
          </span>
        )
      )}
    </div>
  );
}