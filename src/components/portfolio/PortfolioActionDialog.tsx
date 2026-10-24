"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";

export type PortfolioActionResult =
  | { status: "confirmed"; portfolioId: string }
  | { status: "rejected" }
  | { status: "uncertain" };
export type DuplicatePortfolioRequest = { sourceId: string; title: string };
export type PortfolioActionTarget = { id: string; title: string | null };

type CommonProps = {
  open: boolean;
  ownerId: string;
  portfolio: PortfolioActionTarget;
  trigger: HTMLButtonElement | null;
  onClose: () => void;
  onConfirmed: (result: { portfolioId: string }) => void;
};
export type DuplicatePortfolioDialogProps = CommonProps & {
  onSubmit: (request: DuplicatePortfolioRequest) => Promise<unknown>;
  onVerify?: (request: DuplicatePortfolioRequest) => Promise<unknown>;
};
export type DeletePortfolioDialogProps = CommonProps & {
  onSubmit: (portfolioId: string) => Promise<unknown>;
  onVerify?: (portfolioId: string) => Promise<unknown>;
};

export function DuplicatePortfolioDialog(props: DuplicatePortfolioDialogProps) {
  return props.open ? <ActionDialog key={JSON.stringify([props.ownerId, props.portfolio.id])} {...props} action="duplicate" /> : null;
}

export function DeletePortfolioDialog(props: DeletePortfolioDialogProps) {
  return props.open ? <ActionDialog key={JSON.stringify([props.ownerId, props.portfolio.id])} {...props} action="delete"
    onSubmit={request => props.onSubmit(request.sourceId)}
    onVerify={props.onVerify ? request => props.onVerify!(request.sourceId) : undefined} /> : null;
}

type Phase = "idle" | "pending" | "error" | "uncertain" | "confirmed";

function confirmedId(value: unknown, sourceId: string, duplicate: boolean): string | null {
  if (!value || typeof value !== "object" || !("status" in value) || value.status !== "confirmed" ||
    !("portfolioId" in value) || typeof value.portfolioId !== "string" || !value.portfolioId.trim()) return null;
  return duplicate ? (value.portfolioId !== sourceId ? value.portfolioId : null) : (value.portfolioId === sourceId ? sourceId : null);
}

// UI-only adapter boundary. No authentication, database, navigation or Storage calls.
function ActionDialog({ portfolio, trigger, onClose, onConfirmed, onSubmit, onVerify, action }: DuplicatePortfolioDialogProps & { action: "duplicate" | "delete" }) {
  const duplicate = action === "duplicate";
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const initial = useRef({ trigger, duplicate });
  const lifetime = useRef({ alive: false, generation: 0, busy: false, delivered: false, uncertain: false });
  const submitted = useRef<DuplicatePortfolioRequest | null>(null);
  const [title, setTitle] = useState(() => `${portfolio.title?.trim() || "พอร์ต"} สำเนา`);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");

  useLayoutEffect(() => {
    const state = lifetime.current;
    state.alive = true;
    ++state.generation;
    const element = dialog.current;
    element?.showModal();
    (initial.current.duplicate ? input.current : cancel.current)?.focus();
    const origin = initial.current.trigger;
    return () => {
      state.alive = false;
      ++state.generation;
      element?.close();
      if (origin?.isConnected) origin.focus({ preventScroll: true });
    };
  }, []);

  const close = () => {
    if (lifetime.current.busy) return;
    lifetime.current.alive = false;
    ++lifetime.current.generation;
    onClose();
  };
  const run = async (verify: boolean) => {
    const state = lifetime.current;
    if (!state.alive || state.busy || state.delivered || (state.uncertain && !verify)) return;
    const request = verify ? submitted.current : { sourceId: portfolio.id, title: duplicate ? title.trim() : "" };
    if (!request || (verify && !onVerify)) return;
    if (duplicate && !request.title) { setError("กรุณาตั้งชื่อพอร์ตใหม่"); return; }
    // Capture arguments and callbacks for this attempt before its first await.
    const invoke = verify ? onVerify! : onSubmit;
    const notify = onConfirmed;
    const generation = state.generation;
    const current = () => state.alive && state.generation === generation;
    state.busy = true;
    submitted.current = request;
    setPhase("pending"); setError("");
    let result: unknown;
    try { result = await invoke({ ...request }); }
    catch { result = { status: "uncertain" }; }
    if (!current()) return;
    state.busy = false;
    const portfolioId = confirmedId(result, request.sourceId, duplicate);
    if (portfolioId) {
      state.delivered = true;
      setPhase("confirmed");
      notify({ portfolioId });
      return;
    }
    const rejected = !!result && typeof result === "object" && "status" in result && result.status === "rejected";
    state.uncertain = !rejected;
    setPhase(rejected ? "error" : "uncertain");
    setError(`ยืนยัน${duplicate ? "การทำสำเนาพอร์ต" : "การลบพอร์ต"}ไม่สำเร็จ ${rejected ? (duplicate ? "ชื่อที่กรอกยังอยู่ กรุณาลองอีกครั้ง" : "กรุณาลองอีกครั้ง") : "ยังไม่ทราบผล กรุณาตรวจสอบรายการพอร์ตก่อนยืนยันซ้ำ"}`);
  };
  const pending = phase === "pending";
  const locked = pending || phase === "uncertain" || phase === "confirmed";
  const button = "min-h-11 rounded-xl px-4 py-3 font-semibold focus-visible:outline-2 focus-visible:outline-blue-500 disabled:opacity-50";

  return <dialog ref={dialog} tabIndex={-1} aria-labelledby={`${id}-heading`} aria-describedby={`${id}-description`}
    aria-busy={pending} onCancel={event => { event.preventDefault(); close(); }}
    onKeyDown={event => {
      if (event.key !== "Tab") return;
      const controls = dialog.current?.querySelectorAll<HTMLElement>("input:not(:disabled), button:not(:disabled)");
      if (!controls?.length) { event.preventDefault(); dialog.current?.focus(); return; }
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }}
    className="fixed inset-0 m-auto max-h-[calc(100dvh-32px)] w-[min(520px,calc(100vw-32px))] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-800 shadow-2xl backdrop:bg-slate-950/60 sm:p-6">
    <h2 id={`${id}-heading`} className="text-lg font-bold">{duplicate ? "ทำสำเนาพอร์ต" : "ลบพอร์ต"}</h2>
    <p id={`${id}-description`} className="mt-2 text-sm leading-6 text-slate-500 wrap-anywhere">{duplicate
      ? "สำเนาเป็นพอร์ตใหม่ แต่รายการในคลังยังใช้ร่วมกัน ไม่ใช่การสำรองคลังหรือไฟล์รูปแยก"
      : "ลบพอร์ตนี้ โดยรายการในคลังยังอยู่"}</p>
    <p className="mt-3 text-sm leading-6 wrap-anywhere">{duplicate ? "พอร์ตต้นฉบับ" : "พอร์ตที่จะลบ"}: {portfolio.title?.trim() ? portfolio.title : "พอร์ตที่ยังไม่ได้ตั้งชื่อ"}</p>
    <form className="mt-5" onSubmit={event => { event.preventDefault(); void run(false); }}>
      {duplicate && <>
        <label htmlFor={`${id}-name`} className="mb-2 block text-sm font-bold">ชื่อพอร์ตใหม่</label>
        <input ref={input} id={`${id}-name`} value={title} disabled={locked} aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={event => { if (!lifetime.current.busy) { setTitle(event.target.value); setError(""); } }}
          className="min-h-12 w-full min-w-0 rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100" />
      </>}
      {error && <p id={`${id}-error`} role="alert" className="mt-3 text-sm leading-6 text-red-700 wrap-anywhere">{error}</p>}
      {pending && <p role="status" className="mt-3 text-sm leading-6 text-slate-500">กำลังยืนยันผล กรุณารอสักครู่</p>}
      {phase === "confirmed" && <p role="status" className="mt-3 text-sm leading-6">{duplicate ? "ยืนยันการทำสำเนาพอร์ตแล้ว" : "ยืนยันการลบพอร์ตแล้ว"}</p>}
      {phase === "uncertain" && onVerify && <button type="button" onClick={() => void run(true)} className={`${button} mt-3 border border-slate-300`}>ตรวจสอบผล</button>}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button ref={cancel} type="button" disabled={pending} onClick={close} className={`${button} border border-slate-300`}>{phase === "confirmed" ? "ปิด" : "ยกเลิก"}</button>
        <button type="submit" disabled={locked} className={`${button} ${duplicate ? "bg-blue-600" : "bg-red-600"} text-white`}>{pending ? "กำลังยืนยัน…" : duplicate ? "ทำสำเนา" : "ลบพอร์ต"}</button>
      </div>
    </form>
  </dialog>;
}
