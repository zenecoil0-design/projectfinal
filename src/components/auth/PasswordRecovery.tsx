"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import AuthLayout from "./AuthLayout";
import { createClient } from "@/lib/supabase/client";

const inputStyle = "h-14 w-full rounded-2xl border border-slate-300 px-4 text-base sm:text-sm focus:outline-2 focus:outline-blue-600 disabled:opacity-60";
const buttonStyle = "min-h-12 w-full rounded-2xl bg-slate-900 px-4 py-3 font-bold text-white disabled:opacity-50";
const acceptedMessage = "หากอีเมลนี้มีบัญชีที่ใช้งานได้ ระบบจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ กรุณาตรวจกล่องจดหมายและจดหมายขยะ";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const alive = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (lock.current || !email.trim()) return;
    lock.current = true; setBusy(true); setError(""); setSent(false);
    try {
      const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      // An account-specific rejection must not disclose whether an email exists.
      if (error && error.code !== "user_not_found") throw error;
      if (alive.current) setSent(true);
    } catch {
      if (alive.current) setError("ยังยืนยันการขอลิงก์ไม่ได้ กรุณารอสักครู่แล้วลองใหม่");
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }

  return <AuthLayout title="ลืมรหัสผ่าน" description="ขอลิงก์เพื่อตั้งรหัสผ่านใหม่">
    <form onSubmit={submit} className="space-y-5">
      {sent && <p role="status" className="rounded-xl bg-blue-50 p-4 text-slate-700">{acceptedMessage}</p>}
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <div><label htmlFor="recovery-email" className="mb-2 block font-bold">อีเมล</label>
        <input id="recovery-email" type="email" required autoComplete="email" value={email} disabled={busy} onChange={e => setEmail(e.target.value)} className={inputStyle} /></div>
      <p className="text-sm text-slate-600">เปิดลิงก์ในเบราว์เซอร์และอุปกรณ์เดียวกับที่ขอลิงก์ หากลิงก์หมดอายุหรือใช้แล้ว ให้ขอลิงก์ใหม่</p>
      <button className={buttonStyle} disabled={busy}>{busy ? "กำลังขอลิงก์…" : "ส่งลิงก์ตั้งรหัสผ่านใหม่"}</button>
      <Link href="/login" className="block text-center text-blue-700 underline">กลับเข้าสู่ระบบ</Link>
    </form>
  </AuthLayout>;
}

export function ResetPassword() {
  const [phase, setPhase] = useState<"checking" | "invalid" | "ready" | "saved">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const owner = useRef<string | null>(null);
  const version = useRef(0);
  const lock = useRef(false);

  useEffect(() => {
    const current = ++version.current;
    const client = createClient();
    let retired = false;
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      if (version.current !== current || retired) return;
      if (event === "SIGNED_OUT" || (owner.current && session?.user.id !== owner.current)) {
        retired = true;
        owner.current = null;
        setPassword(""); setConfirm(""); setError(""); setPhase("invalid");
      } else if (event === "PASSWORD_RECOVERY" && session?.user.id) {
        owner.current = session.user.id;
        setPhase("ready");
      }
    });
    // The SSR browser client performs PKCE exchange. Never exchange the code twice.
    void client.auth.initialize().then(() => {
      if (version.current !== current) return;
      window.history.replaceState(window.history.state, "", "/reset-password");
      if (!owner.current) setPhase("invalid");
    }).catch(() => {
      if (version.current === current) setPhase("invalid");
    });
    return () => { version.current = current + 1; owner.current = null; subscription.unsubscribe(); };
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (lock.current || phase !== "ready" || !owner.current) return;
    if (password.length < 6) { setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"); return; }
    if (password !== confirm) { setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน"); return; }
    const current = version.current, expectedOwner = owner.current;
    const isCurrent = () => current === version.current && owner.current === expectedOwner;
    lock.current = true; setBusy(true); setError("");
    try {
      const client = createClient();
      const { data, error: authError } = await client.auth.getUser();
      if (!isCurrent()) return;
      if (authError || data.user?.id !== expectedOwner) {
        owner.current = null; setPassword(""); setConfirm(""); setPhase("invalid"); return;
      }
      const { data: updated, error: saveError } = await client.auth.updateUser({ password });
      if (!isCurrent()) return;
      if (saveError || updated.user?.id !== expectedOwner) throw saveError;
      setPassword(""); setConfirm(""); setPhase("saved");
      // Keep the verified session. No claim that other devices have been signed out.
    } catch {
      if (isCurrent()) setError("ยังยืนยันการเปลี่ยนรหัสผ่านไม่ได้ กรุณาลองเข้าสู่ระบบด้วยรหัสใหม่ก่อน หากไม่ได้ให้ขอลิงก์ใหม่");
    } finally {
      lock.current = false;
      if (current === version.current) setBusy(false);
    }
  }

  return <AuthLayout title="ตั้งรหัสผ่านใหม่" description="ใช้ลิงก์กู้บัญชีที่ส่งให้ทางอีเมล">
    {phase === "checking" && <p role="status">กำลังตรวจสอบลิงก์…</p>}
    {phase === "invalid" && <div className="space-y-4"><p role="alert">ลิงก์ใช้ไม่ได้ หมดอายุ หรือเปิดต่างเบราว์เซอร์ กรุณาขอลิงก์ใหม่</p><Link href="/forgot-password" className="text-blue-700 underline">ขอลิงก์ใหม่</Link></div>}
    {phase === "saved" && <div className="space-y-4"><p role="status">เปลี่ยนรหัสผ่านแล้ว</p><Link href="/dashboard" className="text-blue-700 underline">ไปหน้า Dashboard</Link></div>}
    {phase === "ready" && <form onSubmit={submit} className="space-y-5">
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <div><label htmlFor="new-password" className="mb-2 block font-bold">รหัสผ่านใหม่</label><input id="new-password" type="password" autoComplete="new-password" required minLength={6} value={password} disabled={busy} onChange={e => setPassword(e.target.value)} className={inputStyle} /></div>
      <div><label htmlFor="confirm-password" className="mb-2 block font-bold">ยืนยันรหัสผ่านใหม่</label><input id="confirm-password" type="password" autoComplete="new-password" required minLength={6} value={confirm} disabled={busy} onChange={e => setConfirm(e.target.value)} className={inputStyle} /></div>
      <button className={buttonStyle} disabled={busy}>{busy ? "กำลังบันทึก…" : "บันทึกรหัสผ่านใหม่"}</button>
      <Link href="/forgot-password" className="block text-blue-700 underline">ขอลิงก์ใหม่</Link>
    </form>}
  </AuthLayout>;
}
