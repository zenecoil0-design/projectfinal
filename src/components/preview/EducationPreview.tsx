"use client";

import { useEducationStore } from "@/store/useEducationStore";
import { FaGraduationCap } from "react-icons/fa";
import A4Page from "@/components/preview/A4Page";

const ITEMS_PER_PAGE = 4;

export default function EducationPreview() {
  const { educations } = useEducationStore();
  const pages = [];

  for (let index = 0; index < educations.length; index += ITEMS_PER_PAGE) {
    pages.push(educations.slice(index, index + ITEMS_PER_PAGE));
  }

  if (pages.length === 0) {
    pages.push([]);
  }

  return (
    <div className="flex flex-col gap-10">
      {pages.map((pageItems, pageIndex) => (
        <A4Page
          key={pageIndex}
          className="flex flex-col justify-between p-16 text-slate-800"
        >
          <div className="mb-8 flex items-center justify-between border-b pb-4">
            <h2 className="text-3xl font-bold tracking-wider">
              ประวัติการศึกษา
            </h2>
            {pages.length > 1 && (
              <span className="text-sm font-semibold text-slate-400">
                หน้า {pageIndex + 1} / {pages.length}
              </span>
            )}
          </div>

          <div className="min-h-0 flex-1 space-y-5 overflow-hidden">
            {pageItems.map((education, itemIndex) => (
              <div
                key={education.id}
                className="flex gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-white shadow-sm">
                  {education.logoUrl ? (
                    <img
                      src={education.logoUrl}
                      alt="School logo"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <FaGraduationCap className="text-2xl text-slate-400" />
                  )}
                </div>

                <div className="min-w-0 text-sm">
                  <span className="text-xs font-bold text-blue-600">
                    ช่วงการศึกษาที่ {pageIndex * ITEMS_PER_PAGE + itemIndex + 1}
                  </span>
                  <h3 className="truncate text-base font-bold text-slate-800">
                    {education.schoolName || "ชื่อสถานศึกษา / โรงเรียน"}
                  </h3>
                  <p><b>ระดับชั้น :</b> {education.level || "-"}</p>
                  <p className="truncate"><b>แผนการเรียน :</b> {education.studyPlan || "-"}</p>
                  <p><b>เกรดเฉลี่ย (GPAX) :</b> {education.gpa || "-"}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t pt-4 text-center text-xs text-slate-400">
            Portfolio - หน้าประวัติการศึกษา
          </div>
        </A4Page>
      ))}
    </div>
  );
}
