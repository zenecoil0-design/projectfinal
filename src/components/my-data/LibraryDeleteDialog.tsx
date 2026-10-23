"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { confirmedLibraryDelete, libraryTables, parseLibraryImpact, type ImpactPortfolio, type LibraryKind } from '@/lib/library-lifecycle';
import { useLibraryGuard } from './LibraryDraftGuard';

type Phase = 'loading' | 'ready' | 'error' | 'saving' | 'unknown' | 'checking' | 'deleted';
type Props = { kind: LibraryKind; ownerId: string; item: { id: string; title: string }; onClose: () => void; onDeleted: () => void };

/** One mounted dialog owns one item and account; unknown writes are read back, never auto-retried. */
export default function LibraryDeleteDialog({ kind, ownerId, item, onClose, onDeleted }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const dialog = useRef<HTMLDialogElement>(null);
  const active = useRef(false), lock = useRef(false);
  const lifetime = useRef(0);
  const [phase, setPhase] = useState<Phase>('loading');
  const [portfolios, setPortfolios] = useState<ImpactPortfolio[]>([]);
  const table = libraryTables[kind];
  const { setOperationBusy } = useLibraryGuard();
  const callbacks = useRef({ onClose, onDeleted });
  useLayoutEffect(() => { callbacks.current = { onClose, onDeleted }; });
  useLayoutEffect(() => {
    active.current = true;
    lifetime.current++; lock.current = false;
    const previous = document.activeElement;
    const element = dialog.current;
    element?.showModal();
    return () => { active.current = false; element?.close(); if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== 'SIGNED_OUT' && (!session || session.user.id === ownerId)) return;
      active.current = false;
      callbacks.current.onClose();
    });
    return () => subscription.unsubscribe();
  }, [ownerId, supabase]);

  const verifyOwner = useCallback(async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || data.user?.id !== ownerId) throw new Error('Account unavailable');
  }, [supabase, ownerId]);
  const readImpact = useCallback(async () => {
    const { data, error } = await supabase.from(table.relation)
      .select('portfolio_id, portfolios!inner(id, title, user_id)')
      .eq(table.column, item.id).eq('portfolios.user_id', ownerId);
    if (error) throw error;
    return parseLibraryImpact(data, ownerId);
  }, [supabase, table, item.id, ownerId]);
  const load = useCallback(async () => {
    if (!active.current || lock.current) return;
    lock.current = true;
    const ticket = lifetime.current;
    const current = () => active.current && ticket === lifetime.current;
    try {
      await verifyOwner(); if (!current()) return;
      const next = await readImpact(); if (!current()) return;
      setPortfolios(next); setPhase('ready');
    } catch { if (current()) setPhase('error'); }
    finally { if (current()) lock.current = false; }
  }, [verifyOwner, readImpact]);
  useEffect(() => {
    const ticket = lifetime.current;
    void Promise.resolve().then(() => { if (active.current && ticket === lifetime.current) return load(); });
  }, [load]);

  const deleted = () => {
    if (!active.current) return;
    setPhase('deleted'); callbacks.current.onDeleted();
  };
  const remove = async () => {
    if (!active.current || lock.current || phase !== 'ready') return;
    lock.current = true; setPhase('saving');
    const ticket = lifetime.current;
    const current = () => active.current && ticket === lifetime.current;
    let submitted = false;
    try {
      await verifyOwner(); if (!current()) return;
      const latest = await readImpact(); if (!current()) return;
      const signature = (rows: ImpactPortfolio[]) => JSON.stringify([...rows].sort((a,b) => a.id.localeCompare(b.id)));
      if (signature(latest) !== signature(portfolios)) { setPortfolios(latest); setPhase('ready'); return; }
      submitted = true;
      const { data, error } = await supabase.from(table.source).delete().eq('id', item.id).eq('user_id', ownerId).select('id');
      if (!current()) return;
      if (error || !confirmedLibraryDelete(data, item.id)) { setPhase('unknown'); return; }
      deleted();
    } catch { if (current()) setPhase(submitted ? 'unknown' : 'error'); }
    finally { if (current()) lock.current = false; }
  };
  const reconcile = async () => {
    if (!active.current || lock.current) return;
    lock.current = true; setPhase('checking');
    const ticket = lifetime.current;
    const current = () => active.current && ticket === lifetime.current;
    try {
      await verifyOwner(); if (!current()) return;
      const { data, error } = await supabase.from(table.source).select('id').eq('id', item.id).eq('user_id', ownerId);
      if (!current()) return;
      if (error || !Array.isArray(data) || data.some(row => row.id !== item.id)) throw new Error('Invalid status');
      if (data.length === 0) deleted();
      else if (data.length === 1) { const next = await readImpact(); if (current()) { setPortfolios(next); setPhase('ready'); } }
      else throw new Error('Invalid status');
    } catch { if (current()) setPhase('unknown'); }
    finally { if (current()) lock.current = false; }
  };
  const busy = phase === 'saving' || phase === 'loading' || phase === 'checking';
  useLayoutEffect(() => {
    setOperationBusy(busy);
    return () => setOperationBusy(false);
  }, [busy, setOperationBusy]);
  useLayoutEffect(() => {
    const element = dialog.current;
    if (!busy && element && (document.activeElement === element || !element.contains(document.activeElement))) {
      element.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    }
  }, [busy]);
  const close = () => { if (!lock.current && !busy) callbacks.current.onClose(); };
  return <dialog ref={dialog} aria-labelledby="library-delete-title" aria-describedby="library-delete-description"
    onCancel={event => { event.preventDefault(); close(); }}
    onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const controls = dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
      if (!controls?.length) { event.preventDefault(); return; }
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }}
    className="fixed inset-0 m-auto max-h-[calc(100dvh-32px)] w-[min(520px,calc(100vw-32px))] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-800 shadow-2xl backdrop:bg-slate-950/60">
    <h2 id="library-delete-title" className="text-lg font-bold">ลบรายการจากคลัง</h2>
    <p id="library-delete-description" className="mt-3 break-words text-sm leading-7">รายการ: {item.title} การลบจากคลังจะนำรายการนี้ออกจากทุกพอร์ตของคุณที่อ้างถึง รวมหมวดที่ซ่อนอยู่</p>
    {phase === 'loading' && <p role="status" className="mt-3">กำลังตรวจผลกระทบ…</p>}
    {phase === 'saving' && <p role="status" className="mt-3">กำลังยืนยันการลบ…</p>}
    {phase === 'checking' && <p role="status" className="mt-3">กำลังตรวจสอบสถานะ…</p>}
    {phase === 'error' && <p role="alert" className="mt-3 text-sm text-red-700">อ่านผลกระทบหรือยืนยันบัญชีไม่สำเร็จ กรุณาลองใหม่ ยังไม่สามารถยืนยันลบได้</p>}
    {phase === 'unknown' && <p role="alert" className="mt-3 text-sm leading-7 text-amber-900">ยังยืนยันผลลบไม่ได้ คำขออาจสำเร็จแล้ว กรุณาตรวจสอบสถานะก่อนลองลบซ้ำ</p>}
    {phase === 'ready' && <div className="mt-3 text-sm leading-7"><p>พอร์ตที่ได้รับผลกระทบ {portfolios.length} พอร์ต (ข้อมูลที่ตรวจล่าสุด)</p><ul className="list-inside list-disc break-words">{portfolios.map(p => <li key={p.id}>{p.title?.trim() || 'พอร์ตไม่มีชื่อ'}</li>)}</ul><p>หากรายชื่อเปลี่ยนระหว่างยืนยัน ระบบจะอัปเดตรายชื่อให้ตรวจและกดยืนยันอีกครั้ง</p></div>}
    {phase === 'deleted' && <p role="status" className="mt-3 text-sm leading-7">ยืนยันแล้วว่าไม่มีรายการนี้ในคลัง รูปใน Storage ยังไม่ได้ลบเพื่อป้องกันไฟล์ที่ยังถูกอ้างถึง ต้องตรวจและ cleanup แยกโดยผู้ดูแล ไม่ถือว่าลบไฟล์ครบแล้ว</p>}
    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <button type="button" autoFocus disabled={busy} onClick={close} className="min-h-11 rounded-lg border px-3 py-3 text-sm focus-visible:outline-2">{phase === 'deleted' ? 'ปิด' : 'ยกเลิก'}</button>
      {phase === 'ready' && <button type="button" onClick={() => void remove()} className="min-h-11 rounded-lg bg-red-600 px-3 py-3 text-sm text-white focus-visible:outline-2">ลบจากคลังและทุกพอร์ต</button>}
      {phase === 'error' && <button type="button" onClick={() => { if (!lock.current) { setPhase('loading'); void load(); } }} className="min-h-11 rounded-lg border px-3 py-3 text-sm">ลองใหม่</button>}
      {phase === 'unknown' && <button type="button" onClick={() => void reconcile()} className="min-h-11 rounded-lg border px-3 py-3 text-sm">ตรวจสอบสถานะ</button>}
    </div>
  </dialog>;
}
