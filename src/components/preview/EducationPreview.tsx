"use client";
import { FaGraduationCap } from "react-icons/fa";
import { useEducationStore } from "@/store/useEducationStore";
import PaginatedSection from "./PaginatedSection";
export default function EducationPreview() {
  const educations = useEducationStore(state => state.educations);
  return <PaginatedSection title="ประวัติการศึกษา" cards={educations.map((education, index) => (
              <div
                key={
                  education.id
                }
                className="flex gap-5 rounded-xl border border-slate-200 bg-slate-50 p-5"
              >
                {/* LOGO */}

                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  {education.logoUrl ? (
                    <img
                      src={
                        education.logoUrl
                      }
                      alt={
                        education.schoolName
                      }
                      className="h-full w-full object-contain p-2"
                    />
                  ) : (
                    <FaGraduationCap className="text-2xl text-slate-300" />
                  )}
                </div>

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

                  <p className="mt-1 text-sm text-slate-600">
                    <span className="font-semibold">
                      ระดับการศึกษา:
                    </span>{" "}
                    {education.level ||
                      "-"}
                  </p>

                  {education.studyPlan && (
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

                  {education.gpa && (
                    <p className="mt-1 text-sm text-slate-600">
                      <span className="font-semibold">
                        GPAX:
                      </span>{" "}
                      {
                        education.gpa
                      }
                    </p>
                  )}

                  {(education.startYear ||
                    education.endYear) && (
                    <p className="mt-1 text-sm text-slate-500">
                      <span className="font-semibold">
                        ช่วงปีการศึกษา:
                      </span>{" "}
                      {education.startYear ||
                        "?"}{" "}
                      -{" "}
                      {education.endYear ||
                        "ปัจจุบัน"}
                    </p>
                  )}
                </div>
              </div>
  ))} />;
}
