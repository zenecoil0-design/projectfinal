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

  const formScrollRef = useRef<HTMLDivElement | null>(null);
  const previewScrollRef = useRef<HTMLDivElement | null>(null);
  const previewRefs = useRef<Array<HTMLDivElement | null>>([]);

  const scrollPreviewToStep = (step: number) => {
    const container = previewScrollRef.current;
    const target = previewRefs.current[step - 1];

    if (!container || !target) {
      return;
    }

    const nextTop = Math.max(
      0,
      target.offsetTop - container.offsetTop - 24
    );

    container.scrollTo({
      top: nextTop,
      behavior: "smooth",
    });
  };

  const moveToStep = (step: number) => {
    setCurrentStep(step);

    requestAnimationFrame(() => {
      if (formScrollRef.current) {
        formScrollRef.current.scrollTop = 0;
      }

      scrollPreviewToStep(step);
    });
  };

  const handleNext = () => {
    if (currentStep < 6) {
      moveToStep(currentStep + 1);
    }
  };

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-slate-100">
      <header className="absolute inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-5">
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

      <div className="absolute inset-x-0 bottom-0 top-14 grid grid-cols-[30%_70%] overflow-hidden">
        <aside className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden border-r border-slate-300 bg-white">
          <div className="shrink-0">
            <SidebarMenu
              currentStep={currentStep}
              setCurrentStep={moveToStep}
            />
          </div>

          <div
            ref={formScrollRef}
            className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-white"
          >
            <FormContainer
              currentStep={currentStep}
              onNext={handleNext}
            />
          </div>
        </aside>

        <div
          ref={previewScrollRef}
          className="h-full min-h-0 min-w-0 overflow-x-auto overflow-y-auto bg-slate-300"
        >
          <div className="min-w-[900px] px-12 py-10 pb-24">
            <div className="mx-auto flex w-max flex-col items-center gap-10">
              <div
                ref={(element) => {
                  previewRefs.current[0] = element;
                }}
              >
                <CoverPreview />
              </div>

              <div
                ref={(element) => {
                  previewRefs.current[1] = element;
                }}
              >
                <PrefacePreview />
              </div>

              <div
                ref={(element) => {
                  previewRefs.current[2] = element;
                }}
              >
                <ProfilePreview />
              </div>

              <div
                ref={(element) => {
                  previewRefs.current[3] = element;
                }}
              >
                <EducationPreview />
              </div>

              <div
                ref={(element) => {
                  previewRefs.current[4] = element;
                }}
              >
                <ActivityPreview />
              </div>

              <div
                ref={(element) => {
                  previewRefs.current[5] = element;
                }}
              >
                <CertificatePreview />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
