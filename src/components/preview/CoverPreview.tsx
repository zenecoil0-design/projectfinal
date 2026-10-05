"use client";

import { useCoverStore } from "@/store/useCoverStore";
import { useProfileStore } from "@/store/useProfileStore";
import A4Page from "@/components/preview/A4Page";

export default function CoverPreview() {
  const coverStore = useCoverStore();
  const profileStore = useProfileStore();

  return (
    <A4Page className="flex flex-col items-center justify-between p-16">
      {coverStore.coverImage && (
        <div className="pointer-events-none absolute inset-0 z-0">
          <img
            src={coverStore.coverImage}
            alt="Cover Background"
            className="h-full w-full object-cover opacity-20"
          />
        </div>
      )}

      <div className="z-10 flex h-full w-full flex-col items-center justify-between py-10">
        <h1 className="mt-10 max-w-full break-words text-center text-6xl font-extrabold uppercase tracking-widest text-slate-800">
          {coverStore.portfolioTitle || "PORTFOLIO"}
        </h1>

        <div className="relative flex h-56 w-56 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-slate-200 bg-slate-100 shadow-md">
          {profileStore.profileImage ? (
            <img
              src={profileStore.profileImage}
              alt="Profile"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-sm font-semibold text-slate-400">
              รูปโปรไฟล์
            </span>
          )}
        </div>

        <div className="mb-10 flex max-w-full flex-col items-center gap-3 text-center">
          <h2 className="max-w-full break-words text-3xl font-bold text-slate-700">
            {profileStore.firstName || profileStore.lastName
              ? `${profileStore.firstName} ${profileStore.lastName}`
              : "ชื่อ - นามสกุล"}
          </h2>
          <div className="h-1 w-20 rounded-full bg-blue-500" />
          <h3 className="max-w-full break-words text-xl font-semibold text-slate-500">
            {coverStore.schoolName || "ชื่อโรงเรียน"}
          </h3>
        </div>
      </div>
    </A4Page>
  );
}
