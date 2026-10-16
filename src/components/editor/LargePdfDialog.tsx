"use client";

import { useEffect, useRef, type RefObject } from "react";
import { formatPdfMegabytes, MAX_PDF_BYTES } from "@/lib/editor/export-pdf";

export default function LargePdfDialog({ bytes, onCancel, onConfirm, trigger }: {
  bytes: number; onCancel: () => void; onConfirm: () => void; trigger: RefObject<HTMLButtonElement | null>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const button = trigger.current;
    element?.showModal();
    return () => {
      element?.close();
      if (button?.isConnected) button.focus({ preventScroll: true });
    };
  }, [trigger]);
  return <dialog ref={dialog} aria-labelledby="large-pdf-title" aria-describedby="large-pdf-description"
    onCancel={event => { event.preventDefault(); onCancel(); }}
    onKeyDown={event => {
      if (event.key !== "Tab") return;
      const buttons = dialog.current?.querySelectorAll<HTMLButtonElement>("button");
      if (!buttons?.length) return;
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }}
    className="fixed inset-0 m-auto max-h-[calc(100dvh-32px)] w-[min(480px,calc(100vw-32px))] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-800 shadow-2xl backdrop:bg-slate-950/60 sm:p-6">
    <h2 id="large-pdf-title" className="text-lg font-bold">ดาวน์โหลดไฟล์ PDF ขนาดใหญ่</h2>
    <p id="large-pdf-description" className="mt-3 text-sm leading-7 wrap-anywhere">
      ไฟล์ PDF มีขนาด {formatPdfMegabytes(bytes)} MB ({bytes.toLocaleString("en-US")} bytes) ซึ่งเกินเป้าหมาย {MAX_PDF_BYTES / 1_000_000} MB
      หากระบบรับสมัครกำหนดขนาดไฟล์ อาจต้องลดรูปหรือเนื้อหาก่อน คุณต้องการดาวน์โหลดต่อหรือไม่
    </p>
    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <button type="button" autoFocus onClick={onCancel} className="min-h-11 rounded-lg border border-slate-300 px-3 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500">ยกเลิก</button>
      <button type="button" onClick={onConfirm} className="min-h-11 rounded-lg bg-blue-600 px-3 py-3 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500">ดาวน์โหลดต่อ</button>
    </div>
  </dialog>;
}
