"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import Link from "next/link";

import {
  FaUserCircle,
  FaSignOutAlt,
  FaPlus,
  FaEnvelope,
  FaDatabase,
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

export default function DashboardPage() {
  const router =
    useRouter();

  const [username, setUsername] =
    useState("");

  const [email, setEmail] =
    useState("");

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

  const [
    isLoggingOut,
    setIsLoggingOut,
  ] = useState(false);

  const [
    loadError,
    setLoadError,
  ] = useState("");

  // =====================================================
  // LOAD USER + PORTFOLIOS
  // =====================================================

  useEffect(() => {
    const loadDashboard =
      async () => {
        setIsLoading(true);
        setLoadError("");

        try {
          const supabase =
            createClient();

          const {
            data: { user },
            error:
              userError,
          } =
            await supabase.auth.getUser();

          if (
            userError ||
            !user
          ) {
            router.replace(
              "/login"
            );

            return;
          }

          setUsername(
            user
              .user_metadata
              ?.username ||
              user
                .user_metadata
                ?.full_name ||
              "ผู้ใช้งาน"
          );

          setEmail(
            user.email || ""
          );

          const {
            data,
            error:
              portfolioError,
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
            );

          if (
            portfolioError
          ) {
            throw portfolioError;
          }

          setPortfolios(
            data ?? []
          );
        } catch (
          error: any
        ) {
          console.error(
            "Load dashboard error:",
            error
          );

          setLoadError(
            error?.message ||
              "ไม่สามารถโหลด Portfolio ได้"
          );
        } finally {
          setIsLoading(false);
        }
      };

    loadDashboard();
  }, [router]);

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout =
    async () => {
      setIsLoggingOut(
        true
      );

      const supabase =
        createClient();

      const {
        error,
      } =
        await supabase.auth.signOut();

      if (error) {
        console.error(
          "Logout error:",
          error
        );

        setIsLoggingOut(
          false
        );

        return;
      }

      router.replace(
        "/login"
      );

      router.refresh();
    };

  // =====================================================
  // FORMAT DATE
  // =====================================================

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

  // =====================================================
  // TEMPLATE NAME
  // =====================================================

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

  // =====================================================
  // TEMPLATE PREVIEW
  // =====================================================

  const renderTemplatePreview = (
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
          <div className="h-[45%] rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-300" />

          <div className="mt-4 h-3 w-2/3 rounded-full bg-white" />

          <div className="mt-2 h-2 w-full rounded-full bg-slate-600" />

          <div className="mt-2 h-2 w-4/5 rounded-full bg-slate-700" />

          <div className="mt-auto h-12 rounded-xl bg-white/10" />
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

          <div className="mt-auto h-2 w-1/2 rounded-full bg-slate-300" />
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col bg-white p-4">
        <div className="h-[42%] rounded-xl bg-slate-900" />

        <div className="mt-4 h-3 w-3/4 rounded-full bg-slate-300" />

        <div className="mt-2 h-2 w-full rounded-full bg-slate-200" />

        <div className="mt-2 h-2 w-4/5 rounded-full bg-slate-200" />

        <div className="mt-auto grid grid-cols-2 gap-2">
          <div className="h-10 rounded-lg bg-slate-100" />

          <div className="h-10 rounded-lg bg-slate-100" />
        </div>
      </div>
    );
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-4 text-sm font-medium text-slate-500">
            กำลังโหลดข้อมูล...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] text-slate-800">
      {/* HEADER */}

      <header className="h-16 w-full border-b border-slate-200 bg-white">
        <div className="flex h-full items-center justify-between px-6 md:px-8">
          <Link
            href="/"
            className="text-xl font-black tracking-tight text-slate-900 transition-colors hover:text-blue-600 md:text-2xl"
          >
            Auto - Portfolio
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden text-right md:block">
              <p className="max-w-[180px] truncate text-sm font-bold text-slate-800">
                {username}
              </p>

              <p className="max-w-[180px] truncate text-xs text-slate-400">
                {email}
              </p>
            </div>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600">
              <FaUserCircle className="text-2xl" />
            </div>

            <button
              type="button"
              onClick={
                handleLogout
              }
              disabled={
                isLoggingOut
              }
              aria-label="ออกจากระบบ"
              className="
                flex
                h-11
                min-w-11
                shrink-0
                items-center
                justify-center
                gap-2
                rounded-xl
                border
                border-slate-200
                bg-white
                px-3
                text-sm
                font-bold
                text-slate-600
                transition-all
                hover:border-red-200
                hover:bg-red-50
                hover:text-red-600
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              <FaSignOutAlt />

              <span className="hidden lg:inline">
                {isLoggingOut
                  ? "กำลังออก..."
                  : "ออกจากระบบ"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN */}

      <main className="w-full px-5 py-7 md:px-8 md:py-8">
        <div className="mx-auto w-full max-w-[1600px]">
          {/* WELCOME */}

          <section
            className="
              relative
              w-full
              overflow-hidden
              rounded-[28px]
              bg-gradient-to-br
              from-slate-950
              via-slate-900
              to-blue-800
              px-7
              py-8
              text-white
              shadow-[0_20px_50px_rgba(15,23,42,0.15)]
              md:px-9
              md:py-9
              lg:px-10
            "
          >
            <div className="pointer-events-none absolute -right-32 -top-40 h-[360px] w-[360px] rounded-full bg-blue-500/20 blur-3xl" />

            <div className="relative z-10 flex min-h-[180px] items-center">
              <div className="w-full max-w-3xl">
                <div className="mb-3">
                  <span className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold text-blue-100 backdrop-blur">
                    Dashboard
                  </span>
                </div>

                <h1 className="break-words text-3xl font-black leading-tight tracking-tight text-white md:text-4xl">
                  สวัสดี,{" "}
                  {username} 👋
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                  จัดการ Portfolio
                  ที่เคยสร้างไว้
                  หรือเริ่มสร้าง
                  Portfolio
                  เล่มใหม่จากที่นี่
                </p>

                {email && (
                  <div className="mt-5 inline-flex max-w-full items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs text-slate-200 backdrop-blur">
                    <FaEnvelope className="shrink-0" />

                    <span className="truncate">
                      {email}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ERROR */}

          {loadError && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-600">
              {loadError}
            </div>
          )}

          {/* PORTFOLIOS */}

          <section className="mt-10">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black leading-tight text-slate-900">
                  พอร์ตฟอลิโอของฉัน
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  มีทั้งหมด{" "}
                  {portfolios.length}{" "}
                  Portfolio
                </p>
              </div>

              <Link
                href="/my-data"
                className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-bold text-violet-700 transition hover:bg-violet-100"
              >
                <FaDatabase />

                คลังข้อมูลของฉัน
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {/* CREATE */}

              <CreatePortfolioModal>
                <button
                  type="button"
                  className="
                    group
                    flex
                    min-h-[320px]
                    w-full
                    flex-col
                    justify-between
                    overflow-hidden
                    rounded-[26px]
                    border-2
                    border-dashed
                    border-slate-300
                    bg-white
                    p-6
                    text-left
                    transition-all
                    duration-300
                    hover:-translate-y-1
                    hover:border-blue-400
                    hover:shadow-xl
                  "
                >
                  <div>
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition-all group-hover:bg-blue-600 group-hover:text-white">
                      <FaPlus />
                    </div>

                    <h3 className="mt-6 text-xl font-black leading-snug text-slate-900">
                      สร้าง Portfolio ใหม่
                    </h3>

                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      ตั้งชื่อ เลือก Template
                      และเริ่มสร้าง
                      Portfolio
                      เล่มใหม่
                    </p>
                  </div>

                  <span className="mt-8 text-sm font-bold text-blue-600">
                    เริ่มสร้าง →
                  </span>
                </button>
              </CreatePortfolioModal>

              {/* EXISTING PORTFOLIOS */}

              {portfolios.map(
                (portfolio) => (
                  <Link
                    key={
                      portfolio.id
                    }
                    href={`/editor?portfolio=${portfolio.id}`}
                    className="
                      group
                      flex
                      min-h-[320px]
                      flex-col
                      overflow-hidden
                      rounded-[26px]
                      border
                      border-slate-200
                      bg-white
                      p-4
                      transition-all
                      duration-300
                      hover:-translate-y-1
                      hover:border-blue-300
                      hover:shadow-xl
                    "
                  >
                    {/* PREVIEW */}

                    <div className="aspect-[16/10] overflow-hidden rounded-[18px] border border-slate-200 bg-slate-100">
                      {renderTemplatePreview(
                        portfolio.template_key
                      )}
                    </div>

                    {/* INFO */}

                    <div className="flex flex-1 flex-col px-1 pb-1 pt-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-black text-slate-900">
                            {portfolio.title ||
                              "Untitled Portfolio"}
                          </h3>

                          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            <FaFileAlt />

                            {getTemplateName(
                              portfolio.template_key
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                        <FaClock />

                        แก้ไขล่าสุด{" "}
                        {formatDate(
                          portfolio.updated_at ||
                            portfolio.created_at
                        )}
                      </div>

                      <div className="mt-auto pt-5">
                        <div className="flex items-center justify-between rounded-xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-600 transition-all group-hover:bg-blue-600 group-hover:text-white">
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
        </div>
      </main>
    </div>
  );
}