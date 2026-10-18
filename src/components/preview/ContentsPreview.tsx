"use client";

import Paper from "./Paper";

/** Generated presentation only; no corresponding form/store/loading status. */
export default function ContentsPreview() {
  return <Paper sectionId="toc" data-section="สารบัญ" className="portfolio-page toc-sheet relative flex flex-col bg-white p-16 text-slate-800 shadow-2xl">
    <div className="mb-10 border-b pb-4"><h2 className="text-3xl font-bold tracking-wide">สารบัญ</h2></div>
    <div className="flex-1"><ol data-toc-entries aria-label="สารบัญหมวดเนื้อหา" /></div>
    <div className="mt-6 border-t pt-4 text-xs text-slate-400">Portfolio — สารบัญ</div>
  </Paper>;
}
