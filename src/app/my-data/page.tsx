"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  FaArrowLeft,
  FaBook,
  FaCertificate,
  FaEdit,
  FaImage,
  FaPlus,
  FaTag,
  FaTrash,
  FaTrophy,
  FaTimes,
} from "react-icons/fa";

import { createClient } from "@/lib/supabase/client";

import EducationLibrary from "@/components/my-data/EducationLibrary";
import CertificateLibrary from "@/components/my-data/CertificateLibrary";

type TabType =
  | "education"
  | "activity"
  | "certificate";

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

const MAX_ACTIVITY_IMAGES = 4;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export default function MyDataPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const activityImageInputRef =
    useRef<HTMLInputElement | null>(null);

  const [activeTab, setActiveTab] =
    useState<TabType>("activity");

  const [userId, setUserId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [tags, setTags] = useState<UserTag[]>([]);
  const [activities, setActivities] =
    useState<Activity[]>([]);

  const [
    showActivityForm,
    setShowActivityForm,
  ] = useState(false);

  const [
    editingActivityId,
    setEditingActivityId,
  ] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] =
    useState("");
  const [activityDate, setActivityDate] =
    useState("");
  const [organization, setOrganization] =
    useState("");

  const [
    existingActivityImages,
    setExistingActivityImages,
  ] = useState<ActivityImage[]>([]);

  const [
    removedActivityImageIds,
    setRemovedActivityImageIds,
  ] = useState<string[]>([]);

  const [
    activityImageFiles,
    setActivityImageFiles,
  ] = useState<File[]>([]);

  const [
    activityImagePreviews,
    setActivityImagePreviews,
  ] = useState<string[]>([]);

  const [
    selectedTagIds,
    setSelectedTagIds,
  ] = useState<string[]>([]);

  const [newTagName, setNewTagName] = useState("");
  const [isAddingTag, setIsAddingTag] =
    useState(false);

  useEffect(() => {
    const initialize = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.replace("/login?next=/my-data");
        return;
      }

      setUserId(user.id);

      await loadLibraryData(user.id);

      setIsLoading(false);
    };

    initialize();
  }, [router, supabase]);

  const loadLibraryData = async (
    currentUserId: string
  ) => {
    const [
      { data: tagData, error: tagError },
      {
        data: activityData,
        error: activityError,
      },
      {
        data: activityTagData,
        error: activityTagError,
      },
      {
        data: activityImageData,
        error: activityImageError,
      },
    ] = await Promise.all([
      supabase
        .from("user_tags")
        .select("id, name")
        .eq("user_id", currentUserId)
        .order("name", {
          ascending: true,
        }),

      supabase
        .from("user_library_activities")
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
        .eq("user_id", currentUserId)
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("user_library_activity_tags")
        .select("activity_id, tag_id"),

      supabase
        .from("user_library_activity_images")
        .select(
          "id, activity_id, image_url, sort_order"
        )
        .order("sort_order", {
          ascending: true,
        }),
    ]);

    if (tagError) {
      console.error("Load tags error:", tagError);
    }

    if (activityError) {
      console.error(
        "Load activities error:",
        activityError
      );
    }

    if (activityTagError) {
      console.error(
        "Load activity tags error:",
        activityTagError
      );
    }

    if (activityImageError) {
      console.error(
        "Load activity images error:",
        activityImageError
      );
    }

    const cleanTags: UserTag[] =
      tagData ?? [];

    const cleanActivities: ActivityRow[] =
      activityData ?? [];

    const cleanActivityTags: ActivityTagRow[] =
      activityTagData ?? [];

    const cleanActivityImages: ActivityImageRow[] =
      activityImageData ?? [];

    setTags(cleanTags);

    setActivities(
      cleanActivities.map((activity) => ({
        ...activity,

        tagIds: cleanActivityTags
          .filter(
            (item) =>
              item.activity_id === activity.id
          )
          .map((item) => item.tag_id),

        images: cleanActivityImages
          .filter(
            (image) =>
              image.activity_id === activity.id
          )
          .map((image) => ({
            id: image.id,
            image_url: image.image_url,
            sort_order: image.sort_order,
          })),
      }))
    );
  };

  const clearNewActivityImages = () => {
    setActivityImageFiles([]);
    setActivityImagePreviews([]);

    if (activityImageInputRef.current) {
      activityImageInputRef.current.value = "";
    }
  };

  const resetActivityForm = () => {
    setEditingActivityId(null);

    setTitle("");
    setDescription("");
    setActivityDate("");
    setOrganization("");

    setExistingActivityImages([]);
    setRemovedActivityImageIds([]);

    clearNewActivityImages();

    setSelectedTagIds([]);

    setNewTagName("");
    setIsAddingTag(false);

    setShowActivityForm(false);
  };

  const openCreateActivity = () => {
    resetActivityForm();
    setShowActivityForm(true);
  };

  const openEditActivity = (
    activity: Activity
  ) => {
    clearNewActivityImages();

    setEditingActivityId(activity.id);

    setTitle(activity.title);
    setDescription(activity.description);

    setActivityDate(
      activity.activity_date ?? ""
    );

    setOrganization(
      activity.organization ?? ""
    );

    setExistingActivityImages(
      [...activity.images].sort(
        (a, b) =>
          a.sort_order - b.sort_order
      )
    );

    setRemovedActivityImageIds([]);

    setSelectedTagIds(activity.tagIds);

    setShowActivityForm(true);
  };

  const canDecodeImage = async (
    file: File
  ): Promise<boolean> => {
    try {
      const bitmap =
        await createImageBitmap(file);

      bitmap.close();

      return true;
    } catch {
      return false;
    }
  };

  const fileToDataUrl = (
    file: File
  ): Promise<string | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (
          typeof reader.result === "string"
        ) {
          resolve(reader.result);
          return;
        }

        resolve(null);
      };

      reader.onerror = () => {
        resolve(null);
      };

      reader.readAsDataURL(file);
    });
  };

  const handleActivityImagesChange =
    async (
      event: React.ChangeEvent<HTMLInputElement>
    ) => {
      const files = Array.from(
        event.target.files ?? []
      );

      event.target.value = "";

      if (files.length === 0) {
        return;
      }

      const currentImageCount =
        existingActivityImages.length +
        activityImageFiles.length;

      const remainingSlots =
        MAX_ACTIVITY_IMAGES -
        currentImageCount;

      if (remainingSlots <= 0) {
        alert(
          "เพิ่มรูปได้สูงสุด 4 รูปต่อรายการ"
        );
        return;
      }

      const validFiles: File[] = [];

      for (const file of files) {
        if (
          !ALLOWED_IMAGE_TYPES.includes(
            file.type
          )
        ) {
          alert(
            `${file.name}\nรองรับเฉพาะ JPG, PNG และ WEBP`
          );

          continue;
        }

        if (file.size > MAX_IMAGE_SIZE) {
          alert(
            `${file.name}\nมีขนาดเกิน 5MB`
          );

          continue;
        }

        validFiles.push(file);
      }

      const filesWithinLimit =
        validFiles.slice(
          0,
          remainingSlots
        );

      if (
        validFiles.length >
        remainingSlots
      ) {
        alert(
          `เพิ่มได้อีก ${remainingSlots} รูปเท่านั้น\nสูงสุด 4 รูปต่อรายการ`
        );
      }

      const acceptedFiles: File[] = [];
      const acceptedPreviews: string[] = [];

      for (
        const file of filesWithinLimit
      ) {
        const decodable =
          await canDecodeImage(file);

        if (!decodable) {
          alert(
            `${file.name}\nไม่สามารถอ่านรูปนี้ได้`
          );

          continue;
        }

        const preview =
          await fileToDataUrl(file);

        if (!preview) {
          continue;
        }

        acceptedFiles.push(file);
        acceptedPreviews.push(preview);
      }

      setActivityImageFiles(
        (current) => [
          ...current,
          ...acceptedFiles,
        ]
      );

      setActivityImagePreviews(
        (current) => [
          ...current,
          ...acceptedPreviews,
        ]
      );
    };

  const removeNewActivityImage = (
    index: number
  ) => {
    setActivityImageFiles(
      (current) =>
        current.filter(
          (_, itemIndex) =>
            itemIndex !== index
        )
    );

    setActivityImagePreviews(
      (current) =>
        current.filter(
          (_, itemIndex) =>
            itemIndex !== index
        )
    );
  };

  const removeExistingActivityImage = (
    image: ActivityImage
  ) => {
    setExistingActivityImages(
      (current) =>
        current.filter(
          (item) =>
            item.id !== image.id
        )
    );

    setRemovedActivityImageIds(
      (current) => {
        if (current.includes(image.id)) {
          return current;
        }

        return [
          ...current,
          image.id,
        ];
      }
    );
  };

  const toggleTag = (
    tagId: string
  ) => {
    setSelectedTagIds(
      (current) => {
        if (
          current.includes(tagId)
        ) {
          return current.filter(
            (id) => id !== tagId
          );
        }

        return [
          ...current,
          tagId,
        ];
      }
    );
  };

  const handleAddTag = async () => {
    const cleanName =
      newTagName.trim();

    if (!cleanName || !userId) {
      return;
    }

    const existingTag =
      tags.find(
        (tag) =>
          tag.name.toLowerCase() ===
          cleanName.toLowerCase()
      );

    if (existingTag) {
      if (
        !selectedTagIds.includes(
          existingTag.id
        )
      ) {
        setSelectedTagIds(
          (current) => [
            ...current,
            existingTag.id,
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
        name: cleanName,
      })
      .select("id, name")
      .single();

    if (error) {
      console.error(
        "Create tag error:",
        error
      );

      alert(
        "ไม่สามารถเพิ่ม Tag ได้"
      );

      return;
    }

    setTags((current) =>
      [...current, data].sort(
        (a, b) =>
          a.name.localeCompare(
            b.name,
            "th"
          )
      )
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

  const getStoragePathFromPublicUrl = (
    publicUrl: string
  ) => {
    try {
      const url =
        new URL(publicUrl);

      const marker =
        "/storage/v1/object/public/portfolio-images/";

      const markerIndex =
        url.pathname.indexOf(
          marker
        );

      if (markerIndex === -1) {
        return null;
      }

      return decodeURIComponent(
        url.pathname.slice(
          markerIndex +
            marker.length
        )
      );
    } catch {
      return null;
    }
  };

  const uploadActivityImages = async (
    activityId: string
  ) => {
    if (
      activityImageFiles.length === 0
    ) {
      return;
    }

    const uploadedRows: {
      activity_id: string;
      image_url: string;
      sort_order: number;
    }[] = [];

    const uploadedPaths: string[] = [];

    try {
      for (
        let index = 0;
        index <
        activityImageFiles.length;
        index++
      ) {
        const file =
          activityImageFiles[index];

        const extension =
          file.name
            .split(".")
            .pop()
            ?.toLowerCase() ||
          "jpg";

        const fileName =
          `activity-${Date.now()}-${crypto.randomUUID()}.${extension}`;

        const filePath =
          `users/${userId}/activities/${activityId}/${fileName}`;

        const {
          error: uploadError,
        } =
          await supabase.storage
            .from(
              "portfolio-images"
            )
            .upload(
              filePath,
              file,
              {
                cacheControl:
                  "3600",

                upsert: false,

                contentType:
                  file.type,
              }
            );

        if (uploadError) {
          throw uploadError;
        }

        uploadedPaths.push(
          filePath
        );

        const {
          data: {
            publicUrl,
          },
        } =
          supabase.storage
            .from(
              "portfolio-images"
            )
            .getPublicUrl(
              filePath
            );

        uploadedRows.push({
          activity_id:
            activityId,

          image_url:
            publicUrl,

          sort_order:
            existingActivityImages.length +
            index,
        });
      }

      const {
        error:
          imageInsertError,
      } = await supabase
        .from(
          "user_library_activity_images"
        )
        .insert(
          uploadedRows
        );

      if (
        imageInsertError
      ) {
        throw imageInsertError;
      }
    } catch (error) {
      if (
        uploadedPaths.length > 0
      ) {
        await supabase.storage
          .from(
            "portfolio-images"
          )
          .remove(
            uploadedPaths
          );
      }

      throw error;
    }
  };

  const deleteRemovedActivityImages =
    async () => {
      if (
        removedActivityImageIds.length ===
        0
      ) {
        return;
      }

      const imagesToDelete =
        activities
          .flatMap(
            (activity) =>
              activity.images
          )
          .filter(
            (image) =>
              removedActivityImageIds.includes(
                image.id
              )
          );

      const {
        error: deleteError,
      } =
        await supabase
          .from(
            "user_library_activity_images"
          )
          .delete()
          .in(
            "id",
            removedActivityImageIds
          );

      if (deleteError) {
        throw deleteError;
      }

      const storagePaths =
        imagesToDelete
          .map((image) =>
            getStoragePathFromPublicUrl(
              image.image_url
            )
          )
          .filter(
            (
              path
            ): path is string =>
              Boolean(path)
          );

      if (
        storagePaths.length > 0
      ) {
        await supabase.storage
          .from(
            "portfolio-images"
          )
          .remove(
            storagePaths
          );
      }
    };

  const handleSaveActivity = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!userId) {
      return;
    }

    if (!title.trim()) {
      alert(
        "กรุณากรอกชื่อผลงานหรือกิจกรรม"
      );

      return;
    }

    setIsSaving(true);

    try {
      let activityId =
        editingActivityId;

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

      if (editingActivityId) {
        const { error } =
          await supabase
            .from(
              "user_library_activities"
            )
            .update(payload)
            .eq(
              "id",
              editingActivityId
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
              user_id: userId,
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
          "ไม่พบ Activity ID"
        );
      }

      await deleteRemovedActivityImages();

      await uploadActivityImages(
        activityId
      );

      const {
        error:
          deleteTagError,
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

      if (deleteTagError) {
        throw deleteTagError;
      }

      if (
        selectedTagIds.length > 0
      ) {
        const {
          error:
            insertTagError,
        } =
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

        if (insertTagError) {
          throw insertTagError;
        }
      }

      await loadLibraryData(
        userId
      );

      resetActivityForm();
    } catch (error) {
      console.error(
        "Save activity error:",
        error
      );

      alert(
        "ไม่สามารถบันทึกผลงานหรือกิจกรรมได้"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteActivity = async (
    activity: Activity
  ) => {
    const confirmed =
      window.confirm(
        "ต้องการลบผลงานหรือกิจกรรมนี้ออกจากคลังใช่หรือไม่?"
      );

    if (!confirmed) {
      return;
    }

    const storagePaths =
      activity.images
        .map((image) =>
          getStoragePathFromPublicUrl(
            image.image_url
          )
        )
        .filter(
          (
            path
          ): path is string =>
            Boolean(path)
        );

    if (
      storagePaths.length > 0
    ) {
      await supabase.storage
        .from(
          "portfolio-images"
        )
        .remove(
          storagePaths
        );
    }

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
      console.error(
        "Delete activity error:",
        error
      );

      alert(
        "ไม่สามารถลบข้อมูลได้"
      );

      return;
    }

    setActivities(
      (current) =>
        current.filter(
          (item) =>
            item.id !==
            activity.id
        )
    );
  };

  const getTagsForActivity = (
    activity: Activity
  ) =>
    tags.filter(
      (tag) =>
        activity.tagIds.includes(
          tag.id
        )
    );

  const currentActivityImageCount =
    existingActivityImages.length +
    activityImageFiles.length;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-4 text-sm font-medium text-slate-500">
            กำลังโหลดคลังข้อมูล...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* HEADER */}

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center px-5 md:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            >
              <FaArrowLeft />
            </Link>

            <div>
              <h1 className="text-lg font-black text-slate-900">
                คลังข้อมูลของฉัน
              </h1>

              <p className="text-xs text-slate-400">
                บันทึกข้อมูลครั้งเดียว แล้วนำไปใช้กับ Portfolio หลายเล่ม
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN */}

      <main className="mx-auto w-full max-w-[1500px] px-5 py-8 md:px-8">
        <section className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-800 px-7 py-8 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-200">
            My Data Library
          </p>

          <h2 className="mt-3 text-3xl font-black">
            เก็บข้อมูลของคุณไว้ใช้ซ้ำ
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
            เพิ่มข้อมูลการศึกษา ผลงาน กิจกรรม และเกียรติบัตรไว้ในบัญชีของคุณ
            แล้วเลือกเฉพาะรายการที่ต้องการเมื่อสร้าง Portfolio
          </p>
        </section>

        {/* TABS */}

        <section className="mt-8">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <TabButton
              active={
                activeTab ===
                "education"
              }
              icon={<FaBook />}
              title="ประวัติการศึกษา"
              onClick={() =>
                setActiveTab(
                  "education"
                )
              }
            />

            <TabButton
              active={
                activeTab ===
                "activity"
              }
              icon={<FaTrophy />}
              title="ผลงานและกิจกรรม"
              onClick={() =>
                setActiveTab(
                  "activity"
                )
              }
            />

            <TabButton
              active={
                activeTab ===
                "certificate"
              }
              icon={
                <FaCertificate />
              }
              title="เกียรติบัตร"
              onClick={() =>
                setActiveTab(
                  "certificate"
                )
              }
            />
          </div>
        </section>

        {/* EDUCATION */}

        {activeTab ===
          "education" && (
          <EducationLibrary />
        )}

        {/* ACTIVITY */}

        {activeTab ===
          "activity" && (
          <section className="mt-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  ผลงานและกิจกรรม
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  มีทั้งหมด{" "}
                  {
                    activities.length
                  }{" "}
                  รายการ
                </p>
              </div>

              <button
                type="button"
                onClick={
                  openCreateActivity
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
              >
                <FaPlus />
                เพิ่มผลงานหรือกิจกรรม
              </button>
            </div>

            {activities.length ===
            0 ? (
              <div className="mt-6 flex min-h-[320px] flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-slate-300 bg-white px-6 text-center">
                <FaTrophy className="text-3xl text-blue-600" />

                <h3 className="mt-4 text-lg font-black">
                  ยังไม่มีผลงานหรือกิจกรรม
                </h3>
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {activities.map(
                  (
                    activity
                  ) => {
                    const activityTags =
                      getTagsForActivity(
                        activity
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
                                  className="h-44 overflow-hidden bg-slate-100"
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
                            <div className="min-w-0">
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
                              <button
                                type="button"
                                onClick={() =>
                                  openEditActivity(
                                    activity
                                  )
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500"
                              >
                                <FaEdit />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteActivity(
                                    activity
                                  )
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-500"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </div>

                          {activity.description && (
                            <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-600">
                              {
                                activity.description
                              }
                            </p>
                          )}

                          {activityTags.length >
                            0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {activityTags.map(
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
        )}

        {/* CERTIFICATE */}

        {activeTab ===
          "certificate" && (
          <CertificateLibrary />
        )}
      </main>

      {/* ACTIVITY MODAL */}

      {showActivityForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/60 p-4 backdrop-blur-sm">
          <div
            className="
              flex
              h-[calc(100dvh-32px)]
              w-full
              max-w-2xl
              flex-col
              overflow-hidden
              rounded-[24px]
              bg-white
              shadow-2xl
              sm:h-[min(760px,calc(100dvh-40px))]
            "
          >
            {/* MODAL HEADER */}

            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  {editingActivityId
                    ? "แก้ไขผลงานหรือกิจกรรม"
                    : "เพิ่มผลงานหรือกิจกรรม"}
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  ข้อมูลนี้จะถูกบันทึกไว้ในบัญชีของคุณ
                </p>
              </div>

              <button
                type="button"
                onClick={
                  resetActivityForm
                }
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
              >
                <FaTimes />
              </button>
            </div>

            {/* FORM BODY */}

            <form
              id="activity-form"
              onSubmit={
                handleSaveActivity
              }
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
            >
              <div className="space-y-4 px-5 py-4 sm:px-6">
                {/* TITLE */}

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">
                    ชื่อผลงาน / กิจกรรม *
                  </label>

                  <input
                    type="text"
                    value={title}
                    onChange={(
                      event
                    ) =>
                      setTitle(
                        event.target
                          .value
                      )
                    }
                    required
                    placeholder="เช่น การแข่งขันเขียนโปรแกรม"
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                {/* DESCRIPTION */}

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">
                    รายละเอียด
                  </label>

                  <textarea
                    value={
                      description
                    }
                    onChange={(
                      event
                    ) =>
                      setDescription(
                        event.target
                          .value
                      )
                    }
                    rows={3}
                    placeholder="รายละเอียดผลงานหรือกิจกรรม"
                    className="w-full resize-none rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                {/* IMAGES */}

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-bold text-slate-700">
                      รูปภาพผลงาน / กิจกรรม
                    </label>

                    <span
                      className={`text-xs font-bold ${
                        currentActivityImageCount >=
                        4
                          ? "text-red-500"
                          : "text-slate-400"
                      }`}
                    >
                      {
                        currentActivityImageCount
                      }{" "}
                      / 4 รูป
                    </span>
                  </div>

                  <input
                    ref={
                      activityImageInputRef
                    }
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    onChange={
                      handleActivityImagesChange
                    }
                    className="hidden"
                  />

                  <button
                    type="button"
                    disabled={
                      currentActivityImageCount >=
                      4
                    }
                    onClick={() =>
                      activityImageInputRef.current?.click()
                    }
                    className="mt-2 inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <FaImage />

                    {currentActivityImageCount >=
                    4
                      ? "ครบ 4 รูปแล้ว"
                      : "เพิ่มรูปภาพ"}
                  </button>

                  <p className="mt-1.5 text-xs text-slate-400">
                    JPG, PNG หรือ WEBP ไม่เกิน 5MB ต่อรูป
                  </p>

                  {(existingActivityImages.length >
                    0 ||
                    activityImagePreviews.length >
                      0) && (
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {existingActivityImages.map(
                        (
                          image
                        ) => (
                          <ActivityThumbnail
                            key={
                              image.id
                            }
                            src={
                              image.image_url
                            }
                            onRemove={() =>
                              removeExistingActivityImage(
                                image
                              )
                            }
                          />
                        )
                      )}

                      {activityImagePreviews.map(
                        (
                          preview,
                          index
                        ) => (
                          <ActivityThumbnail
                            key={`new-${index}`}
                            src={
                              preview
                            }
                            onRemove={() =>
                              removeNewActivityImage(
                                index
                              )
                            }
                          />
                        )
                      )}
                    </div>
                  )}
                </div>

                {/* DATE + ORGANIZATION */}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-slate-700">
                      วันที่
                    </label>

                    <input
                      type="date"
                      value={
                        activityDate
                      }
                      onChange={(
                        event
                      ) =>
                        setActivityDate(
                          event.target
                            .value
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-slate-700">
                      หน่วยงาน / สถานที่
                    </label>

                    <input
                      type="text"
                      value={
                        organization
                      }
                      onChange={(
                        event
                      ) =>
                        setOrganization(
                          event.target
                            .value
                        )
                      }
                      placeholder="ถ้ามี"
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
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
                        setIsAddingTag(
                          true
                        )
                      }
                      className="text-xs font-bold text-blue-600 hover:text-blue-700"
                    >
                      + สร้าง Tag ใหม่
                    </button>
                  </div>

                  {tags.length >
                    0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {tags.map(
                        (
                          tag
                        ) => {
                          const selected =
                            selectedTagIds.includes(
                              tag.id
                            );

                          return (
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
                              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                                selected
                                  ? "border-blue-600 bg-blue-600 text-white"
                                  : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"
                              }`}
                            >
                              {selected
                                ? "✓ "
                                : ""}

                              {
                                tag.name
                              }
                            </button>
                          );
                        }
                      )}
                    </div>
                  )}

                  {isAddingTag && (
                    <div className="mt-3 flex gap-2 rounded-xl bg-slate-50 p-3">
                      <input
                        type="text"
                        value={
                          newTagName
                        }
                        onChange={(
                          event
                        ) =>
                          setNewTagName(
                            event.target
                              .value
                          )
                        }
                        placeholder="ชื่อ Tag"
                        className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none"
                      />

                      <button
                        type="button"
                        onClick={
                          handleAddTag
                        }
                        className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white"
                      >
                        เพิ่ม
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setNewTagName(
                            ""
                          );

                          setIsAddingTag(
                            false
                          );
                        }}
                        className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  )}
                </div>

                {/* bottom breathing room */}

                <div className="h-2" />
              </div>
            </form>

            {/* MODAL FOOTER */}

            <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-white px-5 py-3 sm:px-6">
              <button
                type="button"
                onClick={
                  resetActivityForm
                }
                disabled={
                  isSaving
                }
                className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                ยกเลิก
              </button>

              <button
                type="submit"
                form="activity-form"
                disabled={
                  isSaving
                }
                className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving
                  ? "กำลังบันทึก..."
                  : editingActivityId
                  ? "บันทึกการแก้ไข"
                  : "เพิ่มลงคลัง"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActivityThumbnail({
  src,
  onRemove,
}: {
  src: string;
  onRemove: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* รูปภาพ */}
      <div className="h-24 w-full overflow-hidden bg-slate-100">
        <img
          src={src}
          alt="รูปผลงานหรือกิจกรรม"
          className="h-full w-full object-cover"
        />
      </div>

      {/* ปุ่มลบ */}
      <button
        type="button"
        onClick={onRemove}
        className="
          flex
          w-full
          items-center
          justify-center
          gap-1.5
          bg-red-600
          px-2
          py-2
          text-xs
          font-bold
          text-white
          transition
          hover:bg-red-700
          active:bg-red-800
        "
      >
        <FaTrash className="text-[11px]" />
        ลบรูป
      </button>
    </div>
  );
}

function TabButton({
  active,
  icon,
  title,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
        active
          ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-100"
          : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"
      }`}
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          active
            ? "bg-white/15"
            : "bg-slate-100"
        }`}
      >
        {icon}
      </div>

      <span className="font-bold">
        {title}
      </span>
    </button>
  );
}