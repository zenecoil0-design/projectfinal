"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  FaUserCircle,
  FaSignOutAlt,
  FaPlus,
  FaEnvelope,
  FaDatabase,
} from "react-icons/fa";

import { createClient } from "@/lib/supabase/client";

export default function DashboardPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // โหลดข้อมูลผู้ใช้ที่ Login อยู่
  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient();

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.replace("/login");
        return;
      }

      setUsername(
        user.user_metadata?.username ||
          user.user_metadata?.full_name ||
          "ผู้ใช้งาน"
      );

      setEmail(user.email || "");

      setIsLoading(false);
    };

    loadUser();
  }, [router]);

  // Logout
  const handleLogout = async () => {
    setIsLoggingOut(true);

    const supabase = createClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      setIsLoggingOut(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  };

  // Loading
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
      {/* ===================================================== */}
      {/* HEADER                                                */}
      {/* ===================================================== */}

      <header className="h-16 w-full border-b border-slate-200 bg-white">
        <div className="flex h-full items-center justify-between px-6 md:px-8">
          {/* Logo */}
          <Link
            href="/"
            className="text-xl font-black tracking-tight text-slate-900 transition-colors hover:text-blue-600 md:text-2xl"
          >
            Auto - Portfolio
          </Link>

          {/* User actions */}
          <div className="flex items-center gap-3">
            {/* User info */}
            <div className="hidden text-right md:block">
              <p className="max-w-[180px] truncate text-sm font-bold text-slate-800">
                {username}
              </p>

              <p className="max-w-[180px] truncate text-xs text-slate-400">
                {email}
              </p>
            </div>

            {/* Profile */}
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600">
              <FaUserCircle className="text-2xl" />
            </div>

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
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
                {isLoggingOut ? "กำลังออก..." : "ออกจากระบบ"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ===================================================== */}
      {/* MAIN                                                  */}
      {/* ===================================================== */}

      <main className="w-full px-5 py-7 md:px-8 md:py-8">
        <div className="mx-auto w-full max-w-[1600px]">
          {/* ================================================= */}
          {/* WELCOME CARD                                      */}
          {/* ================================================= */}

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
            {/* Decorative background */}
            <div className="pointer-events-none absolute -right-32 -top-40 h-[360px] w-[360px] rounded-full bg-blue-500/20 blur-3xl" />

            <div className="relative z-10 flex min-h-[180px] items-center">
              <div className="w-full max-w-3xl">
                {/* Dashboard label */}
                <div className="mb-3">
                  <span className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold text-blue-100 backdrop-blur">
                    Dashboard
                  </span>
                </div>

                {/* Greeting */}
                <h1 className="break-words text-3xl font-black leading-tight tracking-tight text-white md:text-4xl">
                  สวัสดี, {username} 👋
                </h1>

                {/* Description */}
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                  จัดการ Portfolio ของคุณ หรือเริ่มสร้างผลงานชิ้นใหม่ได้จากที่นี่
                </p>

                {/* Email */}
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

          {/* ================================================= */}
          {/* PORTFOLIO SECTION                                  */}
          {/* ================================================= */}

          <section className="mt-10">
            {/* Heading */}
            <div className="mb-6">
              <h2 className="text-2xl font-black leading-tight text-slate-900">
                พอร์ตฟอลิโอของฉัน
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                เริ่มสร้าง Portfolio ใหม่ได้จากที่นี่
              </p>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {/* Create Portfolio */}
              <Link
                href="/editor"
                className="
                  group
                  flex
                  min-h-[280px]
                  flex-col
                  justify-between
                  overflow-hidden
                  rounded-[26px]
                  border-2
                  border-dashed
                  border-slate-300
                  bg-white
                  p-6
                  transition-all
                  duration-300
                  hover:-translate-y-1
                  hover:border-blue-400
                  hover:shadow-xl
                "
              >
                <div>
                  {/* Icon */}
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition-all group-hover:bg-blue-600 group-hover:text-white">
                    <FaPlus />
                  </div>

                  {/* Text */}
                  <h3 className="mt-6 text-xl font-black leading-snug text-slate-900">
                    สร้าง Portfolio ใหม่
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    เริ่มกรอกข้อมูลและสร้าง Portfolio ของคุณ
                  </p>
                </div>

                <span className="mt-8 text-sm font-bold text-blue-600">
                  เริ่มสร้าง →
                </span>
              </Link>
              <Link
                    href="/my-data"
                    className="
                      group
                      flex
                      min-h-[280px]
                      flex-col
                      justify-between
                      overflow-hidden
                      rounded-[26px]
                      border
                      border-slate-200
                      bg-white
                      p-6
                      transition-all
                      duration-300
                      hover:-translate-y-1
                      hover:border-violet-300
                      hover:shadow-xl
                    "
                  >
                    <div>
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 transition-all group-hover:bg-violet-600 group-hover:text-white">
                        <FaDatabase />
                      </div>

                      <h3 className="mt-6 text-xl font-black leading-snug text-slate-900">
                        คลังข้อมูลของฉัน
                      </h3>

                      <p className="mt-3 text-sm leading-6 text-slate-500">
                        เก็บประวัติการศึกษา ผลงาน กิจกรรม และเกียรติบัตร
                        เพื่อเลือกใช้ซ้ำกับ Portfolio หลายเล่ม
                      </p>
                    </div>

                    <span className="mt-8 text-sm font-bold text-violet-600">
                      จัดการข้อมูล →
                    </span>
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}