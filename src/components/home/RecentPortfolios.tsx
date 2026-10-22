"use client";

import {
  useEffect,
  useRef,
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
import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { formatPortfolioDate, portfolioTemplateName, parseDashboardPortfolios, type DashboardPortfolio } from "@/lib/dashboard-portfolios";

import CreatePortfolioModal from "@/components/portfolio/CreatePortfolioModal";

type Phase = "auth-loading" | "guest" | "auth-error" | "session-changed" | "list-loading" | "list-error" | "success";

export default function RecentPortfolios() {
  const [
    portfolios,
    setPortfolios,
  ] =
    useState<DashboardPortfolio[]>(
      []
    );

  const [phase, setPhase] = useState<Phase>("auth-loading");
  const retry = useRef<{ auth: () => Promise<void>; list: () => Promise<void> } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let active = true, version = 0, checking = false, reading = false;
    let observedOwner: string | null | undefined;
    let verifiedOwner: string | null = null;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const next = session?.user.id ?? null;
      // SDK recovery may emit SIGNED_IN before INITIAL_SESSION. Bind the first
      // owner; the getUser result must still match it before any private query.
      const changed = event === "SIGNED_OUT" || (observedOwner !== undefined && next !== observedOwner);
      observedOwner = next;
      if (!active || !changed) return;
      ++version; verifiedOwner = null; checking = false; reading = false;
      setPortfolios([]);
      setPhase(next === null ? "guest" : "session-changed");
    });
    const loadList = async () => {
      if (!active || reading || !verifiedOwner) return;
      reading = true;
      const token = version, owner = verifiedOwner;
      const current = () => active && token === version && owner === verifiedOwner;
      setPhase("list-loading");
      try {
        const { data, error } = await supabase.from("portfolios")
          .select("id, title, template_key, created_at, updated_at")
          .eq("user_id", owner).order("updated_at", { ascending: false }).limit(3);
        if (!current()) return;
        if (error) throw error;
        setPortfolios(parseDashboardPortfolios(data));
        setPhase("success");
      } catch {
        if (current()) setPhase("list-error");
      } finally { if (current()) reading = false; }
    };
    const verifyUser = async () => {
      if (!active || checking) return;
      checking = true;
      const token = ++version;
      const current = () => active && token === version;
      setPhase("auth-loading");
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (!current()) return;
        if (error && !isAuthSessionMissingError(error)) throw error;
        if (!user) { verifiedOwner = null; setPortfolios([]); setPhase("guest"); return; }
        if (observedOwner !== undefined && user.id !== observedOwner) {
          verifiedOwner = null; setPortfolios([]); setPhase("session-changed"); return;
        }
        observedOwner = user.id; verifiedOwner = user.id;
        await loadList();
      } catch {
        if (current()) { verifiedOwner = null; setPhase("auth-error"); }
      } finally { if (current()) checking = false; }
    };
    retry.current = { auth: verifyUser, list: loadList };
    void verifyUser();
    return () => {
      active = false; ++version; verifiedOwner = null; retry.current = null;
      subscription.unsubscribe();
    };
  }, []);



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
    <section aria-label="พอร์ตล่าสุด" className="mt-10 w-full min-w-0 pb-12">
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

        {/* Keep the create modal mounted independently of auth/list state. */}
        {phase !== "success" && (
          <div className="flex min-h-[300px] min-w-0 flex-col items-start justify-center gap-4 rounded-[26px] border border-slate-200 bg-white p-6">
            <p role={phase === "auth-error" || phase === "list-error" ? "alert" : "status"} className="break-words text-sm leading-6 text-slate-600">
              {phase === "auth-loading" && "กำลังตรวจสอบบัญชีผู้ใช้…"}
              {phase === "guest" && "เข้าสู่ระบบเพื่อดูพอร์ตล่าสุดของคุณ"}
              {phase === "auth-error" && "ยืนยันบัญชีผู้ใช้ไม่สำเร็จ กรุณาลองตรวจสอบบัญชีอีกครั้ง"}
              {phase === "session-changed" && "บัญชีผู้ใช้เปลี่ยนแล้ว กรุณาตรวจสอบบัญชีอีกครั้งเพื่อดูพอร์ตล่าสุด"}
              {phase === "list-loading" && "กำลังโหลดรายการพอร์ต…"}
              {phase === "list-error" && "โหลดรายการพอร์ตล่าสุดไม่สำเร็จ กรุณาลองอีกครั้ง"}
            </p>
            {(phase === "list-error" || phase === "list-loading") && (
              <button type="button" disabled={phase === "list-loading"} onClick={() => { void retry.current?.list(); }} className="min-h-11 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:opacity-60">
                {phase === "list-loading" ? "กำลังโหลด…" : "ลองใหม่"}
              </button>
            )}
            {(phase === "auth-error" || phase === "session-changed" || phase === "auth-loading") && (
              <button type="button" disabled={phase === "auth-loading"} onClick={() => { void retry.current?.auth(); }} className="min-h-11 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:opacity-60">
                {phase === "auth-loading" ? "กำลังตรวจสอบ…" : "ตรวจสอบบัญชีอีกครั้ง"}
              </button>
            )}
          </div>
        )}
        {phase === "success" && portfolios.length === 0 && (
          <p role="status" className="flex min-h-[300px] items-center rounded-[26px] border border-slate-200 bg-white p-6 text-sm leading-6 text-slate-600">
            ยังไม่มีพอร์ต เริ่มสร้างพอร์ตแรกของคุณได้เลย
          </p>
        )}

        {/* PORTFOLIOS */}

        {phase === "success" &&
          portfolios.map(
            (
              portfolio
            ) => (
              <Link
                key={
                  portfolio.id
                }
                href={`/editor?portfolio=${encodeURIComponent(portfolio.id)}`}
                data-recent-portfolio-id={portfolio.id}
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

                    {portfolioTemplateName(
                      portfolio.template_key
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-400">
                    <FaClock />

                    {formatPortfolioDate(
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
