import { create } from "zustand";

export interface EducationItem {
  id: string;
  level: string;
  schoolName: string;
  studyPlan: string;
  gpa: string;
  logoUrl: string;
}

type EducationField = Exclude<keyof EducationItem, "id">;

interface EducationState {
  educations: EducationItem[];
  addEducation: () => void;
  updateEducation: (
    id: string,
    field: EducationField,
    value: string
  ) => void;
  removeEducation: (id: string) => void;
}

const emptyEducation = (): EducationItem => ({
  id: crypto.randomUUID(),
  level: "",
  schoolName: "",
  studyPlan: "",
  gpa: "",
  logoUrl: "",
});

export const useEducationStore = create<EducationState>((set) => ({
  educations: [
    {
      id: "1",
      level: "มัธยมศึกษาตอนปลาย",
      schoolName: "",
      studyPlan: "",
      gpa: "",
      logoUrl: "",
    },
  ],

  addEducation: () =>
    set((state) => ({
      educations: [...state.educations, emptyEducation()],
    })),

  updateEducation: (id, field, value) =>
    set((state) => ({
      educations: state.educations.map((education) =>
        education.id === id
          ? { ...education, [field]: value }
          : education
      ),
    })),

  removeEducation: (id) =>
    set((state) => ({
      educations: state.educations.filter(
        (education) => education.id !== id
      ),
    })),
}));
