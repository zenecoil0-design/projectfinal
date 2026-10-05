"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  FaArrowLeft,
  FaBook,
  FaCertificate,
  FaEdit,
  FaPlus,
  FaTag,
  FaTrash,
  FaTrophy,
  FaTimes,
} from "react-icons/fa";

import { createClient } from "@/lib/supabase/client";

type TabType = "education" | "activity" | "certificate";

type UserTag = {
  id: string;
  name: string;
};

type Activity = {
  id: string;
  title: string;
  description: string;
  activity_date: string | null;
  organization: string | null;
  created_at: string;
  tagIds: string[];
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

export default function MyDataPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [activeTab, setActiveTab] = useState<TabType>("activity");

  const [userId, setUserId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [tags, setTags] = useState<UserTag[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  const [showActivityForm, setShowActivityForm] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(
    null
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [activityDate, setActivityDate] = useState("");
  const [organization, setOrganization] = useState("");

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
        router.replace("/login?next=/my-data");
        return;
      }

      setUserId(user.id);

      await loadLibraryData(user.id);

      setIsLoading(false);
    };

    initialize();
  }, [router, supabase]);

  const loadLibraryData = async (currentUserId: string) => {
    const [
      { data: tagData, error: tagError },
      { data: activityData, error: activityError },
      { data: activityTagData, error: activityTagError },
    ] = await Promise.all([
      supabase
        .from("user_tags")
        .select("id, name")
        .eq("user_id", currentUserId)
        .order("name", { ascending: true }),

      supabase
        .from("user_library_activities")
        .select(
          "id, title, description, activity_date, organization, created_at"
        )
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false }),

      supabase
        .from("user_library_activity_tags")
        .select("activity_id, tag_id"),
    ]);

    if (tagError) {
      console.error("Load tags error:", tagError);
    }

    if (activityError) {
      console.error("Load activities error:", activityError);
    }

   if (activityTagError) {
  console.error("Load activity tags error:", {
    message: activityTagError.message,
    details: activityTagError.details,
    hint: activityTagError.hint,
    code: activityTagError.code,
  });
}
    const cleanTags: UserTag[] = tagData ?? [];
    const cleanActivities: ActivityRow[] = activityData ?? [];
    const cleanActivityTags: ActivityTagRow[] = activityTagData ?? [];

    setTags(cleanTags);

    setActivities(
      cleanActivities.map((activity) => ({
        ...activity,

        tagIds: cleanActivityTags
          .filter((item) => item.activity_id === activity.id)
          .map((item) => item.tag_id),
      }))
    );
  };

  const resetActivityForm = () => {
    setEditingActivityId(null);

    setTitle("");
    setDescription("");
    setActivityDate("");
    setOrganization("");

    setSelectedTagIds([]);

    setShowActivityForm(false);
  };

  const openCreateActivity = () => {
    resetActivityForm();

    setShowActivityForm(true);
  };

  const openEditActivity = (activity: Activity) => {
    setEditingActivityId(activity.id);

    setTitle(activity.title);
    setDescription(activity.description);
    setActivityDate(activity.activity_date ?? "");
    setOrganization(activity.organization ?? "");

    setSelectedTagIds(activity.tagIds);

    setShowActivityForm(true);
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
      (tag) => tag.name.toLowerCase() === cleanName.toLowerCase()
    );

    if (existingTag) {
      if (!selectedTagIds.includes(existingTag.id)) {
        setSelectedTagIds((current) => [...current, existingTag.id]);
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

    setSelectedTagIds((current) => [...current, data.id]);

    setNewTagName("");
    setIsAddingTag(false);
  };

  const handleSaveActivity = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!userId) return;

    if (!title.trim()) {
      alert("กรุณากรอกชื่อผลงานหรือกิจกรรม");

      return;
    }

    setIsSaving(true);

    try {
      let activityId = editingActivityId;

      if (editingActivityId) {
        const { error } = await supabase
          .from("user_library_activities")
          .update({
            title: title.trim(),
            description: description.trim(),
            activity_date: activityDate || null,
            organization: organization.trim() || null,
          })
          .eq("id", editingActivityId)
          .eq("user_id", userId);

        if (error) {
          throw error;
        }
      } else {
        const { data, error } = await supabase
          .from("user_library_activities")
          .insert({
            user_id: userId,
            title: title.trim(),
            description: description.trim(),
            activity_date: activityDate || null,
            organization: organization.trim() || null,
          })
          .select("id")
          .single();

        if (error) {
          throw error;
        }

        activityId = data.id;
      }

      if (!activityId) {
        throw new Error("ไม่พบ Activity ID");
      }

      const { error: deleteTagError } = await supabase
        .from("user_library_activity_tags")
        .delete()
        .eq("activity_id", activityId);

      if (deleteTagError) {
        throw deleteTagError;
      }

      if (selectedTagIds.length > 0) {
        const { error: insertTagError } = await supabase
          .from("user_library_activity_tags")
          .insert(
            selectedTagIds.map((tagId) => ({
              activity_id: activityId,
              tag_id: tagId,
            }))
          );

        if (insertTagError) {
          throw insertTagError;
        }
      }

      await loadLibraryData(userId);

      resetActivityForm();
    } catch (error) {
      console.error("Save activity error:", error);

      alert("ไม่สามารถบันทึกผลงานหรือกิจกรรมได้");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    const confirmed = window.confirm(
      "ต้องการลบผลงานหรือกิจกรรมนี้ออกจากคลังใช่หรือไม่?"
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("user_library_activities")
      .delete()
      .eq("id", activityId)
      .eq("user_id", userId);

    if (error) {
      console.error("Delete activity error:", error);

      alert("ไม่สามารถลบข้อมูลได้");

      return;
    }

    setActivities((current) =>
      current.filter((activity) => activity.id !== activityId)
    );
  };

  const getTagsForActivity = (activity: Activity) => {
    return tags.filter((tag) => activity.tagIds.includes(tag.id));
  };

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
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-5 md:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
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

      <main className="mx-auto w-full max-w-[1500px] px-5 py-8 md:px-8">
        {/* INTRO */}
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
              active={activeTab === "education"}
              icon={<FaBook />}
              title="ประวัติการศึกษา"
              onClick={() => setActiveTab("education")}
            />

            <TabButton
              active={activeTab === "activity"}
              icon={<FaTrophy />}
              title="ผลงานและกิจกรรม"
              onClick={() => setActiveTab("activity")}
            />

            <TabButton
              active={activeTab === "certificate"}
              icon={<FaCertificate />}
              title="เกียรติบัตร"
              onClick={() => setActiveTab("certificate")}
            />
          </div>
        </section>

        {/* ACTIVITY */}
        {activeTab === "activity" && (
          <section className="mt-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  ผลงานและกิจกรรม
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  มีทั้งหมด {activities.length} รายการ
                </p>
              </div>

              <button
                type="button"
                onClick={openCreateActivity}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
              >
                <FaPlus />
                เพิ่มผลงานหรือกิจกรรม
              </button>
            </div>

            {activities.length === 0 ? (
              <div className="mt-6 flex min-h-[320px] flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-slate-300 bg-white px-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-xl text-blue-600">
                  <FaTrophy />
                </div>

                <h3 className="mt-5 text-lg font-black text-slate-900">
                  ยังไม่มีผลงานหรือกิจกรรม
                </h3>

                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                  เพิ่มข้อมูลไว้ในคลัง แล้วภายหลังคุณจะสามารถเลือกว่าจะนำรายการใดไปใส่ใน Portfolio
                </p>
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {activities.map((activity) => {
                  const activityTags = getTagsForActivity(activity);

                  return (
                    <article
                      key={activity.id}
                      className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="break-words text-lg font-black text-slate-900">
                            {activity.title}
                          </h3>

                          {activity.organization && (
                            <p className="mt-1 text-sm font-semibold text-slate-500">
                              {activity.organization}
                            </p>
                          )}
                        </div>

                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => openEditActivity(activity)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                          >
                            <FaEdit />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteActivity(activity.id)
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>

                      {activity.activity_date && (
                        <p className="mt-3 text-xs font-semibold text-slate-400">
                          วันที่ {activity.activity_date}
                        </p>
                      )}

                      {activity.description && (
                        <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-600">
                          {activity.description}
                        </p>
                      )}

                      {activityTags.length > 0 && (
                        <div className="mt-5 flex flex-wrap gap-2">
                          {activityTags.map((tag) => (
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
        )}

        {/* EDUCATION PLACEHOLDER */}
        {activeTab === "education" && (
          <ComingSoon
            title="ประวัติการศึกษา"
            description="ขั้นต่อไปเราจะเชื่อมคลังประวัติการศึกษาเข้ากับฐานข้อมูล"
          />
        )}

        {/* CERTIFICATE PLACEHOLDER */}
        {activeTab === "certificate" && (
          <ComingSoon
            title="เกียรติบัตร"
            description="หลัง Activity ผ่านแล้ว เราจะทำคลังเกียรติบัตรต่อ"
          />
        )}
      </main>

      {/* ACTIVITY FORM MODAL */}
      {showActivityForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-xl font-black text-slate-900">
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
                onClick={resetActivityForm}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
              >
                <FaTimes />
              </button>
            </div>

            <form
              onSubmit={handleSaveActivity}
              className="space-y-5 p-6"
            >
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  ชื่อผลงาน / กิจกรรม *
                </label>

                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="เช่น การแข่งขันเขียนโปรแกรม"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  required
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
                  rows={5}
                  placeholder="อธิบายผลงาน หน้าที่ที่รับผิดชอบ หรือสิ่งที่ได้รับจากกิจกรรม"
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    วันที่
                  </label>

                  <input
                    type="date"
                    value={activityDate}
                    onChange={(event) =>
                      setActivityDate(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    หน่วยงาน / สถานที่
                  </label>

                  <input
                    type="text"
                    value={organization}
                    onChange={(event) =>
                      setOrganization(event.target.value)
                    }
                    placeholder="ถ้ามี"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
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
                    onClick={() => setIsAddingTag(true)}
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
                          onClick={() => toggleTag(tag.id)}
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
                    ยังไม่มี Tag กด “สร้าง Tag ใหม่” เพื่อเริ่มต้น
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
                      placeholder="ชื่อ Tag เช่น Programming"
                      className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />

                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
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
                  onClick={resetActivityForm}
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  ยกเลิก
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving
                    ? "กำลังบันทึก..."
                    : editingActivityId
                    ? "บันทึกการแก้ไข"
                    : "เพิ่มลงคลัง"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
          active ? "bg-white/15" : "bg-slate-100"
        }`}
      >
        {icon}
      </div>

      <span className="font-bold">{title}</span>
    </button>
  );
}

function ComingSoon({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="mt-8 flex min-h-[300px] items-center justify-center rounded-[24px] border border-slate-200 bg-white p-8 text-center">
      <div>
        <h2 className="text-xl font-black text-slate-900">
          {title}
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          {description}
        </p>
      </div>
    </section>
  );
}