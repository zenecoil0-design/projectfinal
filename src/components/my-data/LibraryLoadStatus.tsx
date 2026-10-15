"use client";

type Props = { isLoading: boolean; loaded: boolean; loadError: boolean; tagsError: boolean; retry: () => void };

export default function LibraryLoadStatus({ isLoading, loaded, loadError, tagsError, retry }: Props) {
  if (!loadError && !tagsError) return null;
  return <div role="alert" className="my-4 space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
    {loadError && <p>{loaded ? "อัปเดตข้อมูลไม่สำเร็จ กำลังแสดงข้อมูลที่โหลดไว้ก่อนหน้า" : "โหลดรายการหรือรูปภาพไม่สำเร็จ กรุณาลองใหม่"}</p>}
    {tagsError && <p>โหลด Tags ไม่สำเร็จ ยังยืนยัน Tags ของรายการไม่ได้ กรุณาลองใหม่ก่อนแก้ไขหรือบันทึกข้อมูล</p>}
    <button type="button" disabled={isLoading} onClick={retry} className="min-h-11 rounded-lg border border-amber-400 bg-white px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:opacity-60">
      {isLoading ? "กำลังลองใหม่..." : "ลองใหม่"}
    </button>
  </div>;
}
