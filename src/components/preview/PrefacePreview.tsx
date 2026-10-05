"use client";

import { useCoverStore } from "@/store/useCoverStore";
import A4Page from "@/components/preview/A4Page";

export default function PrefacePreview() {
  const coverStore = useCoverStore();

  return (
    <A4Page className="flex flex-col justify-between p-16 text-slate-800">
      <div className="flex flex-col items-center">
        <h2 className="mb-12 text-4xl font-bold tracking-wider">คำนำ</h2>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden px-8">
        <p className="whitespace-pre-line break-words text-base leading-relaxed text-slate-700">
          {coverStore.prefaceText || "พิมพ์ข้อความคำนำของคุณที่นี่"}
        </p>
      </div>

      <div className="mt-10 flex flex-col items-end pr-12">
        <p className="mb-6 text-sm">ด้วยความเคารพอย่างสูง</p>
        <p className="max-w-full break-words text-base font-bold">
          {coverStore.authorName || "ชื่อผู้จัดทำ"}
        </p>
        <p className="mt-1 text-sm text-slate-500">ผู้จัดทำ</p>
      </div>
    </A4Page>
  );
}
