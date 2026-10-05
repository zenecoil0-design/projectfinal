"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import SidebarMenu from "@/components/layout/SidebarMenu";
import FormContainer from "@/components/layout/FormContainer";

import CoverPreview from "@/components/preview/CoverPreview";
import PrefacePreview from "@/components/preview/PrefacePreview";
import ProfilePreview from "@/components/preview/ProfilePreview";
import EducationPreview from "@/components/preview/EducationPreview";
import ActivityPreview from "@/components/preview/ActivityPreview";
import CertificatePreview from "@/components/preview/CertificatePreview";

import { createClient } from "@/lib/supabase/client";

interface PortfolioInfo {
  id: string;
  title: string;
  template_key: string;
}

export default function EditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const portfolioId =
    searchParams.get("portfolio");

  const [currentStep, setCurrentStep] =
    useState(1);

  const [portfolio, setPortfolio] =
    useState<PortfolioInfo | null>(
      null
    );

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const previewContainerRef =
    useRef<HTMLElement | null>(null);

  const previewRefs =
    useRef<Array<HTMLDivElement | null>>(
      []
    );

  // =====================================================
  // LOAD PORTFOLIO
  // =====================================================

  useEffect(() => {
    const loadPortfolio = async () => {
      setIsLoading(true);
      setErrorMessage("");

      if (!portfolioId) {
        setErrorMessage(
          "ยังไม่ได้เลือก Portfolio กรุณาสร้าง Portfolio จากหน้าแรกก่อน"
        );

        setIsLoading(false);

        return;
      }

      try {
        const supabase =
          createClient();

        const {
          data: { user },
          error: userError,
        } =
          await supabase.auth.getUser();

        if (userError || !user) {
          router.replace(
            `/login?next=${encodeURIComponent(
              `/editor?portfolio=${portfolioId}`
            )}`
          );

          return;
        }

        const {
          data,
          error,
        } = await supabase
          .from("portfolios")
          .select(
            "id, title, template_key"
          )
          .eq(
            "id",
            portfolioId
          )
          .single();

        if (error) {
          throw error;
        }

        if (!data) {
          throw new Error(
            "Portfolio not found"
          );
        }

        setPortfolio({
          id: data.id,
          title:
            data.title ||
            "Untitled Portfolio",
          template_key:
            data.template_key ||
            "classic",
        });
      } catch (error) {
        console.error(
          "Load portfolio error:",
          error
        );

        setErrorMessage(
          "ไม่พบ Portfolio หรือคุณไม่มีสิทธิ์เข้าถึง Portfolio นี้"
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadPortfolio();
  }, [
    portfolioId,
    router,
  ]);

  // =====================================================
  // PREVIEW SCROLL
  // =====================================================

  const scrollPreviewToStep = (
    step: number
  ) => {
    const container =
      previewContainerRef.current;

    const target =
      previewRefs.current[
        step - 1
      ];

    if (
      !container ||
      !target
    ) {
      return;
    }

    const containerRect =
      container.getBoundingClientRect();

    const targetRect =
      target.getBoundingClientRect();

    const nextTop =
      container.scrollTop +
      targetRect.top -
      containerRect.top -
      24;

    container.scrollTo({
      top: Math.max(
        0,
        nextTop
      ),
      behavior: "smooth",
    });
  };

  const handleStepChange = (
    step: number
  ) => {
    setCurrentStep(step);

    requestAnimationFrame(
      () => {
        scrollPreviewToStep(
          step
        );
      }
    );
  };

  const handleNext = () => {
    setCurrentStep(
      (prev) => {
        if (prev >= 6) {
          return prev;
        }

        const nextStep =
          prev + 1;

        requestAnimationFrame(
          () => {
            scrollPreviewToStep(
              nextStep
            );
          }
        );

        return nextStep;
      }
    );
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-4 text-sm font-semibold text-slate-500">
            กำลังโหลด Portfolio...
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (
    errorMessage ||
    !portfolio
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-5">
        <div className="w-full max-w-md rounded-[24px] border border-slate-200 bg-white p-7 text-center shadow-xl">
          <div className="text-4xl">
            📁
          </div>

          <h1 className="mt-4 text-xl font-black text-slate-900">
            ยังไม่สามารถเปิด Editor ได้
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            {errorMessage}
          </p>

          <Link
            href="/"
            className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-blue-700"
          >
            กลับหน้าแรก
          </Link>
        </div>
      </div>
    );
  }

  // =====================================================
  // EDITOR
  // =====================================================

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-100">
      {/* HEADER */}

      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href="/"
            className="shrink-0 text-lg font-black tracking-tight text-slate-900 transition-colors hover:text-blue-600"
          >
            Auto - Portfolio
          </Link>

          <div className="hidden h-6 w-px bg-slate-200 md:block" />

          <div className="hidden min-w-0 md:block">
            <p className="max-w-[320px] truncate text-xs font-bold text-slate-800">
              {portfolio.title}
            </p>

            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Template:{" "}
              {portfolio.template_key}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-xs font-semibold text-slate-400 lg:block">
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

      {/* BODY */}

      <div
        className="grid min-h-0 flex-1 overflow-hidden"
        style={{
          gridTemplateColumns:
            "30% 70%",
        }}
      >
        {/* LEFT */}

        <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden border-r border-slate-300 bg-white">
          <div className="shrink-0">
            <SidebarMenu
              currentStep={
                currentStep
              }
              setCurrentStep={
                handleStepChange
              }
            />
          </div>

          <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
            <FormContainer
              currentStep={
                currentStep
              }
              onNext={
                handleNext
              }
            />
          </div>
        </aside>

        {/* RIGHT */}

        <main
          ref={
            previewContainerRef
          }
          className="min-h-0 min-w-0 overflow-y-auto overflow-x-auto bg-slate-300"
        >
          <div className="flex min-h-full w-full flex-col items-center gap-10 px-8 py-8">
            {/* PAGE 1 */}

            <div
              ref={(element) => {
                previewRefs.current[0] =
                  element;
              }}
              className="shrink-0"
            >
              <CoverPreview />
            </div>

            {/* PAGE 2 */}

            <div
              ref={(element) => {
                previewRefs.current[1] =
                  element;
              }}
              className="shrink-0"
            >
              <PrefacePreview />
            </div>

            {/* PAGE 3 */}

            <div
              ref={(element) => {
                previewRefs.current[2] =
                  element;
              }}
              className="shrink-0"
            >
              <ProfilePreview />
            </div>

            {/* PAGE 4 */}

            <div
              ref={(element) => {
                previewRefs.current[3] =
                  element;
              }}
              className="shrink-0"
            >
              <EducationPreview />
            </div>

            {/* PAGE 5 */}

            <div
              ref={(element) => {
                previewRefs.current[4] =
                  element;
              }}
              className="shrink-0"
            >
              <ActivityPreview />
            </div>

            {/* PAGE 6 */}

            <div
              ref={(element) => {
                previewRefs.current[5] =
                  element;
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