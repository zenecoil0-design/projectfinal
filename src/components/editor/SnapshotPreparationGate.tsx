"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { snapshotsEnabled } from "@/lib/editor/snapshot-enabled";
import { preparePortfolioSnapshots, readPortfolioSnapshots, SnapshotPreparationRequired } from "@/lib/editor/snapshot-api";

export function SnapshotPreparationGate(props: { portfolioId: string; ownerId: string; children: ReactNode }) {
  return snapshotsEnabled ? <Preparation {...props} /> : props.children;
}
function Preparation({ portfolioId, ownerId, children }: { portfolioId: string; ownerId: string; children: ReactNode }) {
  const client = useMemo(() => createClient(), []);
  const [state, setState] = useState<"checking" | "missing" | "error" | "ready">("checking");
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const lock = useRef(false);
  const check = useCallback(async (current: () => boolean) => {
    const context = { portfolioId, ownerId, isCurrent: current };
    const results = await Promise.allSettled((["education", "activity", "certificate"] as const)
      .map(section => readPortfolioSnapshots(client, context, section)));
    if (!current()) return;
    const failures = results.filter(result => result.status === "rejected");
    setState(failures.some(result => !(result.reason instanceof SnapshotPreparationRequired))
      ? "error" : failures.length ? "missing" : "ready");
  }, [client, portfolioId, ownerId]);
  useEffect(() => {
    const token = ++generation.current;
    void check(() => generation.current === token);
    return () => { generation.current = token + 1; };
  }, [check]);
  async function recover(prepare: boolean) {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    const token = generation.current;
    const isCurrent = () => generation.current === token;
    try {
      if (prepare) await preparePortfolioSnapshots(client, { portfolioId, ownerId, isCurrent });
      await check(isCurrent);
    } catch {
      if (isCurrent()) setState("error");
    } finally {
      if (isCurrent()) { lock.current = false; setBusy(false); }
    }
  }
  if (state === "ready") return children;
  return <main className="mx-auto max-w-xl space-y-4 p-6">
    <h1 className="text-xl font-bold">ฉบับข้อมูลของพอร์ต</h1>
    {state === "checking" ? <p role="status">กำลังตรวจสอบฉบับข้อมูล…</p> : state === "missing" ? <>
      <p>พอร์ตนี้มีรายการที่ยังไม่มีฉบับเริ่มต้น ระบบจะใช้ข้อมูลและรูปในคลัง ณ เวลาที่ยืนยัน ไม่ใช่การกู้ข้อมูลย้อนหลัง</p>
      <p>ฉบับที่เคยบันทึกไว้แล้วจะไม่ถูกอัปเดตทับ หลังจากนี้คุณเลือกได้ว่าจะรับการแก้ไขจากคลังเมื่อใด</p>
      <button type="button" disabled={busy} onClick={() => void recover(true)}
        className="min-h-11 rounded-lg bg-blue-700 px-4 text-white">ยืนยันเตรียมฉบับเริ่มต้น</button>
    </> : <>
      <p role="alert">ยังยืนยันฉบับข้อมูลไม่ได้ หากเพิ่งกดเตรียม ข้อมูลอาจบันทึกแล้ว กรุณาตรวจสอบอีกครั้ง</p>
      <button type="button" disabled={busy} onClick={() => void recover(false)}
        className="min-h-11 rounded-lg border px-4">ตรวจสอบอีกครั้ง</button>
    </>}
    {busy && <p role="status">กำลังดำเนินการ…</p>}
    <Link href="/dashboard" className="block underline">กลับ Dashboard</Link>
  </main>;
}
