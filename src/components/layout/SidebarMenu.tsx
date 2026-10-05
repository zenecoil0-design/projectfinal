"use client";

type SidebarMenuProps = {
  currentStep: number;
  setCurrentStep: (step: number) => void;
};

export default function SidebarMenu({
  currentStep,
  setCurrentStep,
}: SidebarMenuProps) {
  const steps = [
    { id: 1, name: "หน้าปก" },
    { id: 2, name: "คำนำ" },
    { id: 3, name: "ข้อมูลส่วนตัว" },
    { id: 4, name: "ประวัติการศึกษา" },
    { id: 5, name: "ผลงานและกิจกรรม" },
    { id: 6, name: "เกียรติบัตร" },
  ];

  return (
    <div className="box-border w-full border-b border-slate-200 bg-slate-50 p-3">
      <div className="flex w-full flex-col gap-1.5">
        {steps.map((step) => {
          const active = currentStep === step.id;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => setCurrentStep(step.id)}
              className={`
                box-border
                block
                w-full
                rounded-md
                px-3
                py-2
                text-left
                text-[11px]
                font-bold
                transition-all
                ${
                  active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                }
              `}
            >
              {step.id}. {step.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}