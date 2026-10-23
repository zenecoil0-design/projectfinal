"use client";
import { useEducationStore } from "@/store/useEducationStore";
import PaginatedSection from "./PaginatedSection";
export default function EducationPreview() {
  const educations = useEducationStore(state => state.educations);
  return <PaginatedSection sectionId="education" title="ประวัติการศึกษา" cards={educations.map((education, index) => (
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
  ))} />;
}
