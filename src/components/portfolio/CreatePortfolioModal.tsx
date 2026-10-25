"use client";
import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { confirmedCreatedId, createAccountChanged, createAuthError, createResultError } from "@/lib/portfolio-create";

import {
  ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import {
  FaTimes,
  FaFileAlt,
  FaCheck,
  FaArrowRight,
} from "react-icons/fa";

import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type TemplateKey =
  | "classic"
  | "modern"
  | "minimal";

interface CreatePortfolioModalProps {
  children: ReactNode;
}

const templates: {
  key: TemplateKey;
  name: string;
  description: string;
}[] = [
  {
    key: "classic",
    name: "Classic",
    description:
      "เรียบง่าย เป็นทางการ เหมาะกับ Portfolio ทั่วไป",
  },
  {
    key: "modern",
    name: "Modern University",
    description:
      "โทนฟ้า–น้ำเงิน–ขาว ภาพใหญ่และจัดวางข้อมูลทันสมัยสำหรับสมัครมหาวิทยาลัย",
  },
  {
    key: "minimal",
    name: "Minimal",
    description:
      "สะอาด โล่ง อ่านง่าย เน้นเนื้อหาเป็นหลัก",
  },
];

export default function CreatePortfolioModal({
  children,
}: CreatePortfolioModalProps) {
  const router = useRouter();
  const nameId = useId();
  const lifecycle = useRef<{ alive: boolean; version: number; owner: string | null | undefined; busy: boolean }>({ alive: false, version: 0, owner: undefined, busy: false });

  const [isOpen, setIsOpen] =
    useState(false);

  const [title, setTitle] =
    useState("");

  const [
    selectedTemplate,
    setSelectedTemplate,
  ] =
    useState<TemplateKey>("modern");

  const [
    isCreating,
    setIsCreating,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const discardAccountDraft = useCallback(() => {
    ++lifecycle.current.version; lifecycle.current.busy = false;
    setIsCreating(false); setIsOpen(false); setTitle(""); setSelectedTemplate("modern"); setErrorMessage("");
  }, []);

  useEffect(() => {
    const state = lifecycle.current;
    state.alive = true;
    const { data: { subscription } } = createClient().auth.onAuthStateChange((event, session) => {
      const next = session?.user.id ?? null, previous = state.owner;
      state.owner = next;
      if (createAccountChanged(previous, next, event)) discardAccountDraft();
    });
    return () => { state.alive = false; ++state.version; state.busy = false; state.owner = undefined; subscription.unsubscribe(); };
  }, [discardAccountDraft]);

  const openModal = () => {
    if (lifecycle.current.busy) return;
    ++lifecycle.current.version;
    setErrorMessage("");
    setIsOpen(true);
  };

  const closeModal = () => {
    if (lifecycle.current.busy) return;
    ++lifecycle.current.version;

    setIsOpen(false);
  };

  const handleCreatePortfolio =
    async () => {
      if (!lifecycle.current.alive || lifecycle.current.busy) return;
      const cleanTitle =
        title.trim();

      if (!cleanTitle) {
        setErrorMessage(
          "กรุณาตั้งชื่อ Portfolio"
        );

        return;
      }

      const version = lifecycle.current.version, expectedOwner = lifecycle.current.owner;
      const current = () => lifecycle.current.alive && lifecycle.current.version === version;
      const submitted = { title: cleanTitle, template_key: selectedTemplate };
      lifecycle.current.busy = true;
      let stage: "auth" | "insert" = "auth";
      setErrorMessage("");
      setIsCreating(true);

      try {
        if (expectedOwner === undefined) throw new Error("Session initialization incomplete");
        const supabase =
          createClient();

        const {
          data: { user },
          error: userError,
        } =
          await supabase.auth.getUser();

        if (!current()) return;
        if (userError && !isAuthSessionMissingError(userError)) throw userError;
        if (!user) {
          setIsOpen(false);
          router.push(
            "/login?next=/"
          );

          return;
        }
        if (user.id !== expectedOwner) {
          lifecycle.current.owner = user.id;
          discardAccountDraft();
          return;
        }
        const payload = { user_id: user.id, ...submitted };
        stage = "insert";

        const {
          data: portfolio,
          error,
        } = await supabase
          .from("portfolios")
          .insert(payload)
          .select("id, user_id, title, template_key")
          .single();

        if (!current()) return;
        if (error) {
          throw error;
        }

        const id = confirmedCreatedId(portfolio, payload);
        if (!id) {
          throw new Error(
            "ไม่พบ Portfolio ID"
          );
        }

        setIsOpen(false);

        router.push(
          `/editor?portfolio=${encodeURIComponent(id)}`
        );
      } catch {
        if (current()) setErrorMessage(stage === "auth" ? createAuthError : createResultError);
      } finally {
        if (current()) { lifecycle.current.busy = false; setIsCreating(false); }
      }
    };

  return (
    <>
      {/* Trigger */}
      <div
        onClick={openModal}
        className="contents"
      >
        {children}
      </div>

      {/* Modal */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${nameId}-heading`}
          onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); closeModal(); } }}
          className="
            fixed
            inset-0
            z-[100]
            flex
            items-center
            justify-center
            overflow-hidden
            bg-slate-950/60
            p-4
            backdrop-blur-sm
          "
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <div
            className="
              flex
              h-[calc(100dvh-32px)]
              w-full
              max-w-3xl
              flex-col
              overflow-hidden
              rounded-[24px]
              bg-white
              shadow-2xl
              sm:h-auto
              sm:max-h-[min(760px,calc(100dvh-40px))]
            "
          >
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 id={`${nameId}-heading`} className="text-xl font-black text-slate-900 md:text-2xl">
                  สร้าง Portfolio ใหม่
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  ตั้งชื่อและเลือกรูปแบบ
                  Portfolio
                  ก่อนเริ่มสร้าง
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                aria-label="ปิดกล่องสร้างพอร์ต"
                disabled={isCreating}
                className="
                  flex
                  h-11
                  w-11
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  text-slate-400
                  transition-all
                  hover:bg-slate-100
                  hover:text-slate-700
                  focus-visible:outline-2
                  focus-visible:outline-offset-2
                  focus-visible:outline-blue-600
                  disabled:opacity-50
                "
              >
                <FaTimes />
              </button>
            </div>

            {/* Body */}
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              {/* Portfolio name */}
              <div>
                <label htmlFor={nameId} className="mb-2 block text-sm font-bold text-slate-700">
                  ชื่อ Portfolio
                </label>

                <input
                  type="text"
                  id={nameId}
                  disabled={isCreating}
                  aria-invalid={!!errorMessage}
                  aria-describedby={errorMessage ? `${nameId}-error` : undefined}
                  value={title}
                  onChange={(event) =>
                    !lifecycle.current.busy && setTitle(
                      event.target
                        .value
                    )
                  }
                  placeholder="เช่น Portfolio สมัครมหาวิทยาลัย"
                  maxLength={100}
                  autoFocus
                  className="
                    h-13
                    w-full
                    rounded-2xl
                    border
                    border-slate-300
                    bg-white
                    px-4
                    py-3.5
                    text-base
                    sm:text-sm
                    text-slate-800
                    outline-none
                    transition-all
                    placeholder:text-slate-400
                    focus:border-blue-500
                    focus:ring-4
                    focus:ring-blue-100
                  "
                />
              </div>

              {/* Templates */}
              <div className="mt-6">
                <div className="mb-3">
                  <h3 className="text-sm font-bold text-slate-700">
                    เลือก Template
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    เปลี่ยนเทมเพลตภายหลังได้ใน Editor
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {templates.map(
                    (template) => {
                      const isSelected =
                        selectedTemplate ===
                        template.key;

                      return (
                        <button
                          key={
                            template.key
                          }
                          type="button"
                          disabled={isCreating}
                          aria-pressed={isSelected}
                          onClick={() =>
                            !lifecycle.current.busy && setSelectedTemplate(
                              template.key
                            )
                          }
                          className={`
                            relative
                            overflow-hidden
                            rounded-[20px]
                            border-2
                            p-3
                            text-left
                            transition-all
                            ${
                              isSelected
                                ? "border-blue-500 bg-blue-50 shadow-md shadow-blue-100"
                                : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                            }
                          `}
                        >
                          {/* Selected */}
                          {isSelected && (
                            <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                              <FaCheck />
                            </div>
                          )}

                          {/* Template Preview */}
                          <div className="aspect-[210/297] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                            {template.key ===
                              "classic" && (
                              <div className="flex h-full flex-col bg-white p-3">
                                <div className="h-[42%] rounded-lg bg-slate-900" />

                                <div className="mt-3 h-3 w-3/4 rounded-full bg-slate-300" />

                                <div className="mt-2 h-2 w-full rounded-full bg-slate-200" />

                                <div className="mt-2 h-2 w-4/5 rounded-full bg-slate-200" />

                                <div className="mt-auto grid grid-cols-2 gap-2">
                                  <div className="h-10 rounded-lg bg-slate-100" />
                                  <div className="h-10 rounded-lg bg-slate-100" />
                                </div>
                              </div>
                            )}

                            {template.key ===
                              "modern" && (
                              <div className="flex h-full flex-col bg-[#f7f5ef] p-3">
                                <div className="h-[45%] rounded-xl bg-[#174c40]" />

                                <div className="mt-3 h-3 w-2/3 rounded-full bg-[#174c40]" />

                                <div className="mt-2 h-2 w-full rounded-full bg-slate-600" />

                                <div className="mt-2 h-2 w-4/5 rounded-full bg-slate-700" />

                                <div className="mt-auto h-12 rounded-xl bg-[#e6e9dc]" />
                              </div>
                            )}

                            {template.key ===
                              "minimal" && (
                              <div className="flex h-full flex-col bg-[#fafafa] p-4">
                                <div className="h-1 w-10 rounded-full bg-slate-900" />

                                <div className="mt-5 h-4 w-2/3 rounded-full bg-slate-800" />

                                <div className="mt-3 h-2 w-full rounded-full bg-slate-200" />

                                <div className="mt-2 h-2 w-3/4 rounded-full bg-slate-200" />

                                <div className="mt-6 h-20 rounded-lg border border-slate-200 bg-white" />

                                <div className="mt-auto h-2 w-1/2 rounded-full bg-slate-300" />
                              </div>
                            )}
                          </div>

                          <div className="mt-3">
                            <div className="flex items-center gap-2">
                              <FaFileAlt
                                className={
                                  isSelected
                                    ? "text-blue-600"
                                    : "text-slate-400"
                                }
                              />

                              <span className="font-black text-slate-900">
                                {
                                  template.name
                                }
                              </span>
                            </div>

                            <p className="mt-2 text-xs leading-5 text-slate-500">
                              {
                                template.description
                              }
                            </p>
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Error */}
              {errorMessage && (
                <div id={`${nameId}-error`} role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                  {errorMessage}
                </div>
              )}
              {isCreating && <p role="status" className="mt-4 text-sm leading-6 text-slate-500">กำลังยืนยันการสร้างพอร์ต กรุณารอสักครู่</p>}
            </div>

            {/* Footer */}
            <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
              <button
                type="button"
                onClick={closeModal}
                disabled={isCreating}
                className="
                  rounded-xl
                  border
                  border-slate-300
                  bg-white
                  px-5
                  py-3
                  text-sm
                  font-bold
                  text-slate-600
                  transition-all
                  hover:bg-slate-50
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                ยกเลิก
              </button>

              <button
                type="button"
                onClick={
                  handleCreatePortfolio
                }
                disabled={isCreating}
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-xl
                  bg-blue-600
                  px-5
                  py-3
                  text-sm
                  font-bold
                  text-white
                  transition-all
                  hover:bg-blue-700
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >
                {isCreating
                  ? "กำลังสร้าง..."
                  : "สร้าง Portfolio"}

                {!isCreating && (
                  <FaArrowRight className="text-xs" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
