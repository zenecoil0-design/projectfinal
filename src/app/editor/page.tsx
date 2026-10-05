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
  const previewRefs = useRef<Array<HTMLDivElement | null>>([]);
  const formScrollRef = useRef<HTMLDivElement | null>(null);

  const moveToStep = (step: number) => {
    setCurrentStep(step);

    requestAnimationFrame(() => {
      formScrollRef.current?.scrollTo({
        top: 0,
        behavior: "auto",
      });

      previewRefs.current[step - 1]?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const handleNext = () => {
    if (currentStep < 6) {
      moveToStep(currentStep + 1);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-100">
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

      <div
        className="grid min-h-0 w-full overflow-hidden"
        style={{
          height: "calc(100vh - 56px)",
          gridTemplateColumns: "430px minmax(0, 1fr)",
        }}
      >
        <aside className="flex h-full min-h-0 w-[430px] flex-col overflow-hidden border-r border-slate-300 bg-white">
          <div className="w-full shrink-0">
            <SidebarMenu
              currentStep={currentStep}
              setCurrentStep={moveToStep}
            />
          </div>

          <div
            ref={formScrollRef}
            className="h-0 min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-scroll overscroll-contain bg-white"
          >
            <FormContainer
              currentStep={currentStep}
              onNext={handleNext}
            />
          </div>
        </aside>

        <main className="h-full min-w-0 overflow-auto overscroll-contain bg-slate-300">
          <div className="min-h-full min-w-[900px] px-12 py-10">
            <div className="mx-auto flex w-max flex-col items-center gap-10">
              <div
                ref={(element) => {
                  previewRefs.current[0] = element;
                }}
                className="scroll-mt-10"
              >
                <CoverPreview />
              </div>

              <div
                ref={(element) => {
                  previewRefs.current[1] = element;
                }}
                className="scroll-mt-10"
              >
                <PrefacePreview />
              </div>

              <div
                ref={(element) => {
                  previewRefs.current[2] = element;
                }}
                className="scroll-mt-10"
              >
                <ProfilePreview />
              </div>

              <div
                ref={(element) => {
                  previewRefs.current[3] = element;
                }}
                className="scroll-mt-10"
              >
                <EducationPreview />
              </div>

              <div
                ref={(element) => {
                  previewRefs.current[4] = element;
                }}
                className="scroll-mt-10"
              >
                <ActivityPreview />
              </div>

              <div
                ref={(element) => {
                  previewRefs.current[5] = element;
                }}
                className="scroll-mt-10"
              >
                <CertificatePreview />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
