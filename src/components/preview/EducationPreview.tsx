"use client";
import { useEducationStore } from "@/store/useEducationStore";
import PaginatedSection from "./PaginatedSection";
import { useTemplate } from "./Paper";
export default function EducationPreview() {
  const educations = useEducationStore(state => state.educations);
  const template = useTemplate();
  return <PaginatedSection sectionId="education" title="ประวัติการศึกษา" cards={educations.map((education, index) => (template === "minimal" ? (
    <article key={education.id} className="document-card education-card gallery-education-card" data-gallery-entry="education" data-has-image={Boolean(education.logoUrl)}>
      <div className="gallery-education-timeline">
        <span className="gallery-education-step">EDU. {String(index + 1).padStart(2, "0")}</span>
        <strong>{[education.startYear.trim(), education.endYear.trim()].filter(Boolean).join(" – ") || `ช่วงที่ ${index + 1}`}</strong>
      </div>
      {education.logoUrl && <div className="gallery-education-image"><img src={education.logoUrl} alt={`สถานศึกษา ${education.schoolName}`} /></div>}
      <div className="gallery-education-copy">
        <span className="gallery-education-kicker">EDUCATION HISTORY</span>
        <h3>{education.schoolName || "ชื่อสถานศึกษา"}</h3>
        {education.level.trim() && <p><strong>ระดับการศึกษา</strong><span>{education.level}</span></p>}
        {education.studyPlan.trim() && <p><strong>แผนการเรียน / สาขา</strong><span>{education.studyPlan}</span></p>}
        {education.gpa.trim() && <p><strong>GPAX</strong><span>{education.gpa}</span></p>}
      </div>
    </article>
  ) : (
              <div
                key={
                  education.id
                }
                className={`document-card education-card flex gap-5 rounded-xl border border-slate-200 bg-slate-50 p-5${education.logoUrl ? "" : " without-logo"}`}
              >
                {/* LOGO */}

                {education.logoUrl && <div className="education-logo flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <img
                      src={
                        education.logoUrl
                      }
                      alt={
                        education.schoolName
                      }
                      className="h-full w-full object-contain p-2"
                    />
                </div>}

                {/* CONTENT */}

                <div className="flex min-w-0 flex-1 flex-col justify-center">
                  <span className="text-xs font-bold text-blue-600">
                    ช่วงการศึกษาที่{" "}
                    {index + 1}
                  </span>

                  <h3 className="mt-1 text-lg font-bold text-slate-800">
                    {education.schoolName ||
                      "ชื่อสถานศึกษา"}
                  </h3>

                  {education.level.trim() && <p className="mt-1 text-sm text-slate-600">
                    <span className="font-semibold">
                      ระดับการศึกษา:
                    </span>{" "}
                    {education.level}
                  </p>}

                  {education.studyPlan.trim() && (
                    <p className="mt-1 text-sm text-slate-600">
                      <span className="font-semibold">
                        แผนการเรียน /
                        สาขา:
                      </span>{" "}
                      {
                        education.studyPlan
                      }
                    </p>
                  )}

                  {education.gpa.trim() && (
                    <p className="mt-1 text-sm text-slate-600">
                      <span className="font-semibold">
                        GPAX:
                      </span>{" "}
                      {
                        education.gpa
                      }
                    </p>
                  )}

                  {(education.startYear.trim() ||
                    education.endYear.trim()) && (
                    <p className="mt-1 text-sm text-slate-500">
                      <span className="font-semibold">
                        {education.startYear.trim() && education.endYear.trim() ? "ช่วงปีการศึกษา:" : education.startYear.trim() ? "ปีเริ่มต้น:" : "ปีสิ้นสุด:"}
                      </span>{" "}
                      {education.startYear.trim() && education.startYear}
                      {education.startYear.trim() && education.endYear.trim() && " - "}
                      {education.endYear.trim() && education.endYear}
                    </p>
                  )}
                </div>
              </div>
  )))} />;
}
