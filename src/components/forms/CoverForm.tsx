"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useSearchParams,
} from "next/navigation";

import {
  FaImage,
  FaTrash,
} from "react-icons/fa";

import { useCoverStore } from "@/store/useCoverStore";
import { createClient } from "@/lib/supabase/client";

export default function CoverForm({
  onNext,
}: {
  onNext: () => void;
}) {
  const searchParams =
    useSearchParams();

  const portfolioId =
    searchParams.get("portfolio");

  const store =
    useCoverStore();

  const [
    pendingCoverFile,
    setPendingCoverFile,
  ] = useState<File | null>(
    null
  );

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  // =====================================================
  // LOAD COVER FROM SUPABASE
  // =====================================================

  useEffect(() => {
    const loadCover =
      async () => {
        if (!portfolioId) {
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        setErrorMessage("");

        try {
          const supabase =
            createClient();

          const {
            data,
            error,
          } = await supabase
            .from("covers")
            .select(
              `
                id,
                title,
                school_name,
                cover_image_url
              `
            )
            .eq(
              "portfolio_id",
              portfolioId
            )
            .order(
              "created_at",
              {
                ascending: false,
              }
            )
            .limit(1)
            .maybeSingle();

          if (error) {
            throw error;
          }

          // ถ้ามีข้อมูล Cover ของ Portfolio นี้แล้ว
          if (data) {
            store.setCover(
              "portfolioTitle",
              data.title ||
                "PORTFOLIO"
            );

            store.setCover(
              "schoolName",
              data.school_name ||
                ""
            );

            store.setCover(
              "coverImage",
              data.cover_image_url ||
                ""
            );
          } else {
            // Portfolio ใหม่
            // ป้องกันข้อมูล localStorage จาก Portfolio เก่าปนมา
            store.setCover(
              "portfolioTitle",
              "PORTFOLIO"
            );

            store.setCover(
              "schoolName",
              ""
            );

            store.setCover(
              "coverImage",
              ""
            );
          }

          setPendingCoverFile(
            null
          );
        } catch (error: any) {
          console.error(
            "Load cover error:",
            error
          );

          setErrorMessage(
            error?.message ||
              "ไม่สามารถโหลดข้อมูลหน้าปกได้"
          );
        } finally {
          setIsLoading(false);
        }
      };

    loadCover();
  }, [portfolioId]);

  // =====================================================
  // SELECT COVER IMAGE
  // =====================================================

  const handleCoverUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      ![
        "image/jpeg",
        "image/png",
      ].includes(file.type)
    ) {
      setErrorMessage(
        "รองรับเฉพาะไฟล์ JPG และ PNG"
      );

      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setErrorMessage(
        "รูปภาพต้องมีขนาดไม่เกิน 5MB"
      );

      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    setPendingCoverFile(
      file
    );

    const imageUrl =
      URL.createObjectURL(
        file
      );

    store.setCover(
      "coverImage",
      imageUrl
    );
  };

  // =====================================================
  // REMOVE COVER IMAGE
  // =====================================================

  const handleRemoveImage =
    () => {
      setPendingCoverFile(
        null
      );

      store.setCover(
        "coverImage",
        ""
      );

      setSuccessMessage("");
    };

  // =====================================================
  // UPLOAD IMAGE
  // =====================================================

  const uploadCoverImage =
    async (
      userId: string
    ) => {
      if (
        !pendingCoverFile ||
        !portfolioId
      ) {
        return store.coverImage;
      }

      const supabase =
        createClient();

      const extension =
        pendingCoverFile.name
          .split(".")
          .pop()
          ?.toLowerCase() ||
        "jpg";

      const filePath =
        `users/${userId}/portfolios/${portfolioId}/cover/` +
        `${crypto.randomUUID()}.${extension}`;

      const {
        error: uploadError,
      } = await supabase.storage
        .from(
          "portfolio-images"
        )
        .upload(
          filePath,
          pendingCoverFile,
          {
            cacheControl:
              "3600",
            upsert: false,
          }
        );

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: publicUrlData,
      } = supabase.storage
        .from(
          "portfolio-images"
        )
        .getPublicUrl(
          filePath
        );

      return (
        publicUrlData
          .publicUrl || ""
      );
    };

  // =====================================================
  // SAVE COVER
  // =====================================================

  const handleSave = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!portfolioId) {
      setErrorMessage(
        "ไม่พบ Portfolio ID"
      );

      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const supabase =
        createClient();

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
          "ไม่พบข้อมูลผู้ใช้งาน"
        );
      }

      let coverImageUrl =
        store.coverImage;

      if (
        pendingCoverFile
      ) {
        coverImageUrl =
          await uploadCoverImage(
            user.id
          );
      }

      // หา Cover เดิมของ Portfolio นี้
      const {
        data: existingCover,
        error:
          existingCoverError,
      } = await supabase
        .from("covers")
        .select("id")
        .eq(
          "portfolio_id",
          portfolioId
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        )
        .limit(1)
        .maybeSingle();

      if (
        existingCoverError
      ) {
        throw existingCoverError;
      }

      const payload = {
        portfolio_id:
          portfolioId,

        title:
          store.portfolioTitle.trim(),

        school_name:
          store.schoolName.trim(),

        cover_image_url:
          coverImageUrl || null,
      };

      // ถ้ามีแล้ว -> update
      if (
        existingCover?.id
      ) {
        const {
          error:
            updateError,
        } = await supabase
          .from("covers")
          .update(payload)
          .eq(
            "id",
            existingCover.id
          );

        if (updateError) {
          throw updateError;
        }
      } else {
        // ถ้ายังไม่มี -> insert

        const {
          error:
            insertError,
        } = await supabase
          .from("covers")
          .insert(payload);

        if (insertError) {
          throw insertError;
        }
      }

      // เปลี่ยน blob URL ให้เป็น Supabase public URL
      store.setCover(
        "coverImage",
        coverImageUrl || ""
      );

      setPendingCoverFile(
        null
      );

      setSuccessMessage(
        "บันทึกข้อมูลหน้าปกเรียบร้อยแล้ว"
      );

      // ไปหน้าถัดไป
      onNext();
    } catch (error: any) {
      console.error(
        "Save cover error:",
        error
      );

      setErrorMessage(
        error?.message ||
          "ไม่สามารถบันทึกข้อมูลหน้าปกได้"
      );
    } finally {
      setIsSaving(false);
    }
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (isLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-3 text-xs font-semibold text-slate-500">
            กำลังโหลดข้อมูลหน้าปก...
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSave}
      className="flex flex-col gap-6 pb-10"
    >
      <div className="flex flex-col gap-3">
        <h3 className="border-l-4 border-blue-500 pl-2 text-sm font-bold text-slate-800">
          หน้าที่ 1: ข้อมูลหน้าปก
          (Cover Page)
        </h3>

        <div className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
          {/* Portfolio title */}

          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-500">
              หัวข้อหลักของพอร์ต
              (เช่น PORTFOLIO /
              แฟ้มสะสมผลงาน)

              <span className="text-red-500">
                {" "}
                *
              </span>
            </label>

            <input
              type="text"
              value={
                store.portfolioTitle
              }
              onChange={(
                event
              ) =>
                store.setCover(
                  "portfolioTitle",
                  event.target
                    .value
                )
              }
              placeholder="PORTFOLIO"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-bold outline-none focus:border-blue-500"
            />
          </div>

          {/* School */}

          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-500">
              ชื่อโรงเรียน

              <span className="text-red-500">
                {" "}
                *
              </span>
            </label>

            <input
              type="text"
              value={
                store.schoolName
              }
              onChange={(
                event
              ) =>
                store.setCover(
                  "schoolName",
                  event.target
                    .value
                )
              }
              placeholder="เช่น โรงเรียนเบ็ญจะมะมหาราช"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>

          {/* Cover image */}

          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-500">
              รูปภาพพื้นหลังหน้าปก
              (ถ้ามี)
            </label>

            <div className="flex items-center gap-4">
              <div className="flex h-28 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-300 bg-slate-200">
                {store.coverImage ? (
                  <img
                    src={
                      store.coverImage
                    }
                    alt="Cover Preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <FaImage className="text-2xl text-slate-400" />
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="flex w-max cursor-pointer items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600 transition-colors hover:bg-blue-100">
                  <FaImage />

                  เลือกรูปหน้าปก

                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={
                      handleCoverUpload
                    }
                  />
                </label>

                {store.coverImage && (
                  <button
                    type="button"
                    onClick={
                      handleRemoveImage
                    }
                    className="flex items-center gap-1 text-left text-xs font-semibold text-red-500 hover:text-red-700"
                  >
                    <FaTrash className="text-[10px]" />

                    ลบรูปภาพ
                  </button>
                )}

                <span className="text-[10px] leading-4 text-slate-400">
                  JPG หรือ PNG
                  ขนาดไม่เกิน 5MB
                  แนะนำรูปแนวตั้ง
                  (A4 Ratio)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold leading-5 text-red-600">
          {errorMessage}
        </div>
      )}

      {/* Success */}

      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold leading-5 text-emerald-700">
          {successMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={isSaving}
        className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-slate-800 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving
          ? "กำลังบันทึก..."
          : "💾 บันทึกข้อมูลหน้าปก"}
      </button>
    </form>
  );
}