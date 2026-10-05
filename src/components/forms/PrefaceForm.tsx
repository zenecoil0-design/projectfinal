"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useSearchParams,
} from "next/navigation";

import {
  FaCheck,
} from "react-icons/fa";

import {
  useCoverStore,
} from "@/store/useCoverStore";

import {
  createClient,
} from "@/lib/supabase/client";

const DEFAULT_PREFACE =
  "แฟ้มสะสมผลงาน (Portfolio) เล่มนี้ จัดทำขึ้นเพื่อเป็นตัวแทนในการนำเสนอข้อมูลของข้าพเจ้า ซึ่งเกี่ยวกับประวัติส่วนตัว ประวัติการศึกษา ผลงาน และกิจกรรมต่างๆ ที่สะท้อนถึงความรู้ความสามารถและความตั้งใจ ข้าพเจ้าหวังว่าแฟ้มสะสมผลงานเล่มนี้จะทำให้ทุกท่านได้เห็นถึงศักยภาพและความพร้อมในการศึกษาต่อ";

export default function PrefaceForm({
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
  // LOAD PREFACE
  // =====================================================

  useEffect(() => {
    const loadPreface =
      async () => {
        setIsLoading(true);

        setErrorMessage("");
        setSuccessMessage("");

        if (!portfolioId) {
          setErrorMessage(
            "ไม่พบ Portfolio ID"
          );

          setIsLoading(false);

          return;
        }

        try {
          const supabase =
            createClient();

          const {
            data,
            error,
          } = await supabase
            .from("prefaces")
            .select(
              `
                id,
                content,
                signature_name
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

          if (data) {
            store.setCover(
              "prefaceText",
              data.content ||
                DEFAULT_PREFACE
            );

            store.setCover(
              "authorName",
              data.signature_name ||
                ""
            );
          } else {
            // Portfolio ใหม่
            store.setCover(
              "prefaceText",
              DEFAULT_PREFACE
            );

            store.setCover(
              "authorName",
              ""
            );
          }
        } catch (
          error: any
        ) {
          console.error(
            "Load preface error:",
            error
          );

          setErrorMessage(
            error?.message ||
              "ไม่สามารถโหลดข้อมูลคำนำได้"
          );
        } finally {
          setIsLoading(false);
        }
      };

    loadPreface();
  }, [portfolioId]);

  // =====================================================
  // SAVE PREFACE
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

      // หา Preface เดิมของ Portfolio นี้
      const {
        data:
          existingPreface,
        error:
          existingPrefaceError,
      } = await supabase
        .from("prefaces")
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
        existingPrefaceError
      ) {
        throw existingPrefaceError;
      }

      const payload = {
        portfolio_id:
          portfolioId,

        content:
          store.prefaceText.trim(),

        signature_name:
          store.authorName.trim(),
      };

      if (
        existingPreface?.id
      ) {
        const {
          error:
            updateError,
        } = await supabase
          .from("prefaces")
          .update(payload)
          .eq(
            "id",
            existingPreface.id
          );

        if (updateError) {
          throw updateError;
        }
      } else {
        const {
          error:
            insertError,
        } = await supabase
          .from("prefaces")
          .insert(payload);

        if (insertError) {
          throw insertError;
        }
      }

      setSuccessMessage(
        "บันทึกข้อมูลคำนำเรียบร้อยแล้ว"
      );

      onNext();
    } catch (
      error: any
    ) {
      console.error(
        "Save preface error:",
        error
      );

      setErrorMessage(
        error?.message ||
          "ไม่สามารถบันทึกข้อมูลคำนำได้"
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
      <div className="flex min-h-[220px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-3 text-xs font-semibold text-slate-500">
            กำลังโหลดข้อมูลคำนำ...
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
          หน้าที่ 2: คำนำ
          (Preface)
        </h3>

        <div className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
          {/* PREFACE */}

          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-500">
              ข้อความคำนำ
              (Preface Text)

              <span className="text-red-500">
                {" "}
                *
              </span>
            </label>

            <textarea
              value={
                store.prefaceText
              }
              onChange={(
                event
              ) =>
                store.setCover(
                  "prefaceText",
                  event.target
                    .value
                )
              }
              rows={6}
              placeholder="พิมพ์ข้อความคำนำของคุณที่นี่..."
              className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm leading-relaxed outline-none focus:border-blue-500"
              required
            />

            <span className="mt-1 block text-[10px] text-slate-400">
              💡
              ระบบมีข้อความมาตรฐานให้เริ่มต้น
              และสามารถแก้ไขได้อิสระ
            </span>
          </div>

          {/* AUTHOR */}

          <div className="border-t border-slate-200 pt-4">
            <label className="mb-1 block text-[11px] font-semibold text-slate-500">
              ชื่อผู้จัดทำ
              (ลงท้ายหน้าคำนำ)

              <span className="text-red-500">
                {" "}
                *
              </span>
            </label>

            <input
              type="text"
              value={
                store.authorName
              }
              onChange={(
                event
              ) =>
                store.setCover(
                  "authorName",
                  event.target
                    .value
                )
              }
              placeholder="เช่น นายศิวกร เห็มสุข"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
              required
            />
          </div>
        </div>
      </div>

      {/* ERROR */}

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold leading-5 text-red-600">
          {errorMessage}
        </div>
      )}

      {/* SUCCESS */}

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
        <FaCheck />

        {isSaving
          ? "กำลังบันทึก..."
          : "บันทึกข้อมูลคำนำ"}
      </button>
    </form>
  );
}