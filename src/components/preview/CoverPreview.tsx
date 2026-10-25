"use client";
import Paper, { useTemplate } from "./Paper";

import { useCoverStore } from "@/store/useCoverStore";

export default function CoverPreview() {
  const coverStore = useCoverStore();

  const fullName = [coverStore.firstName.trim(), coverStore.lastName.trim()].filter(Boolean).join(" ");
  const template = useTemplate();
  if (template === "minimal") return <Paper sectionId="cover" data-section="หน้าปก" className="portfolio-page minimal-cover gallery-cover">
    <div className="gallery-cover-photo" aria-label="พื้นที่รูปภาพหน้าปก">
      {coverStore.coverImage ? <img src={coverStore.coverImage} alt="รูปหน้าปก" /> : <span>รูปผู้สมัคร</span>}
    </div>
    <div className="gallery-cover-head">
      <span>STUDENT PORTFOLIO</span>
      <span>UNIVERSITY APPLICATION</span>
    </div>
    <div className="gallery-cover-title">
      <p>แฟ้มสะสมผลงาน</p>
      <h1>{coverStore.portfolioTitle || "PORTFOLIO"}</h1>
      <span className="gallery-cover-rule" aria-hidden="true" />
    </div>
    <div className="gallery-cover-author">
      <p className="gallery-cover-label">จัดทำโดย / PREPARED BY</p>
      <h2>{fullName || "ชื่อ - นามสกุล"}</h2>
      <p>{coverStore.schoolName || "ชื่อโรงเรียน"}</p>
    </div>
    <div className="gallery-cover-edge" aria-hidden="true" />
  </Paper>;
  if (template === "modern") return <Paper sectionId="cover" data-section="หน้าปก" className="portfolio-page editorial-cover creative-cover">
    <div className="creative-cover-media">
      {coverStore.coverImage ? (
        <img src={coverStore.coverImage} alt="รูปหน้าปก" />
      ) : (
        <div className="creative-cover-placeholder" aria-label="พื้นที่รูปนักเรียน">
          <span>YOUR PHOTO</span>
        </div>
      )}
      <span className="creative-cover-media-caption">STUDENT PORTFOLIO · APPLICATION</span>
    </div>
    <div className="creative-cover-content">
      <div className="editorial-cover-top">
        <span>PORTFOLIO / แฟ้มสะสมผลงาน</span>
        <span>02 — MODERN</span>
      </div>
      <div className="editorial-cover-title">
        <p>STUDENT APPLICATION</p>
        <h1>{coverStore.portfolioTitle || "PORTFOLIO"}</h1>
        <span className="creative-cover-title-rule" aria-hidden="true" />
      </div>
      <div className="editorial-cover-name">
        <p>PROFILE / ข้อมูลผู้สมัคร</p>
        <div className="creative-cover-detail">
          <span>ชื่อ</span><h2>{fullName || "ชื่อ - นามสกุล"}</h2>
        </div>
        <div className="creative-cover-detail">
          <span>ชื่อโรงเรียน</span><h3>{coverStore.schoolName || "ชื่อโรงเรียน"}</h3>
        </div>
      </div>
      <div className="editorial-cover-bottom">
        <span>THE NEXT CHAPTER</span>
        <span>EDUCATION · EXPERIENCE · GROWTH</span>
      </div>
    </div>
  </Paper>;

  if (template === "classic") return <Paper sectionId="cover" data-section="หน้าปก" className="portfolio-page formal-cover">
    <div className="formal-cover-rail" aria-hidden="true" />
    <div className="formal-cover-body">
      <div className="formal-cover-photo">
        {coverStore.coverImage ? (
          <img src={coverStore.coverImage} alt="รูปหน้าปก" />
        ) : (
          <span>รูปหน้าปก</span>
        )}
      </div>
      <p className="formal-cover-subtitle">แฟ้มสะสมผลงาน</p>
      <h1>{coverStore.portfolioTitle || "PORTFOLIO"}</h1>
      <div className="formal-cover-details">
        <p><strong>ชื่อ</strong><span>{fullName || "ชื่อ - นามสกุล"}</span></p>
        <p><strong>ชื่อโรงเรียน</strong><span>{coverStore.schoolName || "ชื่อโรงเรียน"}</span></p>
      </div>
    </div>
    <div className="formal-cover-corner" aria-hidden="true" />
  </Paper>;

  return (
    <Paper sectionId="cover" data-section="หน้าปก" className="portfolio-page bg-white shadow-2xl rounded-sm relative overflow-hidden flex flex-col items-center justify-between p-16 mx-auto my-auto border border-slate-300">
      
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

        {/* ส่วนกลาง: รูปจากฟอร์มหน้าปกในกรอบวงกลม */}
        <div className="w-56 h-56 rounded-full border-4 border-slate-200 shadow-md overflow-hidden bg-slate-100 flex items-center justify-center my-auto relative">
          {coverStore.coverImage ? (
            <img 
              src={coverStore.coverImage}
              alt="รูปหน้าปก"
              className="w-full h-full object-cover" 
            />
          ) : (
            <span className="text-slate-400 text-sm font-semibold">รูปหน้าปก</span>
          )}
        </div>

        {/* ส่วนท้าย: ชื่อ-สกุล และ ชื่อโรงเรียน */}
        <div className="flex flex-col items-center gap-3 text-center mb-10">
          <h2 className="text-3xl font-bold text-slate-700">
            {fullName || "ชื่อ - นามสกุล"}
          </h2>
          
          <div className="h-1 w-20 bg-blue-500 rounded-full"></div>
          
          <h3 className="text-xl font-semibold text-slate-500">
            {coverStore.schoolName || "ชื่อโรงเรียน"}
          </h3>
        </div>

      </div>
    </Paper>
  );
}
