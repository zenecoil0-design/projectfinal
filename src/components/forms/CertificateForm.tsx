"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  useSearchParams,
} from "next/navigation";

import {
  FaAward,
  FaCheck,
  FaFilter,
  FaImage,
  FaPlus,
  FaTag,
} from "react-icons/fa";

import {
  CertificateItem,
  useCertificateStore,
} from "@/store/useCertificateStore";

import { createClient } from "@/lib/supabase/client";

type UserTag = {
  id: string;
  name: string;
};

type LibraryCertificateImage = {
  id: string;
  image_url: string;
  sort_order: number;
};

type LibraryCertificate = {
  id: string;
  title: string;
  description: string;
  issued_by: string | null;
  issued_date: string | null;
  tagIds: string[];
  images: LibraryCertificateImage[];
};

type CertificateRow = {
  id: string;
  title: string;
  description: string;
  issued_by: string | null;
  issued_date: string | null;
};

type CertificateTagRow = {
  certificate_id: string;
  tag_id: string;
};

type CertificateImageRow = {
  id: string;
  certificate_id: string;
  image_url: string;
  sort_order: number;
};

type PortfolioCertificateRow = {
  certificate_id: string;
  sort_order: number;
};

export default function CertificateForm({
  onNext,
}: {
  onNext: () => void;
}) {
  const searchParams =
    useSearchParams();

  const portfolioId =
    searchParams.get("portfolio");

  const supabase = useMemo(
    () => createClient(),
    []
  );

  const {
    certificates,
    setCertificates,
  } = useCertificateStore();

  const [
    libraryCertificates,
    setLibraryCertificates,
  ] =
    useState<
      LibraryCertificate[]
    >([]);

  const [tags, setTags] =
    useState<UserTag[]>([]);

  const [
    selectedFilterTag,
    setSelectedFilterTag,
  ] = useState<
    string | null
  >(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [loadError, setLoadError] =
    useState("");

  const [
    saveError,
    setSaveError,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const mapLibraryCertificateToStore = (
    certificate: LibraryCertificate
  ): CertificateItem => ({
    id: certificate.id,

    title:
      certificate.title ??
      "",

    description:
      certificate.description ??
      "",

    issuedBy:
      certificate.issued_by ??
      "",

    issuedDate:
      certificate.issued_date ??
      "",

    images:
      certificate.images.map(
        (image) =>
          image.image_url
      ),
  });

  useEffect(() => {
    const loadData =
      async () => {
        setIsLoading(true);

        setLoadError("");
        setSaveError("");
        setSuccessMessage("");

        setCertificates([]);

        if (!portfolioId) {
          setLoadError(
            "ไม่พบ Portfolio ID"
          );

          setIsLoading(false);

          return;
        }

        try {
          const {
            data: { user },
            error: userError,
          } =
            await supabase.auth.getUser();

          if (
            userError ||
            !user
          ) {
            throw new Error(
              "ไม่สามารถตรวจสอบผู้ใช้งานได้"
            );
          }

          const [
            {
              data:
                certificateData,
              error:
                certificateError,
            },

            {
              data: tagData,
              error: tagError,
            },

            {
              data:
                certificateTagData,
              error:
                certificateTagError,
            },

            {
              data:
                certificateImageData,
              error:
                certificateImageError,
            },

            {
              data:
                portfolioCertificateData,
              error:
                portfolioCertificateError,
            },
          ] =
            await Promise.all([
              supabase
                .from(
                  "user_library_certificates"
                )
                .select(
                  `
                    id,
                    title,
                    description,
                    issued_by,
                    issued_date
                  `
                )
                .eq(
                  "user_id",
                  user.id
                )
                .order(
                  "created_at",
                  {
                    ascending:
                      false,
                  }
                ),

              supabase
                .from(
                  "user_tags"
                )
                .select(
                  "id, name"
                )
                .eq(
                  "user_id",
                  user.id
                )
                .order(
                  "name",
                  {
                    ascending:
                      true,
                  }
                ),

              supabase
                .from(
                  "user_library_certificate_tags"
                )
                .select(
                  "certificate_id, tag_id"
                ),

              supabase
                .from(
                  "user_library_certificate_images"
                )
                .select(
                  "id, certificate_id, image_url, sort_order"
                )
                .order(
                  "sort_order",
                  {
                    ascending:
                      true,
                  }
                ),

              supabase
                .from(
                  "portfolio_certificates"
                )
                .select(
                  "certificate_id, sort_order"
                )
                .eq(
                  "portfolio_id",
                  portfolioId
                )
                .order(
                  "sort_order",
                  {
                    ascending:
                      true,
                  }
                ),
            ]);

          if (
            certificateError
          ) {
            throw certificateError;
          }

          if (tagError) {
            console.error(
              "Load certificate tags error:",
              tagError
            );
          }

          if (
            certificateTagError
          ) {
            console.error(
              "Load certificate tag relations error:",
              certificateTagError
            );
          }

          if (
            certificateImageError
          ) {
            console.error(
              "Load certificate images error:",
              certificateImageError
            );
          }

          if (
            portfolioCertificateError
          ) {
            throw portfolioCertificateError;
          }

          const certificateRows:
            CertificateRow[] =
            certificateData ?? [];

          const tagRows:
            CertificateTagRow[] =
            certificateTagData ??
            [];

          const imageRows:
            CertificateImageRow[] =
            certificateImageData ??
            [];

          const portfolioRows:
            PortfolioCertificateRow[] =
            portfolioCertificateData ??
            [];

          const mappedLibrary:
            LibraryCertificate[] =
            certificateRows.map(
              (
                certificate
              ) => ({
                ...certificate,

                tagIds:
                  tagRows
                    .filter(
                      (
                        relation
                      ) =>
                        relation.certificate_id ===
                        certificate.id
                    )
                    .map(
                      (
                        relation
                      ) =>
                        relation.tag_id
                    ),

                images:
                  imageRows
                    .filter(
                      (
                        image
                      ) =>
                        image.certificate_id ===
                        certificate.id
                    )
                    .sort(
                      (
                        a,
                        b
                      ) =>
                        a.sort_order -
                        b.sort_order
                    )
                    .map(
                      (
                        image
                      ) => ({
                        id:
                          image.id,

                        image_url:
                          image.image_url,

                        sort_order:
                          image.sort_order,
                      })
                    ),
              })
            );

          setTags(
            tagData ?? []
          );

          setLibraryCertificates(
            mappedLibrary
          );

          const selectedItems =
            portfolioRows
              .map(
                (
                  relation
                ) =>
                  mappedLibrary.find(
                    (
                      certificate
                    ) =>
                      certificate.id ===
                      relation.certificate_id
                  )
              )
              .filter(
                (
                  certificate
                ): certificate is LibraryCertificate =>
                  Boolean(
                    certificate
                  )
              )
              .map(
                mapLibraryCertificateToStore
              );

          setCertificates(
            selectedItems
          );
        } catch (
          error: any
        ) {
          console.error(
            "Load certificate form error:",
            error
          );

          setLoadError(
            error?.message ||
              "ไม่สามารถโหลดเกียรติบัตรได้"
          );
        } finally {
          setIsLoading(false);
        }
      };

    loadData();
  }, [
    portfolioId,
    supabase,
    setCertificates,
  ]);

  const selectedIds =
    certificates.map(
      (certificate) =>
        certificate.id
    );

  const isSelected = (
    id: string
  ) =>
    selectedIds.includes(
      id
    );

  const toggleCertificate = (
    certificate: LibraryCertificate
  ) => {
    setSaveError("");
    setSuccessMessage("");

    if (
      isSelected(
        certificate.id
      )
    ) {
      setCertificates(
        certificates.filter(
          (item) =>
            item.id !==
            certificate.id
        )
      );

      return;
    }

    setCertificates([
      ...certificates,

      mapLibraryCertificateToStore(
        certificate
      ),
    ]);
  };

  const filteredCertificates =
    selectedFilterTag
      ? libraryCertificates.filter(
          (
            certificate
          ) =>
            certificate.tagIds.includes(
              selectedFilterTag
            )
        )
      : libraryCertificates;

  const handleNext = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!portfolioId) {
      setSaveError(
        "ไม่พบ Portfolio ID"
      );

      return;
    }

    setIsSaving(true);
    setSaveError("");
    setSuccessMessage("");

    try {
      const {
        error:
          deleteError,
      } = await supabase
        .from(
          "portfolio_certificates"
        )
        .delete()
        .eq(
          "portfolio_id",
          portfolioId
        );

      if (deleteError) {
        throw deleteError;
      }

      if (
        certificates.length >
        0
      ) {
        const rowsToInsert =
          certificates.map(
            (
              certificate,
              index
            ) => ({
              portfolio_id:
                portfolioId,

              certificate_id:
                certificate.id,

              sort_order:
                index,
            })
          );

        const {
          error:
            insertError,
        } = await supabase
          .from(
            "portfolio_certificates"
          )
          .insert(
            rowsToInsert
          );

        if (insertError) {
          throw insertError;
        }
      }

      setSuccessMessage(
        "บันทึกเกียรติบัตรเรียบร้อยแล้ว"
      );

      onNext();
    } catch (
      error: any
    ) {
      console.error(
        "Save portfolio certificates error:",
        error
      );

      setSaveError(
        error?.message ||
          "ไม่สามารถบันทึกเกียรติบัตรได้"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleNext}
      className="flex flex-col gap-5 pb-10"
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="border-l-4 border-blue-500 pl-2 text-sm font-bold text-slate-800">
              หน้าที่ 6:
              เกียรติบัตร
            </h3>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              เลือกเกียรติบัตรหรือรางวัลจากคลังข้อมูล
              รายการที่เลือกจะถูกบันทึกเฉพาะ
              Portfolio เล่มนี้
            </p>
          </div>

          <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
            เลือกแล้ว{" "}
            {
              certificates.length
            }{" "}
            รายการ
          </span>
        </div>
      </div>

      {tags.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <FaFilter />

            กรองด้วย Tag
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setSelectedFilterTag(
                  null
                )
              }
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                selectedFilterTag ===
                null
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"
              }`}
            >
              ทั้งหมด
            </button>

            {tags.map(
              (tag) => (
                <button
                  key={
                    tag.id
                  }
                  type="button"
                  onClick={() =>
                    setSelectedFilterTag(
                      tag.id
                    )
                  }
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                    selectedFilterTag ===
                    tag.id
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"
                  }`}
                >
                  <FaTag className="text-[9px]" />

                  {tag.name}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
          <div className="text-center">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

            <p className="mt-3 text-xs font-medium text-slate-500">
              กำลังโหลดเกียรติบัตร...
            </p>
          </div>
        </div>
      )}

      {!isLoading &&
        loadError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-bold text-red-700">
              {loadError}
            </p>
          </div>
        )}

      {!isLoading &&
        !loadError &&
        libraryCertificates.length ===
          0 && (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FaAward />
            </div>

            <h4 className="mt-3 text-sm font-bold text-slate-800">
              ยังไม่มีเกียรติบัตรในคลัง
            </h4>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              เพิ่มเกียรติบัตรในคลังข้อมูลก่อน
              แล้วกลับมาเลือกใช้ใน
              Portfolio
            </p>

            <Link
              href="/my-data"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700"
            >
              <FaPlus />

              ไปเพิ่มข้อมูล
            </Link>
          </div>
        )}

      {!isLoading &&
        !loadError &&
        libraryCertificates.length >
          0 &&
        filteredCertificates.length ===
          0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
            <p className="text-xs font-semibold text-slate-500">
              ไม่มีเกียรติบัตรที่ตรงกับ
              Tag นี้
            </p>
          </div>
        )}

      {!isLoading &&
        !loadError &&
        filteredCertificates.length >
          0 && (
          <div className="flex flex-col gap-3">
            {filteredCertificates.map(
              (
                certificate
              ) => {
                const selected =
                  isSelected(
                    certificate.id
                  );

                const itemTags =
                  tags.filter(
                    (
                      tag
                    ) =>
                      certificate.tagIds.includes(
                        tag.id
                      )
                  );

                return (
                  <button
                    key={
                      certificate.id
                    }
                    type="button"
                    onClick={() =>
                      toggleCertificate(
                        certificate
                      )
                    }
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      selected
                        ? "border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-200"
                        : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex gap-3">
                      <div
                        className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
                          selected
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-300 bg-white text-transparent"
                        }`}
                      >
                        <FaCheck className="text-[10px]" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="break-words text-sm font-black text-slate-800">
                              {
                                certificate.title
                              }
                            </h4>

                            {certificate.issued_by && (
                              <p className="mt-1 text-xs font-semibold text-slate-500">
                                {
                                  certificate.issued_by
                                }
                              </p>
                            )}
                          </div>

                          {selected && (
                            <span className="shrink-0 rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-bold text-white">
                              เลือกแล้ว
                            </span>
                          )}
                        </div>

                        {certificate.description && (
                          <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-500">
                            {
                              certificate.description
                            }
                          </p>
                        )}

                        {certificate.issued_date && (
                          <p className="mt-2 text-[11px] font-medium text-slate-400">
                            วันที่ได้รับ{" "}
                            {
                              certificate.issued_date
                            }
                          </p>
                        )}

                        {certificate.images.length >
                          0 && (
                          <div className="mt-3 flex gap-2 overflow-hidden">
                            {certificate.images
                              .slice(
                                0,
                                4
                              )
                              .map(
                                (
                                  image
                                ) => (
                                  <div
                                    key={
                                      image.id
                                    }
                                    className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white"
                                  >
                                    <img
                                      src={
                                        image.image_url
                                      }
                                      alt=""
                                      className="h-full w-full object-contain"
                                    />
                                  </div>
                                )
                              )}
                          </div>
                        )}

                        {itemTags.length >
                          0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {itemTags.map(
                              (
                                tag
                              ) => (
                                <span
                                  key={
                                    tag.id
                                  }
                                  className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-500"
                                >
                                  {
                                    tag.name
                                  }
                                </span>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              }
            )}
          </div>
        )}

      {libraryCertificates.length >
        0 && (
        <Link
          href="/my-data"
          className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-xs font-bold text-slate-500 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
        >
          <FaImage />

          จัดการเกียรติบัตรในคลัง
        </Link>
      )}

      {saveError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold leading-5 text-red-600">
          {saveError}
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold leading-5 text-emerald-700">
          {successMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={
          isLoading ||
          isSaving
        }
        className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-slate-800 py-3 text-sm font-bold text-white shadow-md transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <FaCheck />

        {isSaving
          ? "กำลังบันทึก..."
          : "ยืนยันเกียรติบัตร"}
      </button>
    </form>
  );
}