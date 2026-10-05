"use client";

import A4Page from "@/components/preview/A4Page";
import { packItemsByHeight } from "@/lib/autoPagination";
import {
  type CertificateItem,
  useCertificateStore,
} from "@/store/useCertificateStore";

const PAGE_CAPACITY = 790;
const ITEM_GAP = 20;

function getDescriptionLines(description: string) {
  if (!description.trim()) {
    return 1;
  }

  return Math.min(
    4,
    Math.max(1, Math.ceil(description.length / 75))
  );
}

function getCertificateHeight(certificate: CertificateItem) {
  const textHeight =
    110 + getDescriptionLines(certificate.description) * 20;

  if (!certificate.imageUrl) {
    return Math.max(180, textHeight);
  }

  return Math.max(350, textHeight + 220);
}

export default function CertificatePreview() {
  const { certificates } = useCertificateStore();

  const pages = packItemsByHeight(
    certificates,
    getCertificateHeight,
    PAGE_CAPACITY,
    ITEM_GAP
  );

  let runningIndex = 0;

  return (
    <div className="flex flex-col gap-10">
      {pages.map((pageItems, pageIndex) => (
        <A4Page
          key={pageIndex}
          className="flex flex-col p-16 text-slate-800"
        >
          <div className="mb-6 flex shrink-0 items-center justify-between border-b pb-4">
            <h2 className="text-3xl font-bold tracking-wider">
              เกียรติบัตร
            </h2>

            {pages.length > 1 && (
              <span className="text-sm font-semibold text-slate-400">
                หน้า {pageIndex + 1} / {pages.length}
              </span>
            )}
          </div>

          <div
            className="min-h-0 flex-1 overflow-hidden"
            style={{ display: "flex", flexDirection: "column", gap: ITEM_GAP }}
          >
            {pageItems.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
                ยังไม่มีข้อมูลเกียรติบัตร
              </div>
            ) : (
              pageItems.map((certificate) => {
                runningIndex += 1;
                const certificateNumber = runningIndex;
                const reservedHeight =
                  getCertificateHeight(certificate);

                return (
                  <article
                    key={certificate.id}
                    className="flex shrink-0 flex-col gap-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-5"
                    style={{ height: reservedHeight }}
                  >
                    <span className="w-max rounded-md border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600">
                      เกียรติบัตรที่ {certificateNumber}
                    </span>

                    <h3 className="break-words text-lg font-bold text-slate-800">
                      {certificate.title || "ชื่อเกียรติบัตร / รางวัล"}
                    </h3>

                    <p className="max-h-20 overflow-hidden whitespace-pre-line break-words text-sm leading-relaxed text-slate-600">
                      {certificate.description ||
                        "รายละเอียดเกียรติบัตร..."}
                    </p>

                    {certificate.imageUrl && (
                      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white p-1">
                        <img
                          src={certificate.imageUrl}
                          alt={`Certificate ${certificateNumber}`}
                          className="h-full w-full object-contain"
                        />
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>

          <div className="mt-6 shrink-0 border-t pt-4 text-center text-xs text-slate-400">
            Portfolio - หน้าเกียรติบัตร
          </div>
        </A4Page>
      ))}
    </div>
  );
}
