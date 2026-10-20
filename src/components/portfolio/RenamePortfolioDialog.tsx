"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type RenamedPortfolio = { id: string; title: string; updated_at: string | null };
export const renameFailure = "ยืนยันการเปลี่ยนชื่อพอร์ตไม่สำเร็จ ชื่อที่พิมพ์ยังอยู่ กรุณาลองบันทึกอีกครั้ง";

// Treat the returned representation as untrusted, including an empty successful response.
export function confirmedRename(value: unknown, id: string, owner: string, title: string): RenamedPortfolio | null {
  if (!value || typeof value !== "object" || !("id" in value) || value.id !== id ||
    !("user_id" in value) || value.user_id !== owner || !("title" in value) || value.title !== title ||
    !("updated_at" in value) || (value.updated_at !== null && typeof value.updated_at !== "string")) return null;
  return { id, title, updated_at: value.updated_at };
}

export default function RenamePortfolioDialog({ portfolio, ownerId, trigger, onClose, onSaved }: {
  portfolio: { id: string; title: string | null }; ownerId: string; trigger: HTMLButtonElement;
  onClose: () => void; onSaved: (row: RenamedPortfolio) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const alive = useRef(false);
  const inFlight = useRef(false);
  const [title, setTitle] = useState(portfolio.title ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    alive.current = true;
    const element = dialog.current;
    element?.showModal();
    return () => {
      alive.current = false;
      element?.close();
      if (trigger.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [trigger]);

  const close = () => { if (!inFlight.current) onClose(); };
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) return;
    const cleanTitle = title.trim();
    if (!cleanTitle) { setError("กรุณาตั้งชื่อ Portfolio"); return; }
    if (cleanTitle === (portfolio.title ?? "").trim()) { onClose(); return; }
    inFlight.current = true;
    setSaving(true); setError("");
    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!alive.current) return;
      if (authError || !user || user.id !== ownerId) throw new Error("unconfirmed owner");
      const { data, error: updateError } = await supabase.from("portfolios")
        .update({ title: cleanTitle }).eq("id", portfolio.id).eq("user_id", ownerId)
        .select("id, user_id, title, updated_at").single();
      if (!alive.current) return;
      const row = confirmedRename(data, portfolio.id, ownerId, cleanTitle);
      if (updateError || !row) throw new Error("unconfirmed rename");
      onSaved(row);
    } catch {
      if (alive.current) setError(renameFailure);
    } finally {
      inFlight.current = false;
      if (alive.current) setSaving(false);
    }
  };

  return <dialog ref={dialog} aria-labelledby="rename-title" aria-describedby="rename-description" tabIndex={-1}
    onCancel={event => { event.preventDefault(); close(); }}
    onKeyDown={event => {
      if (event.key !== "Tab") return;
      const controls = dialog.current?.querySelectorAll<HTMLElement>("input:not(:disabled), button:not(:disabled)");
      if (!controls?.length) { event.preventDefault(); dialog.current?.focus(); return; }
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }}
    className="fixed inset-0 m-auto max-h-[calc(100dvh-32px)] w-[min(520px,calc(100vw-32px))] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-800 shadow-2xl backdrop:bg-slate-950/60 sm:p-6">
    <h2 id="rename-title" className="text-lg font-bold">เปลี่ยนชื่อพอร์ต</h2>
    <p id="rename-description" className="mt-2 text-sm leading-6 text-slate-500">ชื่อนี้ใช้จัดการพอร์ตและตั้งชื่อไฟล์ PDF แยกจากหัวเรื่องและชื่อบนหน้าปก</p>
    <p className="mt-3 text-sm leading-6 wrap-anywhere">ชื่อปัจจุบัน: {portfolio.title || "ยังไม่ได้ตั้งชื่อ"}</p>
    <form onSubmit={save} className="mt-5">
      <label htmlFor="rename-portfolio-name" className="mb-2 block text-sm font-bold">ชื่อพอร์ต</label>
      <input id="rename-portfolio-name" autoFocus value={title} disabled={saving}
        onChange={event => { setTitle(event.target.value); setError(""); }} aria-invalid={!!error}
        aria-describedby={error ? "rename-error" : undefined}
        className="min-h-12 w-full min-w-0 rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100" />
      {error && <p id="rename-error" role="alert" className="mt-3 text-sm leading-6 text-red-700 wrap-anywhere">{error}</p>}
      {saving && <p role="status" className="mt-3 text-sm text-slate-500">กำลังบันทึกชื่อ กรุณารอสักครู่</p>}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button type="button" disabled={saving} onClick={close} className="min-h-11 rounded-xl border border-slate-300 px-4 py-3 font-semibold focus-visible:outline-2 focus-visible:outline-blue-500 disabled:opacity-50">ยกเลิก</button>
        <button type="submit" disabled={saving} className="min-h-11 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white focus-visible:outline-2 focus-visible:outline-blue-500 disabled:opacity-50">{saving ? "กำลังบันทึก…" : "บันทึกชื่อ"}</button>
      </div>
    </form>
  </dialog>;
}
