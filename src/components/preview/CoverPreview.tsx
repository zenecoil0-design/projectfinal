"use client";

import { useCoverStore } from "@/store/useCoverStore";
import { useProfileStore } from "@/store/useProfileStore";

export default function CoverPreview() {
  const coverStore = useCoverStore();
  const profileStore = useProfileStore();

  return (
    <div className="bg-white w-[210mm] min-h-[297mm] shadow-2xl rounded-sm relative overflow-hidden flex flex-col items-center justify-between p-16 mx-auto my-auto border border-slate-300">
      
      {/* 1. รูปภาพพื้นหลังหน้าปก */}
      {coverStore.coverImage && (
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img
            src={coverStore.coverImage}
            alt="Cover Background"
            className="w-full h-full object-cover opacity-20"
          />
        </div>
      )}

      {/* 2. เนื้อหาหน้าปก */}
      <div className="z-10 flex flex-col items-center justify-between h-full w-full py-10 my-auto">
        
        {/* ส่วนหัว: หัวข้อ Portfolio */}
        <h1 className="text-6xl font-extrabold text-slate-800 tracking-widest uppercase text-center mt-10">
          {coverStore.portfolioTitle || "PORTFOLIO"}
        </h1>

        {/* ส่วนกลาง: รูปโปรไฟล์ในกรอบวงกลม */}
        <div className="w-56 h-56 rounded-full border-4 border-slate-200 shadow-md overflow-hidden bg-slate-100 flex items-center justify-center my-auto relative">
          {profileStore.profileImage ? (
            <img 
              src={profileStore.profileImage} 
              alt="Profile" 
              className="w-full h-full object-cover" 
            />
          ) : (
            <span className="text-slate-400 text-sm font-semibold">รูปโปรไฟล์</span>
          )}
        </div>

        {/* ส่วนท้าย: ชื่อ-สกุล และ ชื่อโรงเรียน */}
        <div className="flex flex-col items-center gap-3 text-center mb-10">
          <h2 className="text-3xl font-bold text-slate-700">
            {profileStore.firstName || profileStore.lastName 
              ? `${profileStore.firstName} ${profileStore.lastName}` 
              : "ชื่อ - นามสกุล"}
          </h2>
          
          <div className="h-1 w-20 bg-blue-500 rounded-full"></div>
          
          <h3 className="text-xl font-semibold text-slate-500">
            {coverStore.schoolName || "ชื่อโรงเรียน"}
          </h3>
        </div>

      </div>
    </div>
  );
}