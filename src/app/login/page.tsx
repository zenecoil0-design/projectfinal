"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";

import {
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaArrowRight,
} from "react-icons/fa";

import AuthLayout from "@/components/auth/AuthLayout";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();

  const rawNext =
  searchParams.get("next");

const nextPath =
  rawNext &&
  rawNext.startsWith("/") &&
  !rawNext.startsWith("//")
    ? rawNext
    : "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const handleLogin = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    setErrorMessage("");

    if (!email.trim() || !password) {
      setErrorMessage(
        "กรุณากรอกอีเมลและรหัสผ่านให้ครบ"
      );

      return;
    }

    setIsLoading(true);

    try {
      const { error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (error) {
        throw error;
      }

      router.push(nextPath);
      router.refresh();
    } catch (error: any) {
      if (
        error?.message?.includes(
          "Invalid login credentials"
        )
      ) {
        setErrorMessage(
          "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
        );
      } else if (
        error?.message?.includes(
          "Email not confirmed"
        )
      ) {
        setErrorMessage(
          "กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ"
        );
      } else {
        setErrorMessage(
          error?.message ||
            "เกิดข้อผิดพลาดในการเข้าสู่ระบบ"
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="ยินดีต้อนรับกลับ 👋"
      description="เข้าสู่ระบบเพื่อจัดการและสร้าง Portfolio ของคุณต่อ"
    >
      <form
        onSubmit={handleLogin}
        className="space-y-5"
      >
        {/* Error */}
        {errorMessage && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {errorMessage}
          </div>
        )}

        {/* Email */}
        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700">
            อีเมล
          </label>

          <div className="relative">
            <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400" />

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="your@email.com"
              autoComplete="email"
              className="
                h-14
                w-full
                rounded-2xl
                border
                border-slate-300
                bg-white
                pl-11
                pr-4
                text-sm
                text-slate-800
                outline-none
                transition-all
                placeholder:text-slate-400
                focus:border-blue-500
                focus:ring-4
                focus:ring-blue-100
              "
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-bold text-slate-700">
              รหัสผ่าน
            </label>
          </div>

          <div className="relative">
            <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400" />

            <input
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              placeholder="กรอกรหัสผ่าน"
              autoComplete="current-password"
              className="
                h-14
                w-full
                rounded-2xl
                border
                border-slate-300
                bg-white
                pl-11
                pr-12
                text-sm
                text-slate-800
                outline-none
                transition-all
                placeholder:text-slate-400
                focus:border-blue-500
                focus:ring-4
                focus:ring-blue-100
              "
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(
                  !showPassword
                )
              }
              aria-label={
                showPassword
                  ? "ซ่อนรหัสผ่าน"
                  : "แสดงรหัสผ่าน"
              }
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700"
            >
              {showPassword ? (
                <FaEyeSlash />
              ) : (
                <FaEye />
              )}
            </button>
          </div>
        </div>

        {/* Login */}
        <button
          type="submit"
          disabled={isLoading}
          className="
            flex
            h-14
            w-full
            items-center
            justify-center
            gap-2
            rounded-2xl
            bg-slate-900
            text-sm
            font-bold
            text-white
            shadow-lg
            shadow-slate-200
            transition-all
            hover:bg-blue-600
            disabled:cursor-not-allowed
            disabled:opacity-60
          "
        >
          {isLoading
            ? "กำลังเข้าสู่ระบบ..."
            : "เข้าสู่ระบบ"}

          {!isLoading && (
            <FaArrowRight className="text-xs" />
          )}
        </button>

        <div className="text-center text-sm text-slate-500">
          ยังไม่มีบัญชี?{" "}
          <Link
            href="/register"
            className="font-bold text-blue-600 hover:text-blue-700"
          >
            สมัครสมาชิก
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}