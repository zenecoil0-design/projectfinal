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

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.replace(
          "/login?next=/my-data"
        );

        return;
      }

      setIsLoading(false);
    };

    checkUser();
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center px-5 md:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <FaArrowLeft />
            </Link>

            <div>
              <h1 className="text-lg font-black text-slate-900">
                คลังข้อมูลของฉัน
              </h1>

              <p className="text-xs text-slate-400">
                บันทึกข้อมูลครั้งเดียว แล้วนำไปใช้กับ Portfolio หลายเล่ม
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1500px] px-5 py-8 md:px-8">
        <section className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-800 px-7 py-8 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-200">
            My Data Library
          </p>

          <h2 className="mt-3 text-3xl font-black">
            เก็บข้อมูลของคุณไว้ใช้ซ้ำ
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
            เพิ่มข้อมูลการศึกษา ผลงาน กิจกรรม และเกียรติบัตรไว้ในบัญชีของคุณ
            แล้วเลือกเฉพาะรายการที่ต้องการเมื่อสร้าง Portfolio
          </p>
        </section>

        <section className="mt-8">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <TabButton
              active={
                activeTab === "education"
              }
              icon={<FaBook />}
              title="ประวัติการศึกษา"
              onClick={() =>
                setActiveTab("education")
              }
            />

            <TabButton
              active={
                activeTab === "activity"
              }
              icon={<FaTrophy />}
              title="ผลงานและกิจกรรม"
              onClick={() =>
                setActiveTab("activity")
              }
            />

            <TabButton
              active={
                activeTab === "certificate"
              }
              icon={<FaCertificate />}
              title="เกียรติบัตร"
              onClick={() =>
                setActiveTab("certificate")
              }
            />
          </div>
        </section>

        {activeTab === "education" && (
          <EducationLibrary />
        )}

        {activeTab === "activity" && (
          <ActivityLibrary />
        )}

        {activeTab ===
          "certificate" && (
          <CertificateLibrary />
        )}
      </main>
    </div>
  );
}

function TabButton({
  active,
  icon,
  title,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
        active
          ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-100"
          : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"
      }`}
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          active
            ? "bg-white/15"
            : "bg-slate-100"
        }`}
      >
        {icon}
      </div>

      <span className="font-bold">
        {title}
      </span>
    </button>
  );
}