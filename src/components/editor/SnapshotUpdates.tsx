"use client";
import { useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { acceptPortfolioSnapshot, readPortfolioSnapshots } from "@/lib/editor/snapshot-api";
import type { parsePortfolioSnapshots, SnapshotSection } from "@/lib/editor/snapshot-reader";
import { sectionSnapshot } from "@/lib/editor/section-state";
import { useEditorSession } from "./EditorSession";

type Entries = ReturnType<typeof parsePortfolioSnapshots>;
export function SnapshotUpdates({ client, portfolioId, ownerId, section, entries, onApply, disabled }: {
  client: SupabaseClient; portfolioId: string; ownerId: string; section: SnapshotSection;
  entries: Entries; disabled: boolean; onApply: (entries: Entries) => void;
}) {
  const session = useEditorSession();
  const { setSnapshotBusy } = session;
  const lifetime = useRef(0);
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  useEffect(() => {
    const token = ++lifetime.current;
    const activeLock = lock;
    return () => {
      lifetime.current = token + 1;
      if (activeLock.current) {
        activeLock.current = false;
        setSnapshotBusy(false);
      }
    };
  }, [portfolioId, ownerId, setSnapshotBusy]);
  const blocked = disabled || session.exporting || session.dirty.length > 0 || session.appearanceBusy;
  async function run(entry?: Entries[number]) {
    if (disabled || lock.current || session.isExporting() || session.hasUnsavedChanges() || session.isAppearanceBlocked()) return;
    if (entry && !window.confirm("รับข้อมูลและรูปฉบับใหม่จากคลังแทนฉบับที่ใช้ในพอร์ตนี้หรือไม่?")) return;
    const version = lifetime.current;
    const before = sectionSnapshot(section);
    const isCurrent = () => lifetime.current === version;
    lock.current = true; setBusy(true); session.setSnapshotBusy(true);
    try {
      const context = { portfolioId, ownerId, isCurrent };
      const result = entry
        ? await acceptPortfolioSnapshot(client, context, section, entry.item.id, entry.latestRevision)
        : await readPortfolioSnapshots(client, context, section);
      if (!isCurrent()) return;
      if (sectionSnapshot(section) !== before) throw new Error("draft changed");
      onApply(result);
      session.reportLoaded(section, true);
      setUncertain(false);
    } catch {
      if (!isCurrent()) return;
      setUncertain(true);
      session.reportLoaded(section, false);
    } finally {
      if (isCurrent()) {
        lock.current = false; setBusy(false); session.setSnapshotBusy(false);
      }
    }
  }
  return <div className="space-y-2 rounded-xl border border-slate-200 p-3 text-sm" aria-label="ฉบับข้อมูลในพอร์ต">
    <p>พอร์ตใช้ฉบับที่บันทึกไว้ การแก้คลังจะไม่เปลี่ยนฉบับนี้โดยอัตโนมัติ</p>
    {uncertain ? <div role="alert">
      <p>ยังยืนยันฉบับปัจจุบันไม่สำเร็จ ผลบันทึกอาจสำเร็จแล้ว กรุณาตรวจสอบก่อนทำต่อ</p>
      <button type="button" disabled={busy || blocked} onClick={() => void run()}
        className="min-h-11 rounded border px-3">ตรวจสอบฉบับปัจจุบัน</button>
    </div> : entries.filter(entry => entry.hasUpdate).map(entry => <div key={entry.item.id} className="flex flex-wrap items-center gap-2">
      <span>{"schoolName" in entry.item ? entry.item.schoolName : entry.item.title} — มีฉบับใหม่</span>
      <button type="button" disabled={busy || blocked} onClick={() => void run(entry)}
        className="min-h-11 rounded border px-3">รับอัปเดตรายการนี้</button>
    </div>)}
    {session.dirty.length > 0 && <p>บันทึกการแก้ไขก่อนรับอัปเดตจากคลัง</p>}
    {busy && <p role="status">กำลังตรวจสอบฉบับข้อมูล…</p>}
  </div>;
}
