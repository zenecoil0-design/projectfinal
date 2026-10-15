"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  FaArrowLeft,
  FaBook,
  FaCertificate,
  FaTrophy,
} from "react-icons/fa";

import { createClient } from "@/lib/supabase/client";

import { LibraryDraftGuard, useLibraryGuard } from "@/components/my-data/LibraryDraftGuard";
import EducationLibrary from "@/components/my-data/EducationLibrary";
import ActivityLibrary from "@/components/my-data/ActivityLibrary";
import CertificateLibrary from "@/components/my-data/CertificateLibrary";

type TabType =
  | "education"
  | "activity"
  | "certificate";

export default function MyDataPage() {
  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [activeTab, setActiveTab] =
    useState<TabType>("activity");

  const [isLoading, setIsLoading] =
    useState(true);

  const [accountId, setAccountId] = useState("");

  useEffect(() => {
    let active = true;
    let revision = 0;
    let verifiedOwner = "";
    let timer: ReturnType<typeof setTimeout> | undefined;
    const checkUser = async () => {
      const ticket = ++revision;
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!active || ticket !== revision) return;
      if (error || !user) {
        router.replace(
          "/login?next=/my-data"
        );

        return;
      }

      verifiedOwner = user.id;
      setAccountId(user.id);
      setIsLoading(false);
    };

    void checkUser();
    // Only invalidate the UI here. Auth verification still uses getUser above.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user.id === verifiedOwner) return;
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      revision++;
      setIsLoading(true);
      clearTimeout(timer);
      timer = setTimeout(() => { if (active) void checkUser(); }, 0);
    });
    return () => { active = false; revision++; clearTimeout(timer); subscription.unsubscribe(); };
  }, [router, supabase]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-4 text-sm font-medium text-slate-500">
            กำลังโหลดคลังข้อมูล...
          </p>
        </div>
      </div>
    );
  }

  return <LibraryDraftGuard key={accountId}>
    <LibraryContent accountId={accountId} activeTab={activeTab} setActiveTab={setActiveTab} />
  </LibraryDraftGuard>;
}

function LibraryContent({ accountId, activeTab, setActiveTab }: {
  accountId: string; activeTab: TabType; setActiveTab: (tab: TabType) => void;
}) {
  const router = useRouter();
  const { requestExit, busy } = useLibraryGuard();
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-[1500px] items-center px-4 py-3 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/dashboard"
              onNavigate={event => { event.preventDefault(); requestExit(() => router.push("/dashboard")); }}
              aria-label="กลับ Dashboard"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              <FaArrowLeft />
            </Link>

            <div className="min-w-0">
              <h1 className="text-lg font-black text-slate-900">
                คลังข้อมูลของฉัน
              </h1>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                บันทึกข้อมูลครั้งเดียว แล้วนำไปใช้กับ Portfolio หลายเล่ม
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="@container mx-auto w-full min-w-0 max-w-[1500px] px-4 py-6 wrap-anywhere md:px-8">
        <section className="rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-800 p-5 text-white sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-200">
            My Data Library
          </p>

          <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
            เก็บข้อมูลของคุณไว้ใช้ซ้ำ
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
            เพิ่มข้อมูลการศึกษา ผลงาน กิจกรรม และเกียรติบัตรไว้ในบัญชีของคุณ
            แล้วเลือกเฉพาะรายการที่ต้องการเมื่อสร้าง Portfolio
          </p>
        </section>

        <section className="mt-6">
          <div role="group" aria-label="หมวดคลังข้อมูล" className="grid min-w-0 grid-cols-1 gap-2 @min-[40rem]:grid-cols-3">
            <TabButton disabled={busy}
              active={
                activeTab === "education"
              }
              icon={<FaBook />}
              title="ประวัติการศึกษา"
              onClick={() =>
                activeTab !== "education" && requestExit(() => setActiveTab("education"))
              }
            />

            <TabButton disabled={busy}
              active={
                activeTab === "activity"
              }
              icon={<FaTrophy />}
              title="ผลงานและกิจกรรม"
              onClick={() =>
                activeTab !== "activity" && requestExit(() => setActiveTab("activity"))
              }
            />

            <TabButton disabled={busy}
              active={
                activeTab === "certificate"
              }
              icon={<FaCertificate />}
              title="เกียรติบัตร"
              onClick={() =>
                activeTab !== "certificate" && requestExit(() => setActiveTab("certificate"))
              }
            />
          </div>
        </section>

        {activeTab === "education" && (
          <EducationLibrary key={accountId} ownerId={accountId} />
        )}

        {activeTab === "activity" && (
          <ActivityLibrary key={accountId} ownerId={accountId} />
        )}

        {activeTab ===
          "certificate" && (
          <CertificateLibrary key={accountId} ownerId={accountId} />
        )}
      </main>
    </div>
  );
}

function TabButton({
  disabled,
  active,
  icon,
  title,
  onClick,
}: {
  disabled: boolean;
  active: boolean;
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-h-11 min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
        active
          ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-100"
          : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"
      }`}
    >
      <div
        aria-hidden="true"
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
          active
            ? "bg-white/15"
            : "bg-slate-100"
        }`}
      >
        {icon}
      </div>

      <span className="min-w-0 text-sm font-semibold leading-6">
        {title}
      </span>
    </button>
  );
}
