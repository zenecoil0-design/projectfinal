"use client";
import Paper, { useTemplate } from "./Paper";

import { useCoverStore } from "@/store/useCoverStore";

export default function CoverPreview() {
  const coverStore = useCoverStore();

  const fullName = [coverStore.firstName.trim(), coverStore.lastName.trim()].filter(Boolean).join(" ");
  const template = useTemplate();
  if (template === "minimal") return <Paper data-section="หน้าปก" className="portfolio-page minimal-cover">
    <div className="minimal-cover-heading"><p>แฟ้มสะสมผลงาน</p><h1>{coverStore.portfolioTitle || "PORTFOLIO"}</h1></div>
    {coverStore.coverImage && <div className="minimal-cover-portrait"><img src={coverStore.coverImage} alt="รูปหน้าปก" /></div>}
    <div className="minimal-cover-author">
      {fullName && <><p>จัดทำโดย</p><h2>{fullName}</h2></>}
      {coverStore.schoolName && <h3>{coverStore.schoolName}</h3>}
    </div>
    <div className="minimal-cover-footer">PORTFOLIO / แฟ้มสะสมผลงาน</div>
  </Paper>;
  if (template === "modern") return <Paper data-section="หน้าปก" className="portfolio-page editorial-cover">
    <div className="editorial-cover-top"><span>แฟ้มสะสมผลงาน</span><span>SELECTED WORKS</span></div>
    <div className="editorial-cover-title"><p>INTRODUCING</p><h1>{coverStore.portfolioTitle || "PORTFOLIO"}</h1></div>
    <div className="editorial-cover-art">
      {coverStore.coverImage && <img className="editorial-backdrop" src={coverStore.coverImage} alt="ภาพพื้นหลังหน้าปก" />}
      <div className="editorial-portrait">{coverStore.coverImage ? <img src={coverStore.coverImage} alt="รูปหน้าปก" /> : <span>YOUR<br />NEXT<br />CHAPTER.</span>}</div>
      <span className="editorial-art-caption">LEARNING · CREATIVITY · GROWTH</span>
    </div>
    <div className="editorial-cover-name"><p>จัดทำโดย / PRESENTED BY</p><h2>{fullName || "ชื่อ – นามสกุล"}</h2><h3>{coverStore.schoolName || "ชื่อสถานศึกษา"}</h3></div>
    <div className="editorial-cover-bottom"><span>ความตั้งใจในทุกก้าวของการเรียนรู้</span><span>01 / PORTFOLIO</span></div>
  </Paper>;

  return (
    <Paper data-section="หน้าปก" className="portfolio-page bg-white shadow-2xl rounded-sm relative overflow-hidden flex flex-col items-center justify-between p-16 mx-auto my-auto border border-slate-300">
      
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
