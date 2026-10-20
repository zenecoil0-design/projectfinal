"use client";

import { Fragment, useLayoutEffect, useRef } from "react";
import { VisibilityControl } from "@/components/editor/SectionVisibility";
import { FaChevronDown } from "react-icons/fa";
import { useEditorSession } from "@/components/editor/EditorSession";
import { type Section } from "@/lib/editor/section-state";
import CoverForm from "@/components/forms/CoverForm";
import PrefaceForm from "@/components/forms/PrefaceForm";
import ProfileForm from "@/components/forms/ProfileForm";
import EducationForm from "@/components/forms/EducationForm";
import ActivityForm from "@/components/forms/ActivityForm";
import CertificateForm from "@/components/forms/CertificateForm";

const steps: { section: Section; title: string; heading: string; Form: typeof CoverForm }[] = [
  { section: "cover", title: "หน้าปก", heading: "กรอกข้อมูลหน้าปก", Form: CoverForm },
  { section: "preface", title: "คำนำ", heading: "กรอกข้อมูลคำนำ", Form: PrefaceForm },
  { section: "profile", title: "ประวัติส่วนตัว", heading: "กรอกประวัติส่วนตัว", Form: ProfileForm },
  { section: "education", title: "การศึกษา", heading: "กรอกประวัติการศึกษา", Form: EducationForm },
  { section: "activity", title: "ผลงานและกิจกรรม", heading: "กรอกผลงานและกิจกรรม", Form: ActivityForm },
  { section: "certificate", title: "เกียรติบัตร", heading: "กรอกข้อมูลเกียรติบัตร", Form: CertificateForm },
];

type Props = {
  currentStep: number | null;
  visible: boolean;
  onStepChange: (step: number | null) => void;
  onNext: (fromStep: number) => void;
};

export default function FormContainer({ currentStep, visible, onStepChange, onNext }: Props) {
  const { status, tagStatus, dirty } = useEditorSession();
  const scroller = useRef<HTMLDivElement>(null);
  const navigation = useRef({ step: currentStep, revision: 0 });
  const submissions = useRef(new Map<number, number>());

  useLayoutEffect(() => {
    navigation.current = { step: currentStep, revision: navigation.current.revision + 1 };
    const container = scroller.current;
    if (!container || !visible || currentStep === null) return;
    const header = container.querySelector<HTMLButtonElement>("#editor-heading-" + steps[currentStep - 1].section);
    if (!header) return;
    // A successful save may fold the focused submit button. Keep keyboard focus visible.
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && container.contains(focused) && focused.closest<HTMLElement>("[data-editor-panel]")?.hidden) {
      header.focus({ preventScroll: true });
    }
    const frame = container.getBoundingClientRect();
    const target = header.getBoundingClientRect();
    if (frame.height && (target.top < frame.top || target.bottom > frame.bottom)) {
      container.scrollTop += target.top - frame.top - 8;
    }
  }, [currentStep, visible]);

  return <div ref={scroller} aria-label="แบบฟอร์มพอร์ต" className="box-border h-full w-full min-w-0 overflow-x-hidden overflow-y-auto bg-white p-3 sm:p-4">
    <div className="min-w-0 space-y-3">
      {steps.map(({ section, title, heading, Form }, index) => {
        const step = index + 1;
        const open = currentStep === step;
        const metadata = section === "education" || section === "activity" || section === "certificate" ? tagStatus[section] : "ready";
        const message = status[section] === "loading" ? "กำลังโหลด" : status[section] === "error" ? "โหลดไม่สำเร็จ" : metadata === "error" ? "Tags โหลดไม่ครบ" : metadata === "loading" ? "กำลังโหลด Tags" : dirty.includes(section) ? "ยังไม่บันทึก" : "พร้อมแก้ไข";
        return <Fragment key={section}><section className="min-w-0 rounded-xl border border-slate-200 bg-white">
          <h2>
            <button type="button" id={"editor-heading-" + section} aria-expanded={open} aria-controls={"editor-panel-" + section}
              onClick={() => onStepChange(open ? null : step)}
              className={"flex min-h-14 w-full min-w-0 items-center gap-3 rounded-xl px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 " + (open ? "bg-blue-50 text-blue-800" : "text-slate-800 hover:bg-slate-50")}>
              <span className="min-w-0 flex-1 wrap-anywhere">
                <span className="block text-sm font-bold leading-6">{step}. {title}</span>
                <span className={"mt-0.5 block text-xs font-medium leading-5 " + ((status[section] === "error" || metadata === "error") ? "text-red-700" : dirty.includes(section) ? "text-amber-700" : "text-slate-500")}>{message}</span>
              </span>
              <FaChevronDown aria-hidden="true" className={"shrink-0 " + (open ? "rotate-180" : "")} />
            </button>
          </h2>
          {/* Mount once per editor session: hiding never reloads, saves or clears a form. */}
          <div id={"editor-panel-" + section} role="region" aria-labelledby={"editor-heading-" + section} data-editor-panel={section} hidden={!open} inert={!open}
            onSubmitCapture={() => submissions.current.set(step, navigation.current.revision)} className="min-w-0 px-3 pb-1 pt-4 sm:px-4">
            {section !== "cover" && <VisibilityControl section={section} />}
            <h3 className="mb-4 border-b border-slate-200 pb-2 text-base font-bold text-slate-800">{heading}</h3>
            <Form active={open && visible} onNext={() => {
              if (navigation.current.step === step && submissions.current.get(step) === navigation.current.revision) onNext(step);
            }} />
          </div>
        </section>{section === "preface" && <section aria-label="การแสดงสารบัญ" className="min-w-0 rounded-xl border border-slate-200 p-3">
          <h2 className="mb-2 text-sm font-bold text-slate-800">สารบัญอัตโนมัติ</h2><VisibilityControl section="toc" />
        </section>}</Fragment>;
      })}
    </div>
  </div>;
}
