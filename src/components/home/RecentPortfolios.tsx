"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  FaPlus,
  FaArrowRight,
  FaPen,
  FaClock,
  FaFileAlt,
} from "react-icons/fa";

import { createClient } from "@/lib/supabase/client";

import CreatePortfolioModal from "@/components/portfolio/CreatePortfolioModal";

type PortfolioRow = {
  id: string;

  title: string | null;

  template_key: string | null;

  created_at: string;

  updated_at: string | null;
};

export default function RecentPortfolios() {
  const [
    portfolios,
    setPortfolios,
  ] =
    useState<PortfolioRow[]>(
      []
    );

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  useEffect(() => {
    const loadPortfolios =
      async () => {
        setIsLoading(true);

        try {
          const supabase =
            createClient();

          const {
            data: { user },
          } =
            await supabase.auth.getUser();

          if (!user) {
            setPortfolios(
              []
            );

            return;
          }

          const {
            data,
            error,
          } = await supabase
            .from(
              "portfolios"
            )
            .select(
              `
                id,
                title,
                template_key,
                created_at,
                updated_at
              `
            )
            .eq(
              "user_id",
              user.id
            )
            .order(
              "updated_at",
              {
                ascending:
                  false,
              }
            )
            .limit(3);

          if (error) {
            throw error;
          }

          setPortfolios(
            data ?? []
          );
        } catch (
          error
        ) {
          console.error(
            "Load recent portfolios error:",
            error
          );
        } finally {
          setIsLoading(false);
        }
      };

    loadPortfolios();
  }, []);

  const formatDate = (
    value:
      | string
      | null
  ) => {
    if (!value) {
      return "-";
    }

    try {
      return new Date(
        value
      ).toLocaleDateString(
        "th-TH",
        {
          day: "numeric",
          month: "short",
          year: "numeric",
        }
      );
    } catch {
      return "-";
    }
  };

  const getTemplateName = (
    template:
      | string
      | null
  ) => {
    switch (template) {
      case "modern":
        return "Modern";

      case "minimal":
        return "Minimal";

      default:
        return "Classic";
    }
  };

  const renderPreview = (
    template:
      | string
      | null
  ) => {
    if (
      template ===
      "modern"
    ) {
      return (
        <div className="flex h-full flex-col bg-slate-950 p-4">
          <div className="h-[46%] rounded-xl bg-gradient-to-br from-blue-500 to-cyan-300" />

          <div className="mt-4 h-3 w-2/3 rounded-full bg-white" />

          <div className="mt-2 h-2 w-full rounded-full bg-slate-600" />

          <div className="mt-2 h-2 w-4/5 rounded-full bg-slate-700" />
        </div>
      );
    }

    if (
      template ===
      "minimal"
    ) {
      return (
        <div className="flex h-full flex-col bg-[#fafafa] p-5">
          <div className="h-1 w-10 rounded-full bg-slate-900" />

          <div className="mt-5 h-4 w-2/3 rounded-full bg-slate-800" />

          <div className="mt-3 h-2 w-full rounded-full bg-slate-200" />

          <div className="mt-2 h-2 w-3/4 rounded-full bg-slate-200" />

          <div className="mt-6 h-16 rounded-xl border border-slate-200 bg-white" />
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col bg-white p-4">
        <div className="h-[43%] rounded-xl bg-slate-900" />

        <div className="mt-4 h-3 w-3/4 rounded-full bg-slate-300" />

        <div className="mt-2 h-2 w-full rounded-full bg-slate-200" />

        <div className="mt-2 h-2 w-4/5 rounded-full bg-slate-200" />
      </div>
    );
  };

  return (
    <section className="mt-10 w-full pb-12">
      {/* HEADER */}

      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
            ล่าสุด
          </h2>

          <p className="mt-1.5 text-sm text-slate-500">
            Portfolio
            ที่คุณสร้างหรือแก้ไขล่าสุด
          </p>
        </div>

        {portfolios.length >
          0 && (
          <Link
            href="/dashboard"
            className="hidden text-sm font-bold text-blue-600 transition hover:text-blue-700 sm:inline"
          >
            ดูทั้งหมด →
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* CREATE */}

        <CreatePortfolioModal>
          <button
            type="button"
            className="group min-h-[300px] rounded-[26px] border-2 border-dashed border-slate-300 bg-white p-6 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-400 hover:shadow-xl"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition-all group-hover:bg-blue-600 group-hover:text-white">
              <FaPlus className="text-lg" />
            </div>

            <div className="mt-7">
              <h3 className="text-xl font-black text-slate-900">
                สร้างผลงานใหม่
              </h3>

              <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
                ตั้งชื่อ เลือก Template
                และเริ่มสร้าง Portfolio
                เล่มใหม่
              </p>
            </div>

            <div className="mt-9 inline-flex items-center gap-2 text-sm font-bold text-blue-600">
              เริ่มสร้าง

              <FaArrowRight className="text-xs transition-transform group-hover:translate-x-1" />
            </div>
          </button>
        </CreatePortfolioModal>

        {/* LOADING */}

        {isLoading && (
          <div className="flex min-h-[300px] items-center justify-center rounded-[26px] border border-slate-200 bg-white">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

              <p className="mt-3 text-xs font-semibold text-slate-400">
                กำลังโหลด Portfolio...
              </p>
            </div>
          </div>
        )}

        {/* PORTFOLIOS */}

        {!isLoading &&
          portfolios.map(
            (
              portfolio
            ) => (
              <Link
                key={
                  portfolio.id
                }
                href={`/editor?portfolio=${portfolio.id}`}
                className="group flex min-h-[300px] flex-col overflow-hidden rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl"
              >
                <div className="aspect-[16/9] overflow-hidden rounded-[18px] border border-slate-200 bg-slate-100">
                  {renderPreview(
                    portfolio.template_key
                  )}
                </div>

                <div className="flex flex-1 flex-col px-1 pt-4">
                  <h3 className="truncate text-lg font-black text-slate-900">
                    {portfolio.title ||
                      "Untitled Portfolio"}
                  </h3>

                  <div className="mt-2 inline-flex w-max items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-500">
                    <FaFileAlt />

                    {getTemplateName(
                      portfolio.template_key
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-400">
                    <FaClock />

                    {formatDate(
                      portfolio.updated_at ||
                        portfolio.created_at
                    )}
                  </div>

                  <div className="mt-auto pt-5">
                    <div className="flex items-center justify-between text-sm font-bold text-blue-600">
                      <span>
                        แก้ไข Portfolio
                      </span>

                      <FaPen className="text-xs" />
                    </div>
                  </div>
                </div>
              </Link>
            )
          )}
      </div>
    </section>
  );
}