"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { defaultColors, parsePortfolioColors, type PortfolioColors } from "@/lib/editor/portfolio-colors";
import { useEditorSession } from "./EditorSession";
type Owner = { id: string; ownerId: string; cacheKey: string };
export function usePortfolioAppearance() {
 const { exporting, isExporting, reportAppearance } = useEditorSession();
 const [colors, setColors] = useState(() => defaultColors("classic"));
 const [dirty, setDirty] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
 const state = useRef({ owner: null as Owner | null, version: 0, busy: false, baseline: "", draft: colors });
 const invalidate = useCallback(() => { state.current.version++; state.current.owner = null; state.current.busy = false; reportAppearance(false, false); }, [reportAppearance]);
 useEffect(() => invalidate, [invalidate]);
 const initialize = useCallback((id: string, ownerId: string, raw: string | null, template: string) => {
  const cacheKey = `portfolio-colors:v1:${ownerId}:${id}`;
  const saved = parsePortfolioColors(raw, template);
  let draft = saved;
  if (!raw) { try { draft = parsePortfolioColors(localStorage.getItem(cacheKey), template); } catch { /* Optional legacy cache. */ } }
  const changed = JSON.stringify(saved) !== JSON.stringify(draft);
  state.current = { owner: { id, ownerId, cacheKey }, version: state.current.version + 1, busy: false, baseline: JSON.stringify(saved), draft };
  setColors(draft); setDirty(changed); setBusy(false); setMessage(changed ? "พบสีเดิมในเบราว์เซอร์ กรุณากดบันทึกสีเพื่อเก็บไว้กับพอร์ต" : ""); reportAppearance(changed, false);
 }, [reportAppearance]);
 const change = (next: PortfolioColors) => {
  if (!state.current.owner || state.current.busy || isExporting()) return;
  const changed = JSON.stringify(next) !== state.current.baseline;
  state.current.draft = next; setColors(next); setDirty(changed); setMessage(""); reportAppearance(changed, false);
 };
 const save = async () => {
  const currentState = state.current, owner = currentState.owner;
  if (!owner || currentState.busy || isExporting() || JSON.stringify(currentState.draft) === currentState.baseline) return;
  currentState.busy = true; setBusy(true); setMessage(""); reportAppearance(true, true);
  const version = currentState.version;
  const current = () => state.current.version === version && state.current.owner === owner;
  const payload = JSON.stringify(currentState.draft);
  try {
   const client = createClient();
   const { data: { user }, error: authError } = await client.auth.getUser();
   if (!current()) return;
   if (authError || user?.id !== owner.ownerId) throw new Error("Owner verification failed");
   const { data, error } = await client.from("portfolios").update({ theme_color: payload }).eq("id", owner.id).eq("user_id", owner.ownerId).select("id, user_id, theme_color").single();
   if (!current()) return;
   if (error || data?.id !== owner.id || data?.user_id !== owner.ownerId || data?.theme_color !== payload) throw new Error("Save not confirmed");
   currentState.baseline = payload; setDirty(false); setMessage("บันทึกสีพอร์ตแล้ว");
   try { localStorage.removeItem(owner.cacheKey); } catch { /* Server result is authoritative. */ }
  } catch { if (current()) setMessage("ยืนยันการบันทึกสีไม่สำเร็จ สีที่เลือกยังอยู่ กรุณาลองบันทึกอีกครั้ง"); }
  finally { if (current()) { currentState.busy = false; setBusy(false); reportAppearance(JSON.stringify(currentState.draft) !== currentState.baseline, false); } }
 };
 return { colors, dirty, busy, message, disabled: exporting || busy, initialize, invalidate, change, save };
}
