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
  const previewScrollRef = useRef<HTMLElement | null>(null);
  const previewRefs = useRef<Array<HTMLDivElement | null>>([]);

  const scrollPreviewToStep = (step: number) => {
    const container = previewScrollRef.current;
    const target = previewRefs.current[step - 1];

    if (!container || !target) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    const nextTop =
      container.scrollTop +
      targetRect.top -
      containerRect.top -
      32;

    container.scrollTo({
      top: Math.max(0, nextTop),
      behavior: "smooth",
    });
  };

  const moveToStep = (step: number) => {
    setCurrentStep(step);

    requestAnimationFrame(() => {
      formScrollRef.current?.scrollTo({
        top: 0,
        behavior: "auto",
      });

      scrollPreviewToStep(step);
    });
  };

  const handleNext = () => {
    if (currentStep < 6) {
      moveToStep(currentStep + 1);
    }
  };

  return (
    <div className="fixed inset-0 flex min-h-0 flex-col overflow-hidden bg-slate-100">
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

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="flex min-h-0 w-[430px] min-w-[430px] max-w-[430px] shrink-0 flex-col overflow-hidden border-r border-slate-300 bg-white">
          <div className="shrink-0">
            <SidebarMenu
              currentStep={currentStep}
              setCurrentStep={moveToStep}
            />
          </div>

          <div
            ref={formScrollRef}
            className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain bg-white"
            style={{ scrollbarGutter: "stable" }}
          >
            <FormContainer
              currentStep={currentStep}
              onNext={handleNext}
            />
          </div>
        </aside>

        <main
          ref={previewScrollRef}
          className="min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain bg-slate-300"
          style={{ scrollbarGutter: "stable" }}
        >
          <div className="min-h-full min-w-[900px] px-12 py-10">
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
        </main>
      </div>
    </div>
  );
}
