"use client";

import { useRef, useState } from "react";
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

  const previewContainerRef = useRef<HTMLElement | null>(null);

  const previewRefs = useRef<Array<HTMLDivElement | null>>([]);

  const scrollPreviewToStep = (step: number) => {
    const container = previewContainerRef.current;
    const target = previewRefs.current[step - 1];

    if (!container || !target) return;

    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    const nextTop =
      container.scrollTop +
      targetRect.top -
      containerRect.top -
      24;

    container.scrollTo({
      top: Math.max(0, nextTop),
      behavior: "smooth",
    });
  };

  const handleStepChange = (step: number) => {
    setCurrentStep(step);

    requestAnimationFrame(() => {
      scrollPreviewToStep(step);
    });
  };

  const handleNext = () => {
    setCurrentStep((prev) => {
      if (prev < 6) {
        const nextStep = prev + 1;

        requestAnimationFrame(() => {
          scrollPreviewToStep(nextStep);
        });

        return nextStep;
      }

      return prev;
    });
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-100">
      {/* ================= HEADER ================= */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5">
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

      {/* ================= BODY ================= */}
      <div
        className="grid min-h-0 flex-1 overflow-hidden"
        style={{
          gridTemplateColumns: "30% 70%",
        }}
      >
        {/* ================================================= */}
        {/* LEFT - 30%                                       */}
        {/* ================================================= */}
        <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden border-r border-slate-300 bg-white">
          {/* เมนูด้านบน */}
          <div className="shrink-0">
            <SidebarMenu
              currentStep={currentStep}
              setCurrentStep={handleStepChange}
            />
          </div>

          {/* Form */}
          <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
            <FormContainer
              currentStep={currentStep}
              onNext={handleNext}
            />
          </div>
        </aside>

        {/* ================================================= */}
        {/* RIGHT - 70%                                      */}
        {/* ================================================= */}
        <main
          ref={previewContainerRef}
          className="min-h-0 min-w-0 overflow-y-auto overflow-x-auto bg-slate-300"
        >
          <div className="flex min-h-full w-full flex-col items-center gap-10 px-8 py-8">
            {/* PAGE 1 */}
            <div
              ref={(element) => {
                previewRefs.current[0] = element;
              }}
              className="shrink-0"
            >
              <CoverPreview />
            </div>

            {/* PAGE 2 */}
            <div
              ref={(element) => {
                previewRefs.current[1] = element;
              }}
              className="shrink-0"
            >
              <PrefacePreview />
            </div>

            {/* PAGE 3 */}
            <div
              ref={(element) => {
                previewRefs.current[2] = element;
              }}
              className="shrink-0"
            >
              <ProfilePreview />
            </div>

            {/* PAGE 4 */}
            <div
              ref={(element) => {
                previewRefs.current[3] = element;
              }}
              className="shrink-0"
            >
              <EducationPreview />
            </div>

            {/* PAGE 5+ */}
            <div
              ref={(element) => {
                previewRefs.current[4] = element;
              }}
              className="shrink-0"
            >
              <ActivityPreview />
            </div>

            {/* PAGE 6+ */}
            <div
              ref={(element) => {
                previewRefs.current[5] = element;
              }}
              className="shrink-0"
            >
              <CertificatePreview />
            </div>

            <div className="h-8 shrink-0" />
          </div>
        </main>
      </div>
    </div>
  );
}