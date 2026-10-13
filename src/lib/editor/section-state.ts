import { useCoverStore } from "@/store/useCoverStore";
import { useProfileStore } from "@/store/useProfileStore";
import { useEducationStore } from "@/store/useEducationStore";
import { useActivityStore } from "@/store/useActivityStore";
import { useCertificateStore } from "@/store/useCertificateStore";

export const sections = ["cover", "preface", "profile", "education", "activity", "certificate"] as const;
export type Section = typeof sections[number];
export const sectionNames: Record<Section, string> = {
  cover: "หน้าปก", preface: "คำนำ", profile: "ประวัติส่วนตัว",
  education: "การศึกษา", activity: "กิจกรรม", certificate: "เกียรติบัตร",
};
export const editorStores = [useCoverStore, useProfileStore, useEducationStore, useActivityStore, useCertificateStore];

export function sectionSnapshot(section: Section): string {
  const cover = useCoverStore.getState();
  switch (section) {
    case "cover": return JSON.stringify([cover.portfolioTitle, cover.schoolName, cover.coverImage]);
    case "preface": return JSON.stringify([cover.prefaceText, cover.authorName]);
    case "profile": return JSON.stringify(useProfileStore.getState());
    case "education": return JSON.stringify(useEducationStore.getState().educations);
    case "activity": return JSON.stringify(useActivityStore.getState().activities);
    case "certificate": return JSON.stringify(useCertificateStore.getState().certificates);
  }
}

export function resetEditorStores() {
  useCoverStore.setState(useCoverStore.getInitialState(), true);
  useProfileStore.getState().resetProfile();
  useEducationStore.getState().clearEducations();
  useActivityStore.getState().clearActivities();
  useCertificateStore.getState().clearCertificates();
}
