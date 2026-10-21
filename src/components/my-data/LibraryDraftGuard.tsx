"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLibraryHistoryGuard } from "./useLibraryHistoryGuard";

type Flags = { dirty: boolean; busy: boolean };
type Guard = Flags & { update: (flags: Flags) => void; requestExit: (action: () => void) => void };
const Context = createContext<Guard | null>(null);
const clean: Flags = { dirty: false, busy: false };

/** Scoped to the mounted /my-data account. */
export function LibraryDraftGuard({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState(clean);
  const current = useRef(clean);
  const pending = useRef<(() => void) | null>(null);
  const [confirming, setConfirming] = useState(false);
  const update = useCallback((next: Flags) => {
    current.current = next;
    setFlags(previous => previous.dirty === next.dirty && previous.busy === next.busy ? previous : next);
  }, []);
  const requestExit = useCallback((action: () => void) => {
    if (current.current.busy || pending.current) return;
    if (!current.current.dirty) { action(); return; }
    pending.current = action;
    setConfirming(true);
  }, []);
  const finish = useCallback((discard: boolean) => {
    const action = pending.current;
    pending.current = null;
    setConfirming(false);
    if (discard && action) { update(clean); action(); }
  }, [update]);
  const getFlags = useCallback(() => current.current, []);
  const historySupported = useLibraryHistoryGuard(getFlags, requestExit);

  useEffect(() => {
    if (!flags.dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [flags.dirty]);

  const value = useMemo(() => ({ ...flags, update, requestExit }), [flags, update, requestExit]);
  return <Context.Provider value={value}>
    {flags.dirty && !historySupported && <p role="alert" className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">เบราว์เซอร์นี้ยังไม่รองรับคำเตือนก่อนย้อนกลับหรือไปข้างหน้า กรุณาบันทึกหรือยกเลิกฟอร์มก่อนใช้ปุ่มดังกล่าว</p>}
    {children}
    {confirming && <DiscardDialog onContinue={() => finish(false)} onDiscard={() => finish(true)} />}
  </Context.Provider>;
}

function DiscardDialog({ onContinue, onDiscard }: { onContinue: () => void; onDiscard: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return <dialog ref={dialog} aria-labelledby="library-discard-title" aria-describedby="library-discard-description"
    onCancel={event => { event.preventDefault(); onContinue(); }}
    className="fixed inset-0 m-auto max-h-[calc(100dvh-32px)] w-[min(480px,calc(100vw-32px))] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-800 shadow-2xl backdrop:bg-slate-950/60 sm:p-6">
    <h2 id="library-discard-title" className="text-lg font-bold">ข้อมูลยังไม่ได้บันทึก</h2>
    <p id="library-discard-description" className="mt-3 text-sm leading-7">มีข้อมูลที่ยังไม่ได้บันทึก ต้องการทิ้งการเปลี่ยนแปลงหรือไม่</p>
    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <button type="button" autoFocus onClick={onContinue} className="min-h-11 rounded-lg border border-slate-300 px-3 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500">แก้ไขต่อ</button>
      <button type="button" onClick={onDiscard} className="min-h-11 rounded-lg bg-red-600 px-3 py-3 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500">ทิ้งการเปลี่ยนแปลง</button>
    </div>
  </dialog>;
}

export function useLibraryGuard() {
  const guard = useContext(Context);
  if (!guard) throw new Error("Library draft guard is missing");
  return guard;
}

type Draft = {
  open: boolean;
  saving: boolean;
  values: readonly unknown[];
  tagIds: readonly string[];
  images: readonly { id: string; image_url: string; sort_order: number }[];
  files: readonly File[];
};

/** Tags are a set, images are ordered, and Files are compared by identity, never serialized. */
export function useLibraryDraft({ open, saving, values, tagIds, images, files }: Draft) {
  const { update, requestExit } = useLibraryGuard();
  const baseline = useRef<{ text: string; files: readonly File[] } | null>(null);
  const wasOpen = useRef(false);
  const text = JSON.stringify([values, [...tagIds].sort(), images.map(image => [image.id, image.image_url, image.sort_order])]);
  useLayoutEffect(() => {
    if (open && !wasOpen.current) baseline.current = { text, files: [...files] };
    if (!open) baseline.current = null;
    wasOpen.current = open;
    const original = baseline.current;
    const dirty = open && original !== null && (original.text !== text || original.files.length !== files.length || files.some((file, index) => file !== original.files[index]));
    update({ dirty, busy: open && saving });
  });
  useLayoutEffect(() => () => update(clean), [update]);
  return requestExit;
}
