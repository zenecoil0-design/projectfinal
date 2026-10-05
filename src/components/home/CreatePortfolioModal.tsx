"use client";

import { FaTimes, FaArrowRight } from "react-icons/fa";
import { portfolioTemplates } from "./homeData";

type CreatePortfolioModalProps = {
  isOpen: boolean;
  portfolioName: string;
  selectedTemplate: string | null;

  onClose: () => void;
  onPortfolioNameChange: (value: string) => void;
  onSelectTemplate: (templateId: string) => void;
  onCreate: () => void;
};

export default function CreatePortfolioModal({
  isOpen,
  portfolioName,
  selectedTemplate,
  onClose,
  onPortfolioNameChange,
  onSelectTemplate,
  onCreate,
}: CreatePortfolioModalProps) {
  if (!isOpen) return null;

  const canCreate =
    portfolioName.trim().length > 0 &&
    selectedTemplate !== null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm md:p-8"
      onClick={onClose}
    >
      <div
        className="relative max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-[30px] bg-white shadow-[0_40px_100px_rgba(0,0,0,0.25)]"
        onClick={(event) => event.stopPropagation()}
      >
        {/* close */}
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิด"
          className="absolute right-5 top-5 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-md transition-all hover:bg-slate-100 hover:text-slate-900"
        >
          <FaTimes />
        </button>

        <div className="grid min-h-[650px] grid-cols-1 lg:grid-cols-[0.85fr_1.4fr]">
          {/* LEFT */}
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-900 px-7 py-10 text-white md:px-10">
            <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />

            <div className="relative">
              <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-200">
                สร้าง Portfolio ใหม่
              </span>

              <h2 className="mt-6 text-3xl font-black leading-tight md:text-4xl">
                เริ่มจากเทมเพลต
                <br />
                แล้วสร้างในแบบของคุณ
              </h2>

              <p className="mt-5 text-sm leading-7 text-slate-300">
                ตั้งชื่อผลงาน เลือกดีไซน์ที่ต้องการ
                จากนั้นระบบจะพาไปยัง Editor
                สำหรับกรอกข้อมูลและจัดหน้า Portfolio
              </p>

              <div className="mt-10 space-y-3">
                {[
                  ["01", "ตั้งชื่อ Portfolio"],
                  ["02", "เลือก Template"],
                  ["03", "เข้าสู่หน้า Editor"],
                ].map(([number, label]) => (
                  <div
                    key={number}
                    className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.08] p-4 backdrop-blur"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xs font-black">
                      {number}
                    </div>

                    <div className="text-sm font-bold text-slate-100">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="px-6 py-9 md:px-10 md:py-10">
            {/* name */}
            <div>
              <label className="mb-2 block text-sm font-extrabold text-slate-800">
                ชื่อพอร์ตโฟลิโอ
              </label>

              <input
                autoFocus
                type="text"
                value={portfolioName}
                onChange={(event) =>
                  onPortfolioNameChange(event.target.value)
                }
                placeholder="เช่น Portfolio สมัครคณะวิศวกรรมศาสตร์"
                className="h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            {/* template */}
            <div className="mt-8">
              <div className="mb-4">
                <h3 className="text-lg font-black text-slate-900">
                  เลือกเทมเพลต
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  สามารถเปลี่ยนรายละเอียดภายในได้ภายหลัง
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {portfolioTemplates.map((template) => {
                  const isSelected =
                    selectedTemplate === template.id;

                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() =>
                        onSelectTemplate(template.id)
                      }
                      className={`group rounded-[24px] border bg-white p-4 text-left transition-all duration-200 ${
                        isSelected
                          ? "scale-[1.02] border-blue-500 shadow-lg ring-4 ring-blue-100"
                          : "border-slate-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg"
                      }`}
                    >
                      {/* Template thumbnail */}
                      <div
                        className={`h-36 rounded-[18px] bg-gradient-to-br ${template.gradient} p-3`}
                      >
                        <div className="flex h-full flex-col justify-between rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm">
                          <div>
                            <div className="h-2.5 w-20 rounded-full bg-white/90" />

                            <div className="mt-2 h-2 w-14 rounded-full bg-white/50" />
                          </div>

                          <div className="space-y-2">
                            <div className="h-2 rounded-full bg-white/80" />

                            <div className="h-2 w-4/5 rounded-full bg-white/50" />

                            <div className="flex gap-2 pt-1">
                              <div className="h-7 flex-1 rounded-lg bg-white/20" />

                              <div className="h-7 flex-1 rounded-lg bg-white/20" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-black text-slate-900">
                            {template.name}
                          </h4>

                          {isSelected && (
                            <span className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-[9px] font-black text-blue-600">
                              เลือกแล้ว
                            </span>
                          )}
                        </div>

                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          {template.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* footer */}
            <div className="mt-9 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
              >
                ยกเลิก
              </button>

              <button
                type="button"
                onClick={onCreate}
                disabled={!canCreate}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold text-white transition-all ${
                  canCreate
                    ? "bg-slate-900 shadow-lg hover:bg-blue-600"
                    : "cursor-not-allowed bg-slate-300"
                }`}
              >
                เริ่มสร้างผลงาน

                <FaArrowRight className="text-xs" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}