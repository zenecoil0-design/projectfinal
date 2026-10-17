"use client";
import { FaImage } from "react-icons/fa";
import { useCertificateStore } from "@/store/useCertificateStore";
import PaginatedSection from "./PaginatedSection";
export default function CertificatePreview() {
  const certificates = useCertificateStore(state => state.certificates);
  return <PaginatedSection sectionId="certificate" title="เกียรติบัตร" cards={certificates.map((certificate, index) => (
                      <article
                        key={
                          certificate.id
                        }
                        className="document-card certificate-card rounded-xl border border-slate-200 bg-slate-50 p-5"
                      >
                        <div className="document-card-heading flex items-start justify-between gap-4">
                          <div>
                            <span className="rounded-md border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600">
                              เกียรติบัตรที่{" "}
                              {
                                index +
                                1
                              }
                            </span>

                            <h3 className="mt-3 text-lg font-bold text-slate-800">
                              {
                                certificate.title
                              }
                            </h3>

                            {certificate.issuedBy && (
                              <p className="mt-1 text-sm font-semibold text-slate-500">
                                {
                                  certificate.issuedBy
                                }
                              </p>
                            )}
                          </div>

                          {certificate.issuedDate && (
                            <span className="shrink-0 text-xs font-semibold text-slate-400">
                              {
                                certificate.issuedDate
                              }
                            </span>
                          )}
                        </div>

                        {certificate.description && (
                          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                            {
                              certificate.description
                            }
                          </p>
                        )}

                        {certificate.images.length >
                          0 ? (
                          <div
                            className={`document-images mt-4 grid gap-3 ${
                              certificate.images.length ===
                              1
                                ? "grid-cols-1"
                                : "grid-cols-2"
                            }`}
                          >
                            {certificate.images
                              .map(
                                (
                                  imageUrl,
                                  imageIndex
                                ) => (
                                  <div
                                    key={
                                      `${certificate.id}-${imageIndex}`
                                    }
                                    className="flex min-h-[120px] items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white"
                                  >
                                    <img
                                      src={
                                        imageUrl
                                      }
                                      alt={`เกียรติบัตร ${imageIndex + 1}`}
                                      className="max-h-[190px] w-full object-contain"
                                    />
                                  </div>
                                )
                              )}
                          </div>
                        ) : (
                          <div className="document-no-image mt-4 flex h-28 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white text-slate-300">
                            <div className="text-center">
                              <FaImage className="mx-auto" />

                              <p className="mt-1 text-xs">
                                ไม่มีรูปเกียรติบัตร
                              </p>
                            </div>
                          </div>
                        )}
                      </article>
  ))} />;
}
