"use client";

import {
  FaGraduationCap,
} from "react-icons/fa";

import { useEducationStore } from "@/store/useEducationStore";

export default function EducationPreview() {
  const educations =
    useEducationStore(
      (state) =>
        state.educations
    );

  return (
    <div className="relative mx-auto my-auto flex min-h-[297mm] w-[210mm] flex-col overflow-hidden rounded-sm border border-slate-300 bg-white p-16 text-slate-800 shadow-2xl">
      {/* HEADER */}

      <div className="mb-8 flex items-center gap-3 border-b pb-4">
        <h2 className="text-3xl font-bold tracking-wider">
          ประวัติการศึกษา
        </h2>
      </div>

      {/* EMPTY STATE */}

      {educations.length ===
      0 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 text-3xl text-slate-300">
            <FaGraduationCap />
          </div>

          <h3 className="mt-5 text-lg font-bold text-slate-500">
            ยังไม่ได้เลือกประวัติการศึกษา
          </h3>

          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
            เลือกประวัติการศึกษาจากแบบฟอร์มด้านซ้าย
            แล้วข้อมูลจะปรากฏในหน้านี้
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-6">
          {educations.map(
            (
              education,
              index
            ) => (
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
            )
          )}
        </div>
      )}

      {/* FOOTER */}

      <div className="mt-6 border-t pt-4 text-center text-xs text-slate-400">
        Portfolio -
        หน้าประวัติการศึกษา
      </div>
    </div>
  );
}