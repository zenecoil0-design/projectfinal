"use client";

import Link from "next/link";

import {
  FaPlus,
  FaArrowRight,
} from "react-icons/fa";

export default function RecentPortfolios() {
  return (
    <section className="mt-10 w-full pb-12">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
          ล่าสุด
        </h2>

        <p className="mt-1.5 text-sm text-slate-500">
          เริ่มสร้าง Portfolio ชิ้นแรกของคุณ
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* Create Portfolio */}
        <Link
          href="/editor"
          className="group min-h-[280px] rounded-[26px] border-2 border-dashed border-slate-300 bg-white p-6 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-400 hover:shadow-xl"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition-all group-hover:bg-blue-600 group-hover:text-white">
            <FaPlus className="text-lg" />
          </div>

          <div className="mt-7">
            <h3 className="text-xl font-black text-slate-900">
              สร้างผลงานใหม่
            </h3>

            <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
              เริ่มกรอกข้อมูลเพื่อสร้างแฟ้มสะสมผลงานของคุณ
            </p>
          </div>

          <div className="mt-9 inline-flex items-center gap-2 text-sm font-bold text-blue-600">
            เริ่มสร้าง

            <FaArrowRight className="text-xs transition-transform group-hover:translate-x-1" />
          </div>
        </Link>
      </div>
    </section>
  );
}