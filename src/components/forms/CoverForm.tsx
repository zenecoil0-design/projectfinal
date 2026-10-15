"use client";
import CropInput from "@/components/images/CropInput";

import { useEditorSession } from "@/components/editor/EditorSession";
import { errorMessage as getErrorMessage } from "@/lib/errors";

import {
  useEffect,
  useRef,
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

const inputClassName = "min-h-11 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-800 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 sm:text-sm";
const labelClassName = "mb-2 block text-sm font-semibold leading-5 text-slate-700";

export default function CoverForm({
  onNext,
  active = true,
}: {
  onNext: () => void;
  active?: boolean;
}) {
  const { reportLoaded, markSaved, status, exporting } = useEditorSession();
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
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

  useEffect(() => {
    const url = store.coverImage;
    return () => { if (url.startsWith("blob:")) URL.revokeObjectURL(url); };
  }, [store.coverImage]);

  // =====================================================
  // LOAD COVER FROM SUPABASE
  // =====================================================

  useEffect(() => {
    const store = useCoverStore.getState();
    let cancelled = false;
    let loadSucceeded = true;
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
                first_name,
                last_name,
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

          if (cancelled) return;
          if (error) {
            throw error;
          }

          store.setCover("firstName", data?.first_name ?? "");
          store.setCover("lastName", data?.last_name ?? "");

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
        } catch (error: unknown) {
          if (cancelled) return;
          loadSucceeded = false;
          console.error(
            "Load cover error:",
            error
          );

          setErrorMessage(
            getErrorMessage(error) ||
              "ไม่สามารถโหลดข้อมูลหน้าปกได้"
          );
        } finally {
          if (!cancelled) {
            reportLoaded("cover", loadSucceeded);
          setIsLoading(false);
        }
          }
      };

    loadCover();
    return () => { cancelled = true; };
  }, [portfolioId, reportLoaded]);

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

      const { error: saveError } = await supabase.from("covers").upsert({
        portfolio_id: portfolioId,
        title: store.portfolioTitle.trim(),
        school_name: store.schoolName.trim(),
        first_name: store.firstName.trim(),
        last_name: store.lastName.trim(),
        cover_image_url: coverImageUrl || null,
      }, { onConflict: "portfolio_id" });
      if (saveError) throw saveError;

      // เปลี่ยน blob URL ให้เป็น Supabase public URL
      if (!mounted.current) return;
      store.setCover(
        "coverImage",
        coverImageUrl || ""
      );

      setPendingCoverFile(
        null
      );

      store.setCover("firstName", store.firstName.trim());
      store.setCover("lastName", store.lastName.trim());
      markSaved("cover");
      setSuccessMessage(
        "บันทึกข้อมูลหน้าปกเรียบร้อยแล้ว"
      );

      // ไปหน้าถัดไป
      onNext();
    } catch (error: unknown) {
      console.error(
        "Save cover error:",
        error
      );

      setErrorMessage(
        getErrorMessage(error) ||
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
      className="flex min-w-0 flex-col gap-5 pb-6"
    >
      <fieldset disabled={exporting || isSaving || isLoading || status.cover === "error"} className="contents">
      <div className="flex flex-col gap-3">
        <h3 className="border-l-4 border-blue-500 pl-2 text-sm font-bold text-slate-800">
          หน้าที่ 1: ข้อมูลหน้าปก
          (Cover Page)
        </h3>

        <div className="@container flex min-w-0 flex-col gap-5 rounded-xl border border-slate-100 bg-slate-50 p-4">
          {/* Portfolio title */}

          <div>
            <label htmlFor="cover-title" className={labelClassName}>
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
              id="cover-title"
              placeholder="PORTFOLIO"
              required
              className={inputClassName}
            />
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-5 @min-[22rem]:grid-cols-2">
            <div>
              <label htmlFor="cover-first-name" className={labelClassName}>ชื่อบนหน้าปก</label>
              <input id="cover-first-name" type="text" autoComplete="given-name"
                value={store.firstName}
                onChange={event => { store.setCover("firstName", event.target.value); setSuccessMessage(""); }}
                placeholder="ชื่อ"
                className={inputClassName} />
            </div>
            <div>
              <label htmlFor="cover-last-name" className={labelClassName}>นามสกุลบนหน้าปก</label>
              <input id="cover-last-name" type="text" autoComplete="family-name"
                value={store.lastName}
                onChange={event => { store.setCover("lastName", event.target.value); setSuccessMessage(""); }}
                placeholder="นามสกุล"
                className={inputClassName} />
            </div>
          </div>

          {/* School */}

          <div>
            <label htmlFor="cover-school" className={labelClassName}>
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
              id="cover-school"
              placeholder="เช่น โรงเรียนเบ็ญจะมะมหาราช"
              required
              className={inputClassName}
            />
          </div>

          {/* Cover image */}

          <div>
            <p className={labelClassName}>
              รูปภาพบนหน้าปก
              (ถ้ามี)
            </p>

            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex h-28 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-300 bg-slate-200">
                {store.coverImage ? (
                  <img
                    src={
                      store.coverImage
                    }
                    alt="ตัวอย่างรูปหน้าปก"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <FaImage className="text-2xl text-slate-400" />
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <label className="flex min-h-11 w-fit max-w-full cursor-pointer items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-100">
                  <FaImage />

                  เลือกรูปหน้าปก

                  <CropInput active={active}
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
                    className="flex min-h-11 w-fit items-center gap-2 rounded-md px-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                  >
                    <FaTrash className="text-[10px]" />

                    ลบรูปภาพ
                  </button>
                )}

                <span className="text-xs leading-5 text-slate-500">
                  JPG หรือ PNG
                  ขนาดไม่เกิน 5MB
                  แสดงในกรอบวงกลมหรือกรอบโค้งตามเทมเพลต
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 border-t border-slate-200 pt-4">
        <p className="text-sm leading-6 text-slate-600">
          กดบันทึกเพื่อเก็บข้อมูลหน้าปกและไปกรอกคำนำ
        </p>

        {/* Error */}

        {errorMessage && (
          <div role="alert" className="break-words rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700">
            {errorMessage}
          </div>
        )}

        {/* Success */}

        {successMessage && (
          <div role="status" className="break-words rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium leading-6 text-emerald-700">
            {successMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={isSaving}
          aria-busy={isSaving}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving
            ? "กำลังบันทึก..."
            : "💾 บันทึกและไปหน้าถัดไป"}
        </button>
      </div>
      </fieldset>
    </form>
  );
}