"use client";
import { useEffect, useRef } from "react";

import CoverForm from "@/components/forms/CoverForm";
import PrefaceForm from "@/components/forms/PrefaceForm";
import ProfileForm from "@/components/forms/ProfileForm";
import EducationForm from "@/components/forms/EducationForm";
import ActivityForm from "@/components/forms/ActivityForm";
import CertificateForm from "@/components/forms/CertificateForm";

type FormContainerProps = {
  currentStep: number;
  onNext: () => void;
};

export default function FormContainer({
  currentStep,
  onNext,
}: FormContainerProps) {
  const activeStep = useRef(currentStep);
  useEffect(() => { activeStep.current = currentStep; }, [currentStep]);
  return (
    <div
      className="
        box-border
        h-full
        w-full
        max-w-full
        overflow-x-hidden
        overflow-y-auto
        bg-white
        p-4
      "
    >
      <div className="w-full max-w-full">
        <h1 className="mb-4 w-full border-b border-slate-200 pb-2 text-base font-bold text-slate-800">
          {currentStep === 1 && "กรอกข้อมูลหน้าปก"}
          {currentStep === 2 && "กรอกข้อมูลคำนำ"}
          {currentStep === 3 && "กรอกประวัติส่วนตัว"}
          {currentStep === 4 && "กรอกประวัติการศึกษา"}
          {currentStep === 5 && "กรอกผลงานและกิจกรรม"}
          {currentStep === 6 && "กรอกข้อมูลเกียรติบัตร"}
        </h1>

        <div className="box-border w-full max-w-full overflow-hidden">
          <div hidden={currentStep !== 1}>
            <CoverForm onNext={() => { if (activeStep.current === 1) onNext(); }} />
          </div>

          <div hidden={currentStep !== 2}>
            <PrefaceForm onNext={() => { if (activeStep.current === 2) onNext(); }} />
          </div>

          <div hidden={currentStep !== 3}>
            <ProfileForm onNext={() => { if (activeStep.current === 3) onNext(); }} />
          </div>

          <div hidden={currentStep !== 4}>
            <EducationForm onNext={() => { if (activeStep.current === 4) onNext(); }} />
          </div>

          <div hidden={currentStep !== 5}>
            <ActivityForm onNext={() => { if (activeStep.current === 5) onNext(); }} />
          </div>

          <div hidden={currentStep !== 6}>
            <CertificateForm onNext={() => { if (activeStep.current === 6) onNext(); }} />
          </div>
        </div>
      </div>
    </div>
  );
}