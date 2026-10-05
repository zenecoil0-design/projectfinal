"use client";

import { useState } from "react";
import Link from "next/link";

import SidebarMenu from "@/components/layout/SidebarMenu";
import FormContainer from "@/components/layout/FormContainer";

import CoverPreview from "@/components/preview/CoverPreview";
import PrefacePreview from "@/components/preview/PrefacePreview";
import ProfilePreview from "@/components/preview/ProfilePreview";
import EducationPreview from "@/components/preview/EducationPreview";
import ActivityPreview from "@/components/preview/ActivityPreview";
import CertificatePreview from "@/components/preview/CertificatePreview";

export default function EditorPage() {
  const [currentStep, setCurrentStep] = useState(1);

  const handleNext = () => {
    setCurrentStep((prev) => {
      if (prev < 6) {
        return prev + 1;
      }

      return prev;
    });
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-100">
      {/* ================= HEADER ================= */}
      <header className="flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white px-5">
        <Link
          href="/"
          className="text-lg font-black tracking-tight text-slate-900 transition-colors hover:text-blue-600"
        >
          Auto - Portfolio
        </Link>

        <div className="flex items-center gap-3">
          <span className="hidden text-xs font-semibold text-slate-400 md:block">
            Portfolio Editor
          </span>

          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
          >
            กลับ Dashboard
          </Link>
        </div>
      </header>

      {/* ================= EDITOR BODY ================= */}
      <div
        className="grid w-full overflow-hidden"
        style={{
          height: "calc(100vh - 56px)",
          gridTemplateColumns: "430px minmax(0, 1fr)",
        }}
      >
        {/* ================================================= */}
        {/* LEFT PANEL                                        */}
        {/* ================================================= */}

        <aside className="h-full w-[430px] overflow-hidden border-r border-slate-300 bg-white">
          <div
            className="grid h-full overflow-hidden"
            style={{
              gridTemplateRows: "auto minmax(0, 1fr)",
            }}
          >
            {/* Step Menu */}
            <div className="w-full overflow-hidden">
              <SidebarMenu
                currentStep={currentStep}
                setCurrentStep={setCurrentStep}
              />
            </div>

            {/* Current Form */}
            <div className="min-h-0 w-full overflow-hidden">
              <FormContainer
                currentStep={currentStep}
                onNext={handleNext}
              />
            </div>
          </div>
        </aside>

        {/* ================================================= */}
        {/* RIGHT DOCUMENT PREVIEW                            */}
        {/* ================================================= */}

        <main className="h-full min-w-0 overflow-y-auto overflow-x-auto bg-[#334155]">
          {/* Document workspace */}
          <div className="min-h-full min-w-[900px] px-12 py-10">
            {/* กระดาษทั้งหมดเรียงต่อกันเหมือน Word */}
            <div className="mx-auto flex w-max flex-col items-center gap-10">

              {/* ================= PAGE 1 ================= */}
              <div className="preview-page">
                <CoverPreview />
              </div>

              {/* ================= PAGE 2 ================= */}
              <div className="preview-page">
                <PrefacePreview />
              </div>

              {/* ================= PAGE 3 ================= */}
              <div className="preview-page">
                <ProfilePreview />
              </div>

              {/* ================= PAGE 4 ================= */}
              <div className="preview-page">
                <EducationPreview />
              </div>

              {/* ================= PAGE 5+ ================= */}
              <div className="preview-page">
                <ActivityPreview />
              </div>

              {/* ================= LAST PAGE(S) ================= */}
              <div className="preview-page">
                <CertificatePreview />
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}