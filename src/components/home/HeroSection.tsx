"use client";

import Link from "next/link";
import {
  FaArrowRight,
  FaCheckCircle,
  FaEye,
  FaFileAlt,
} from "react-icons/fa";

export default function HeroSection() {
  return (
    <section className="relative w-full overflow-hidden rounded-[30px] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-800 shadow-[0_25px_70px_rgba(15,23,42,0.18)]">
      <div className="pointer-events-none absolute -right-40 -top-40 h-[420px] w-[420px] rounded-full bg-blue-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-52 left-[30%] h-[420px] w-[420px] rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative grid min-h-[440px] grid-cols-1 items-center gap-10 px-6 py-10 md:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-14">
        <div className="max-w-3xl text-white">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold text-slate-100 backdrop-blur-md">
            <FaCheckCircle className="text-emerald-300" />
            ระบบสร้าง Portfolio สำหรับนักเรียน
          </div>

          <h1 className="text-4xl font-black leading-[1.15] tracking-tight md:text-5xl xl:text-6xl">
            สร้าง Portfolio
            <br />
            ที่ดูดีได้ง่ายกว่าเดิม
          </h1>

          <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300 md:text-base">
            กรอกข้อมูลเป็นขั้นตอน แล้วดูผลลัพธ์บนหน้ากระดาษ A4 แบบเรียลไทม์
            เพื่อช่วยให้จัดข้อมูลและผลงานได้เป็นระเบียบมากขึ้น
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/editor"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-bold text-slate-900 shadow-xl shadow-black/10 transition-all hover:-translate-y-0.5 hover:bg-blue-50"
            >
              เริ่มสร้าง Portfolio
              <FaArrowRight className="text-xs" />
            </Link>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-3.5 text-sm font-bold text-white backdrop-blur transition-all hover:bg-white/15"
            >
              ดูผลงานของฉัน
            </Link>
          </div>

          <div className="mt-9 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
            <FeatureCard
              title="กรอกง่าย"
              description="แบ่งข้อมูลออกเป็นขั้นตอนอย่างชัดเจน"
            />
            <FeatureCard
              title="A4 Layout"
              description="จัดข้อมูลให้อยู่ในสัดส่วนเอกสารจริง"
            />
            <FeatureCard
              title="Live Preview"
              description="เห็นการเปลี่ยนแปลงของ Portfolio ได้ทันที"
              icon={<FaEye className="text-sm" />}
            />
          </div>
        </div>

        <div className="relative hidden min-h-[360px] items-center justify-center lg:flex">
          <div className="absolute right-[7%] top-[15%] h-[310px] w-[220px] rotate-[8deg] rounded-[26px] border border-white/20 bg-white/90 p-4 shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-2 text-slate-800">
              <FaFileAlt className="text-blue-600" />
              <span className="text-xs font-extrabold">Portfolio Preview</span>
            </div>

            <div className="mt-5 h-20 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-400" />
            <div className="mt-4 space-y-3">
              <div className="h-3 w-28 rounded-full bg-slate-300" />
              <div className="h-2.5 rounded-full bg-slate-200" />
              <div className="h-2.5 w-4/5 rounded-full bg-slate-200" />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className="h-16 rounded-xl bg-slate-200" />
              <div className="h-16 rounded-xl bg-slate-300" />
            </div>
          </div>

          <div className="absolute left-[8%] top-[4%] z-10 h-[350px] w-[250px] rotate-[-6deg] rounded-[28px] bg-white p-4 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
            <div className="h-full rounded-[21px] bg-slate-100 p-4">
              <div className="flex items-center justify-between">
                <div className="h-3 w-24 rounded-full bg-slate-700" />
                <div className="h-7 w-7 rounded-full bg-blue-500" />
              </div>

              <div className="mt-5 h-24 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-400" />

              <div className="mt-4 flex items-center gap-3">
                <div className="h-14 w-14 shrink-0 rounded-full border-4 border-white bg-slate-300 shadow-sm" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-28 rounded-full bg-slate-400" />
                  <div className="h-2.5 w-36 rounded-full bg-slate-200" />
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="h-2.5 rounded-full bg-slate-300" />
                <div className="h-2.5 rounded-full bg-slate-200" />
                <div className="h-2.5 w-4/5 rounded-full bg-slate-200" />
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="h-20 rounded-2xl bg-white shadow-sm" />
                <div className="h-20 rounded-2xl bg-white shadow-sm" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4 backdrop-blur">
      <div className="flex items-center gap-2 text-lg font-black">
        {icon}
        {title}
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-300">
        {description}
      </p>
    </div>
  );
}
