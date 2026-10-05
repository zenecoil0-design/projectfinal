"use client";

import Link from "next/link";
import {
  FaPlus,
  FaUserCircle,
} from "react-icons/fa";

export default function HomeHeader() {
  return (
    <header className="sticky top-0 z-50 h-16 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
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
          {/* Create */}
          <Link
            href="/editor"
            className="hidden items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-600 md:flex"
          >
            <FaPlus className="text-xs" />

            สร้างผลงานใหม่
          </Link>

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