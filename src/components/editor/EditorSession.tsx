"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { editorStores, sections, sectionNames, sectionSnapshot, type Section } from "@/lib/editor/section-state";

import type { TagSection } from "@/lib/editor/tag-loader";

type Status = "loading" | "ready" | "error";
const initialStatus = Object.fromEntries(sections.map(section => [section, "loading"])) as Record<Section, Status>;
const SessionContext = createContext<{
  status: Record<Section, Status>;
  tagStatus: Record<TagSection, Status>;
  reportTags: (section: TagSection, status: Status) => void;
  dirty: Section[];
  exporting: boolean;
  setExporting: (value: boolean) => void;
  reportLoaded: (section: Section, success: boolean) => void;
  markSaved: (section: Section) => void;
} | null>(null);

export function EditorSession({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState(initialStatus);
  const [tagStatus, setTagStatus] = useState<Record<TagSection, Status>>({ education: "loading", activity: "loading", certificate: "loading" });
  // Metadata readiness never changes the selection baseline.
  const reportTags = useCallback((section: TagSection, next: Status) => {
    setTagStatus(previous => previous[section] === next ? previous : { ...previous, [section]: next });
  }, []);
  const [exporting, setExporting] = useState(false);
  const [dirty, setDirty] = useState<Section[]>([]);
  const baselines = useRef<Partial<Record<Section, string>>>({});
  const refreshDirty = useCallback(() => {
    const next = sections.filter(section => baselines.current[section] !== undefined && baselines.current[section] !== sectionSnapshot(section));
    setDirty(previous => previous.join() === next.join() ? previous : next);
  }, []);
  const markSaved = useCallback((section: Section) => {
    baselines.current[section] = sectionSnapshot(section);
    refreshDirty();
  }, [refreshDirty]);
  const reportLoaded = useCallback((section: Section, success: boolean) => {
    if (success) markSaved(section);
    setStatus(previous => ({ ...previous, [section]: success ? "ready" : "error" }));
  }, [markSaved]);

  useEffect(() => {
    const unsubscribe = editorStores.map(store => store.subscribe(refreshDirty));
    return () => unsubscribe.forEach(stop => stop());
  }, [refreshDirty]);

  useEffect(() => {
    if (!dirty.length && !exporting) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest?.("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download") || event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.pathname === location.pathname && destination.search === location.search) return;
      if (exporting) { event.preventDefault(); event.stopPropagation(); return; }
      if (!window.confirm("มีข้อมูลที่ยังไม่บันทึก ต้องการออกจากหน้านี้และทิ้งการแก้ไขหรือไม่?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty, exporting]);

  const value = useMemo(() => ({ status, tagStatus, reportTags, dirty, exporting, setExporting, reportLoaded, markSaved }), [status, tagStatus, reportTags, dirty, exporting, reportLoaded, markSaved]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useEditorSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("Editor session is missing");
  return context;
}

export function EditorStatus() {
  const { status, tagStatus, dirty } = useEditorSession();
  const loading = sections.filter(section => status[section] === "loading");
  const failed = sections.filter(section => status[section] === "error");
  const tagFailures = (Object.keys(tagStatus) as TagSection[]).filter(section => tagStatus[section] === "error");
  const tagsLoading = Object.values(tagStatus).some(value => value === "loading");
  return <div role="status" className="border-b border-slate-200 bg-white px-4 py-2 text-xs text-slate-600">
    {loading.length ? `กำลังโหลดข้อมูลอีก ${loading.length} หมวด…` : failed.length ? `โหลดไม่สำเร็จ: ${failed.map(section => sectionNames[section]).join(", ")} — กรุณารีเฟรชเพื่อลองใหม่` : tagFailures.length ? `ข้อมูลรายการหลักพร้อม แต่โหลด Tags ไม่ครบ: ${tagFailures.map(section => sectionNames[section]).join(", ")} — ลองใหม่ในหมวดนั้น` : tagsLoading ? "ข้อมูลรายการหลักพร้อม กำลังโหลด Tags…" : "โหลดข้อมูลครบทุกหมวดแล้ว"}
    {dirty.length > 0 && <span className="ml-3 font-semibold text-amber-700">ยังไม่บันทึก: {dirty.map(section => sectionNames[section]).join(", ")}</span>}
  </div>;
}

export function ReadyPreview({ children }: { children: ReactNode }) {
  const { status } = useEditorSession();
  if (sections.some(section => status[section] === "loading")) return <p className="p-8 text-center">กำลังโหลดตัวอย่างครบทุกหมวด…</p>;
  if (sections.some(section => status[section] === "error")) return <p role="alert" className="p-8 text-center text-red-800">โหลดข้อมูลไม่ครบ กรุณาตรวจสอบข้อความในแบบฟอร์มแล้วรีเฟรชก่อนดูตัวอย่าง</p>;
  return children;
}
