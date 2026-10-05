import { create } from "zustand";

export interface EducationItem {
  id: string;
  level: string;
  schoolName: string;
  studyPlan: string;
  gpa: string;
  logoUrl: string;
  startYear: string;
  endYear: string;
}

interface EducationState {
  educations: EducationItem[];

  setEducations: (
    educations: EducationItem[]
  ) => void;

  addEducation: () => void;

  updateEducation: (
    id: string,
    field: keyof EducationItem,
    value: string
  ) => void;

  removeEducation: (
    id: string
  ) => void;

  clearEducations: () => void;
}

export const useEducationStore =
  create<EducationState>((set) => ({
    educations: [],

    setEducations: (
      educations
    ) =>
      set({
        educations,
      }),

    addEducation: () =>
      set((state) => ({
        educations: [
          ...state.educations,
          {
            id: crypto.randomUUID(),
            level: "",
            schoolName: "",
            studyPlan: "",
            gpa: "",
            logoUrl: "",
            startYear: "",
            endYear: "",
          },
        ],
      })),

    updateEducation: (
      id,
      field,
      value
    ) =>
      set((state) => ({
        educations:
          state.educations.map(
            (education) =>
              education.id === id
                ? {
                    ...education,
                    [field]: value,
                  }
                : education
          ),
      })),

    removeEducation: (
      id
    ) =>
      set((state) => ({
        educations:
          state.educations.filter(
            (education) =>
              education.id !== id
          ),
      })),

    clearEducations: () =>
      set({
        educations: [],
      }),
  }));