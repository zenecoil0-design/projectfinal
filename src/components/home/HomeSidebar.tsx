"use client";

import Link from "next/link";

import {
  FaPlus,
  FaFolderOpen,
  FaUserCircle,
  FaDatabase,
} from "react-icons/fa";

import CreatePortfolioModal from "@/components/portfolio/CreatePortfolioModal";

export default function HomeSidebar() {
  return (
    <aside className="hidden w-24 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
      <div className="flex flex-1 flex-col items-center gap-3 px-3 py-6">
        {/* Create */}
        <CreatePortfolioModal>
          <button
            type="button"
            className="group flex w-full flex-col items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-2 py-4 transition-all hover:border-blue-300 hover:bg-blue-100"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-200 transition-transform group-hover:scale-105">
              <FaPlus />
            </div>

            <span className="text-[11px] font-bold text-blue-600">
              สร้าง
            </span>
          </button>
        </CreatePortfolioModal>

        {/* My Data */}
        <Link
          href="/my-data"
          className="group flex w-full flex-col items-center gap-2 rounded-2xl px-2 py-4 transition-all hover:bg-violet-50"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-50 text-violet-600 transition-all group-hover:bg-violet-600 group-hover:text-white">
            <FaDatabase />
          </div>

          <span className="text-center text-[11px] font-bold text-slate-500 transition-colors group-hover:text-violet-600">
            คลังข้อมูล
          </span>
        </Link>

        {/* My Portfolio */}
        <Link
          href="/dashboard"
          className="group flex w-full flex-col items-center gap-2 rounded-2xl px-2 py-4 transition-all hover:bg-slate-100"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all group-hover:bg-blue-100 group-hover:text-blue-600">
            <FaFolderOpen />
          </div>

          <span className="text-center text-[11px] font-bold text-slate-500 group-hover:text-blue-600">
            พอร์ตของฉัน
          </span>
        </Link>

        {/* Profile */}
        <div className="mt-auto">
          <Link
            href="/dashboard"
            aria-label="Dashboard"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
          >
            <FaUserCircle className="text-2xl" />
          </Link>
        </div>
      </div>
    </aside>
  );
}