"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import { useEditorSession } from "./EditorSession";
import { createPortfolioPdf, inspectPages } from "@/lib/editor/export-pdf";
import { errorMessage } from "@/lib/errors";

export default function ExportButton({ container, title, busy = false }: { container: RefObject<HTMLElement | null>; title: string; busy?: boolean }) {
  const { status, dirty, exporting, setExporting } = useEditorSession();
  const [message, setMessage] = useState("");
  const [count, setCount] = useState(0);
  const inFlight = useRef(false);
  const ready = Object.values(status).every(value => value === "ready");
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const update = () => setCount(inspectPages(element).pages.length);
    const observer = new MutationObserver(update);
    observer.observe(element, { childList: true, subtree: true });
    update();
    return () => observer.disconnect();
  }, [container, ready]);
  const download = async () => {
    if (!container.current || inFlight.current || exporting || busy || !ready || dirty.length > 0) return;
    inFlight.current = true;
    setExporting(true);
    setMessage("กำลังเตรียม PDF…");
    try {
      const blob = await createPortfolioPdf(container.current, setMessage);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${title.replace(/[\\/:*?"<>|]/g, "-").slice(0, 80) || "Portfolio"}.pdf`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setMessage(`ดาวน์โหลดแล้ว (${(blob.size / 1_000_000).toFixed(2)} MB)`);
    } catch (error) {
      setMessage(errorMessage(error) || "ไม่สามารถสร้าง PDF ได้ กรุณาลองใหม่");
    } finally {
      inFlight.current = false;
      setExporting(false);
    }
  };
  return <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
    <span className="text-slate-500">{count} หน้า</span>
    <button type="button" onClick={download} disabled={busy || !ready || exporting || dirty.length > 0} className="rounded-lg bg-blue-600 px-3 py-2 font-bold text-white disabled:opacity-40">{exporting ? "กำลังส่งออก…" : "ดาวน์โหลด PDF"}</button>
    {dirty.length > 0 && <span>บันทึกทุกหมวดก่อนส่งออก</span>}
    {message && <p role="status" className="max-w-md">{message}</p>}
  </div>;
}
