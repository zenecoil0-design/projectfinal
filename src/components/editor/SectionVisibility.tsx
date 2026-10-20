"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { parseVisibilityRows, showContents, visibilityNames, type SectionVisibility, type VisibilityRow, type VisibilitySection } from "@/lib/editor/section-visibility";
import { useEditorSession } from "./EditorSession";

type Change = { section: VisibilitySection; visible: boolean };
type State = { values: SectionVisibility | null; phase: "loading" | "ready" | "saving" | "error"; failed: Change | null; message: string };
type Context = State & { setVisible: (section: VisibilitySection, visible: boolean) => void; retry: () => void; canExport: () => boolean };
const VisibilityContext = createContext<Context | null>(null);
const initial: State = { values: null, phase: "loading", failed: null, message: "กำลังโหลดการแสดงหมวด…" };

/** Separate lifetime/state from content readiness and saved baselines. */
export function SectionVisibilityProvider({ portfolioId, children }: { portfolioId: string; children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const { isExporting } = useEditorSession();
  const [state, setState] = useState<State>(initial);
  const snapshot = useRef(state);
  const live = useRef(false);
  const lifetime = useRef({ revision: 0 });
  const committed = useRef(state);
  const pending = useRef(false);
  const publish = useCallback((next: State) => { snapshot.current = next; setState(next); }, []);
  const load = useCallback(async () => {
    if (!live.current || pending.current || isExporting()) return;
    pending.current = true;
    const ticket = ++lifetime.current.revision;
    const current = () => live.current && ticket === lifetime.current.revision;
    publish({ ...snapshot.current, phase: "loading", failed: null, message: "กำลังโหลดการแสดงหมวด…" });
    try {
      const { data, error } = await supabase.from("portfolio_section_visibility").select("section, visible").eq("portfolio_id", portfolioId);
      if (error) throw error;
      const values = parseVisibilityRows(data);
      if (current()) publish({ values, phase: "ready", failed: null, message: "โหลดการแสดงหมวดแล้ว" });
    } catch {
      if (current()) publish({ ...snapshot.current, phase: "error", failed: null, message: "โหลดการแสดงหมวดไม่สำเร็จ กรุณาลองใหม่ก่อนส่งออก" });
    } finally { if (current()) pending.current = false; }
  }, [isExporting, portfolioId, publish, supabase]);

  useEffect(() => {
    const session = lifetime.current;
    live.current = true;
    void load();
    return () => { live.current = false; session.revision++; pending.current = false; };
  }, [load]);
  useLayoutEffect(() => { committed.current = state; }, [state]);

  const write = useCallback(async (change: Change) => {
    if (!live.current || pending.current || !snapshot.current.values || isExporting()) return;
    pending.current = true; // synchronous lock also protects export before React commits
    const ticket = ++lifetime.current.revision;
    const current = () => live.current && lifetime.current.revision === ticket;
    publish({ ...snapshot.current, phase: "saving", failed: null, message: `กำลังบันทึกการแสดง${visibilityNames[change.section]}…` });
    try {
      const { data, error } = await supabase.from("portfolio_section_visibility")
        .upsert({ portfolio_id: portfolioId, section: change.section, visible: change.visible }, { onConflict: "portfolio_id,section" })
        .select("section, visible").returns<VisibilityRow[]>().single();
      if (error) throw error;
      parseVisibilityRows([data]);
      if (!data || data.section !== change.section || data.visible !== change.visible) throw new Error("Visibility write not confirmed");
      if (current()) publish({ values: { ...snapshot.current.values!, [change.section]: data.visible }, phase: "ready", failed: null, message: `บันทึกการแสดง${visibilityNames[change.section]}แล้ว` });
    } catch {
      if (current()) publish({ ...snapshot.current, phase: "error", failed: change, message: "ยืนยันการแสดงหมวดไม่สำเร็จ A4 คงค่าที่เคยยืนยันล่าสุด กรุณาลองใหม่ก่อนส่งออก" });
    } finally { if (current()) pending.current = false; }
  }, [isExporting, portfolioId, publish, supabase]);

  const setVisible = useCallback((section: VisibilitySection, visible: boolean) => {
    if (snapshot.current.phase !== "ready" || snapshot.current.values?.[section] === visible) return;
    void write({ section, visible });
  }, [write]);
  const retry = useCallback(() => { const failed = snapshot.current.failed; if (failed) void write(failed); else void load(); }, [load, write]);
  const canExport = useCallback(() => snapshot.current === committed.current && snapshot.current.phase === "ready" && snapshot.current.values !== null && !pending.current, []);
  return <VisibilityContext.Provider value={{ ...state, setVisible, retry, canExport }}>{children}</VisibilityContext.Provider>;
}

export function useSectionVisibility() {
  const context = useContext(VisibilityContext);
  if (!context) throw new Error("Visibility session missing");
  return context;
}

export function VisibilityStatus() {
  const { phase, message, retry } = useSectionVisibility();
  return <div role={phase === "error" ? "alert" : "status"} className={"mb-3 rounded-lg border p-3 text-xs leading-5 " + (phase === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-slate-200 bg-slate-50 text-slate-600")}>
    {message}
    {phase === "error" && <button type="button" onClick={retry} className="ml-2 min-h-11 rounded-md border border-current px-3 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500">ลองใหม่การแสดงหมวด</button>}
  </div>;
}

export function VisibilityControl({ section }: { section: VisibilitySection }) {
  const { values, phase, setVisible } = useSectionVisibility();
  const { exporting } = useEditorSession();
  if (!values) return <p className="mb-3 text-xs text-slate-500">ยังไม่ทราบการแสดง{visibilityNames[section]}บน A4</p>;
  return <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
    <label htmlFor={`visibility-${section}`} className="flex min-h-11 cursor-pointer items-center gap-3 font-medium text-slate-700">
      <input id={`visibility-${section}`} type="checkbox" role="switch" checked={values[section]} disabled={phase !== "ready" || exporting}
        onChange={event => setVisible(section, event.target.checked)} className="h-5 w-5 shrink-0 accent-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500" />
      แสดง{visibilityNames[section]}บน A4
    </label>
    {!values[section] && <p className="mt-1 text-xs leading-5 text-slate-600">หมวดนี้ไม่แสดงบน A4 และ PDF ข้อมูลยังอยู่และแก้ไขได้</p>}
    {section === "toc" && values.toc && !showContents(values) && <p className="mt-1 text-xs text-slate-600">สารบัญจะแสดงเมื่อเปิดหมวดเนื้อหาอย่างน้อยหนึ่งหมวด โดยเก็บค่าที่เลือกไว้นี้</p>}
  </div>;
}

export function VisibilityPreview({ children }: { children: ReactNode }) {
  const { values } = useSectionVisibility();
  return values ? children : <p className="p-8 text-center text-sm text-slate-700">รอโหลดการแสดงหมวดก่อนสร้างตัวอย่าง A4</p>;
}

export function VisibleSection({ section, children }: { section: VisibilitySection; children: ReactNode }) {
  const { values } = useSectionVisibility();
  if (!values || !(section === "toc" ? showContents(values) : values[section])) return null;
  return children;
}
