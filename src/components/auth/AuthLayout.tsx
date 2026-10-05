"use client";

import Link from "next/link";
import {
  FaCheckCircle,
  FaFileAlt,
} from "react-icons/fa";

type AuthLayoutProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export default function AuthLayout({
  title,
  description,
  children,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-slate-50">
      <header className="h-16 w-full border-b border-slate-200 bg-white">
        <div className="flex h-full items-center justify-between px-6 md:px-8">
          <Link
            href="/"
            className="text-xl font-black tracking-tight text-slate-900 transition-colors hover:text-blue-600 md:text-2xl"
          >
            Auto - Portfolio
          </Link>

          <Link
            href="/"
            className="text-sm font-semibold text-slate-500 transition-colors hover:text-blue-600"
          >
            กลับหน้าแรก
          </Link>
        </div>
      </header>

      <main className="grid min-h-[calc(100vh-64px)] grid-cols-1 lg:grid-cols-[1fr_1fr]">
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-800 lg:flex">
          <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute -bottom-52 right-[-80px] h-[500px] w-[500px] rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative flex w-full flex-col justify-center px-14 xl:px-20">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white backdrop-blur">
              <FaFileAlt className="text-xl" />
            </div>

            <h1 className="mt-7 max-w-xl text-4xl font-black leading-tight text-white xl:text-5xl">
              สร้าง Portfolio
              <br />
              ได้ง่ายในที่เดียว
            </h1>

            <p className="mt-5 max-w-lg text-sm leading-7 text-slate-300 xl:text-base">
              เก็บข้อมูลส่วนตัว การศึกษา ผลงาน กิจกรรม และเกียรติบัตร
              แล้วจัดออกมาเป็น Portfolio ที่เป็นระเบียบ
            </p>

            <div className="mt-9 space-y-4">
              <Feature text="กรอกข้อมูลเป็นขั้นตอน ใช้งานง่าย" />
              <Feature text="ดู Live Preview แบบ A4 ขณะกรอกข้อมูล" />
              <Feature text="จัดข้อมูลและรูปภาพไว้ในที่เดียว" />
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-10 md:px-8">
          <div className="w-full max-w-[460px]">
            <div className="mb-8">
              <h2 className="text-3xl font-black tracking-tight text-slate-900">
                {title}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {description}
              </p>
            </div>

            {children}
          </div>
        </section>
      </main>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 text-sm font-semibold text-slate-200">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
        <FaCheckCircle className="text-xs" />
      </div>
      {text}
    </div>
  );
}
