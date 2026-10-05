// src/store/useEducationStore.ts
import { create } from 'zustand';

export interface EducationItem {
  id: string;
  level: string;      // ระดับการศึกษา 
  schoolName: string; // ชื่อโรงเรียน
  studyPlan: string;  // แผนการเรียน
  gpa: string;        // เกรดเฉลี่ย
  logoUrl: string;    // โลโก้โรงเรียน
}

interface EducationState {
  educations: EducationItem[];
  addEducation: () => void;
  updateEducation: (id: string, field: keyof EducationItem, value: string) => void;
  removeEducation: (id: string) => void;
}

export const useEducationStore = create<EducationState>((set) => ({
  educations: [
    { 
      id: '1', 
      level: 'มัธยมศึกษาตอนปลาย', 
      schoolName: '', 
      studyPlan: '', 
      gpa: '', 
      logoUrl: '' 
    }
  ],
  addEducation: () => set((state) => ({
    educations: [
      ...state.educations, 
      { id: Date.now().toString(), level: 'มัธยมศึกษาตอนต้น', schoolName: '', studyPlan: '', gpa: '', logoUrl: '' }
    ]
  })),
  updateEducation: (id, field, value) => set((state) => ({
    educations: state.educations.map((edu) => edu.id === id ? { ...edu, [field]: value } : edu)
  })),
  removeEducation: (id) => set((state) => ({
    educations: state.educations.filter((edu) => edu.id !== id)
  })),
}));