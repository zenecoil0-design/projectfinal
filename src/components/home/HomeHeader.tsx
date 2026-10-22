"use client";

import Link from "next/link";
import CreatePortfolioModal from "@/components/portfolio/CreatePortfolioModal";
import {
  FaPlus,
  FaUserCircle,
  FaDatabase,
} from "react-icons/fa";

export default function HomeHeader() {
  return (
    <header className="sticky top-0 z-50 h-16 w-full border-b border-slate-200 bg-white">
      <div className="flex h-full w-full items-center justify-between px-5 md:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="text-xl font-extrabold tracking-tight text-slate-900 transition-colors hover:text-blue-600 md:text-2xl"
        >
          Auto - Portfolio
        </Link>

        {/* Right */}
        <div className="flex items-center gap-3">
          {/* Sidebar is hidden on mobile; keep the personal library reachable. */}
          <Link
            href="/my-data"
            aria-label="เปิดคลังข้อมูล"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-violet-200 bg-violet-50 text-violet-700 transition-colors hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 md:hidden"
          >
            <FaDatabase aria-hidden="true" className="text-lg" />
          </Link>

          {/* Create */}
          <CreatePortfolioModal>
            <button
              type="button"
              className="hidden items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-600 md:flex"
            >
              <FaPlus className="text-xs" />

              สร้างผลงานใหม่
            </button>
          </CreatePortfolioModal>

          {/* Profile / Dashboard */}
          <Link
            href="/dashboard"
            aria-label="ไปหน้า Dashboard"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
          >
            <FaUserCircle className="text-2xl" />
          </Link>
        </div>
      </div>
    </header>
  );
}