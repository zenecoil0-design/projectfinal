"use client";

import type { useEditorTags } from "./useEditorTags";

type Props = { state: ReturnType<typeof useEditorTags>; disabled: boolean };
export function EditorTagNotice({ state, disabled }: Props) {
  if (state.ready && !state.missingFilter) return null;
  return <div role={state.tagsError || state.relationsError ? "alert" : "status"} className="min-w-0 space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm leading-6 text-amber-950 wrap-anywhere">
    {state.loading ? <p>กำลังโหลด Tags และความสัมพันธ์ Tags…</p> : state.ready ?
      <p>Tag ที่เคยเลือกไม่มีแล้ว กำลังแสดงรายการทั้งหมด</p> : <>
        <p>{state.tagsError && state.relationsError ? "โหลด Tags และความสัมพันธ์ Tags ไม่สำเร็จ" : state.tagsError ? "โหลด Tags ไม่สำเร็จ" : "โหลดความสัมพันธ์ Tags ไม่สำเร็จ"}</p>
        <p>{state.snapshot ? "กำลังแสดง Tags ชุดก่อนหน้า ซึ่งอาจไม่เป็นปัจจุบัน " : "ยังไม่สามารถแสดง Tags ที่ครบถ้วนได้ "}พักการกรองด้วย Tags และแสดงรายการทั้งหมด โดยเก็บตัวกรองที่เลือกไว้เพื่อลองใหม่</p>
        <p>เมื่อข้อมูลรายการหลักพร้อม คุณยังเลือกและบันทึกรายการได้ การบันทึกนี้ไม่แก้ไข Tags ในคลัง</p>
      </>}
    {!state.ready && <button type="button" disabled={disabled || state.loading} onClick={() => void state.retry()} aria-busy={state.loading}
      className="min-h-11 rounded-lg border border-amber-700 bg-white px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-60">{state.loading ? "กำลังลองใหม่…" : "ลองใหม่"}</button>}
  </div>;
}
