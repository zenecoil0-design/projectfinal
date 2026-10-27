"use client";
import { useCertificateStore } from "@/store/useCertificateStore";
import PaginatedSection from "./PaginatedSection";
import { useTemplate } from "./Paper";
export default function CertificatePreview() {
  const certificates = useCertificateStore(state => state.certificates);
  const template = useTemplate();
  return <PaginatedSection sectionId="certificate" title="เกียรติบัตร" cards={certificates.map((certificate, index) => (template === "minimal" ? (
    <article key={certificate.id} className="document-card certificate-card gallery-certificate-card" data-gallery-entry="certificate">
      {certificate.images.length > 0 && <div className="gallery-certificate-media document-images" data-image-count={certificate.images.length}>
        {certificate.images.map((url, imageIndex) => <div key={certificate.id + "-" + imageIndex} className="gallery-certificate-image">
          <img src={url} alt={`เกียรติบัตร ${imageIndex + 1}`} />
        </div>)}
      </div>}
      <div className="gallery-certificate-info">
        <span className="gallery-certificate-index">CERTIFICATE / {String(index + 1).padStart(2, "0")}</span>
        <h3>{certificate.title}</h3>
        {certificate.issuedBy.trim() && <p className="gallery-certificate-issuer">{certificate.issuedBy}</p>}
        {certificate.issuedDate.trim() && <p className="gallery-certificate-date">{certificate.issuedDate}</p>}
        {certificate.description.trim() && <p data-split-description className="gallery-certificate-description whitespace-pre-line">{certificate.description}</p>}
      </div>
    </article>
  ) : (
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

                            {certificate.issuedBy.trim() && (
                              <p className="mt-1 text-sm font-semibold text-slate-500">
                                {
                                  certificate.issuedBy
                                }
                              </p>
                            )}
                          </div>

                          {certificate.issuedDate.trim() && (
                            <span className="shrink-0 text-xs font-semibold text-slate-400">
                              {
                                certificate.issuedDate
                              }
                            </span>
                          )}
                        </div>

                        {certificate.description.trim() && (
                          <p data-split-description className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                            {
                              certificate.description
                            }
                          </p>
                        )}

                        {certificate.images.length >
                          0 && (
                          <div
                            data-image-count={certificate.images.length}
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
                        )}
                      </article>
  )))} />;
}
