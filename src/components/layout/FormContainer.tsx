"use client";

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
  return (
    <div className="box-border w-full min-w-0 bg-white p-4 pb-10">
      <h1 className="sticky top-0 z-20 mb-4 w-full border-b border-slate-200 bg-white py-3 text-base font-bold text-slate-800">
        {currentStep === 1 && "กรอกข้อมูลหน้าปก"}
        {currentStep === 2 && "กรอกข้อมูลคำนำ"}
        {currentStep === 3 && "กรอกประวัติส่วนตัว"}
        {currentStep === 4 && "กรอกประวัติการศึกษา"}
        {currentStep === 5 && "กรอกผลงานและกิจกรรม"}
        {currentStep === 6 && "กรอกข้อมูลเกียรติบัตร"}
      </h1>

      <div className="box-border w-full min-w-0">
        {currentStep === 1 && <CoverForm onNext={onNext} />}
        {currentStep === 2 && <PrefaceForm onNext={onNext} />}
        {currentStep === 3 && <ProfileForm onNext={onNext} />}
        {currentStep === 4 && <EducationForm onNext={onNext} />}
        {currentStep === 5 && <ActivityForm onNext={onNext} />}
        {currentStep === 6 && <CertificateForm onNext={onNext} />}
      </div>
    </div>
  );
}
