"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  FaUser,
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaArrowRight,
  FaCheckCircle,
} from "react-icons/fa";

import AuthLayout from "@/components/auth/AuthLayout";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [username, setUsername] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [isLoading, setIsLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const handleRegister = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    const cleanUsername =
      username.trim();

    const cleanEmail =
      email.trim();

    if (
      !cleanUsername ||
      !cleanEmail ||
      !password ||
      !confirmPassword
    ) {
      setErrorMessage(
        "กรุณากรอกข้อมูลให้ครบทุกช่อง"
      );

      return;
    }

    if (password.length < 6) {
      setErrorMessage(
        "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"
      );

      return;
    }

    if (
      password !== confirmPassword
    ) {
      setErrorMessage(
        "รหัสผ่านทั้งสองช่องไม่ตรงกัน"
      );

      return;
    }

    setIsLoading(true);

    try {
      const { data, error } =
        await supabase.auth.signUp({
          email: cleanEmail,
          password,

          options: {
            data: {
              username:
                cleanUsername,
            },
          },
        });

      if (error) {
        throw error;
      }

      /*
        ถ้า Supabase เปิด Email Confirmation
        session อาจยังไม่มีจนกว่าผู้ใช้ยืนยันอีเมล
      */
      if (!data.session) {
        setSuccessMessage(
          "สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชีก่อนเข้าสู่ระบบ"
        );

        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "เกิดข้อผิดพลาดในการสมัครสมาชิก";
      if (
        message.includes(
          "already registered"
        )
      ) {
        setErrorMessage(
          "อีเมลนี้ถูกสมัครใช้งานแล้ว"
        );
      } else {
        setErrorMessage(
          message
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="สร้างบัญชีใหม่ ✨"
      description="สมัครสมาชิกเพื่อเริ่มสร้างและจัดเก็บ Portfolio ของคุณ"
    >
      <form
        onSubmit={handleRegister}
        className="space-y-5"
      >
        {/* Error */}
        {errorMessage && (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {errorMessage}
          </div>
        )}

        {/* Success */}
        {successMessage && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-medium leading-6 text-emerald-700">
            <div className="flex gap-3">
              <FaCheckCircle className="mt-1 shrink-0" />

              <div>
                {successMessage}

                <div className="mt-3">
                  <Link
                    href="/login"
                    className="font-bold text-emerald-800 underline"
                  >
                    ไปหน้าเข้าสู่ระบบ
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Username */}
        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700">
            ชื่อผู้ใช้
          </label>

          <div className="relative">
            <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400" />

            <input
              type="text"
              value={username}
              onChange={(event) =>
                setUsername(
                  event.target.value
                )
              }
              placeholder="ชื่อที่ต้องการใช้"
              autoComplete="username"
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
                outline-none
                transition-all
                focus:border-blue-500
                focus:ring-4
                focus:ring-blue-100
              "
            />
          </div>
        </div>

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
                setEmail(
                  event.target.value
                )
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
                outline-none
                transition-all
                focus:border-blue-500
                focus:ring-4
                focus:ring-blue-100
              "
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700">
            รหัสผ่าน
          </label>

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
              placeholder="อย่างน้อย 6 ตัวอักษร"
              autoComplete="new-password"
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
                outline-none
                transition-all
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
              aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              {showPassword ? (
                <FaEyeSlash />
              ) : (
                <FaEye />
              )}
            </button>
          </div>
        </div>

        {/* Confirm */}
        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700">
            ยืนยันรหัสผ่าน
          </label>

          <div className="relative">
            <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400" />

            <input
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value
                )
              }
              placeholder="กรอกรหัสผ่านอีกครั้ง"
              autoComplete="new-password"
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
                outline-none
                transition-all
                focus:border-blue-500
                focus:ring-4
                focus:ring-blue-100
              "
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={
            isLoading ||
            Boolean(successMessage)
          }
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
            ? "กำลังสร้างบัญชี..."
            : "สมัครสมาชิก"}

          {!isLoading && (
            <FaArrowRight className="text-xs" />
          )}
        </button>

        <p className="text-center text-sm text-slate-500">
          มีบัญชีอยู่แล้ว?{" "}
          <Link
            href="/login"
            className="font-bold text-blue-600 hover:text-blue-700"
          >
            เข้าสู่ระบบ
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}