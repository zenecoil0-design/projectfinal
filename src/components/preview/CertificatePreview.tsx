"use client";

import { useCertificateStore } from "@/store/useCertificateStore";
import A4Page from "@/components/preview/A4Page";

const ITEMS_PER_PAGE = 2;

export default function CertificatePreview() {
  const { certificates } = useCertificateStore();
  const pages = [];

  for (let index = 0; index < certificates.length; index += ITEMS_PER_PAGE) {
    pages.push(certificates.slice(index, index + ITEMS_PER_PAGE));
  }

  if (pages.length === 0) {
    pages.push([]);
  }

  return (
    <div className="flex flex-col gap-10">
      {pages.map((pageItems, pageIndex) => (
        <A4Page
          key={pageIndex}
          className="flex flex-col justify-between p-16 text-slate-800"
        >
          <div className="mb-6 flex items-center justify-between border-b pb-4">
            <h2 className="text-3xl font-bold tracking-wider">
              เกียรติบัตร
            </h2>
            {pages.length > 1 && (
              <span className="text-sm font-semibold text-slate-400">
                หน้า {pageIndex + 1} / {pages.length}
              </span>
            )}
          </div>

          <div className="min-h-0 flex-1 space-y-5 overflow-hidden">
            {pageItems.map((certificate, itemIndex) => {
              const actualIndex =
                pageIndex * ITEMS_PER_PAGE + itemIndex + 1;

              return (
                <div
                  key={certificate.id}
                  className="flex min-h-0 flex-1 flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-5"
                >
                  <span className="w-max rounded-md border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600">
                    เกียรติบัตรที่ {actualIndex}
                  </span>

                  <h3 className="break-words text-lg font-bold text-slate-800">
                    {certificate.title || "ชื่อเกียรติบัตร / รางวัล"}
                  </h3>

                  <p className="max-h-16 overflow-hidden whitespace-pre-line break-words text-sm leading-relaxed text-slate-600">
                    {certificate.description || "รายละเอียดเกียรติบัตร..."}
                  </p>

                  {certificate.imageUrl && (
                    <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg border border-slate-700 bg-slate-900 p-1">
                      <img
                        src={certificate.imageUrl}
                        alt={`Certificate ${actualIndex}`}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 border-t pt-4 text-center text-xs text-slate-400">
            Portfolio - หน้าเกียรติบัตร
          </div>
        </A4Page>
      ))}
    </div>
  );
}
