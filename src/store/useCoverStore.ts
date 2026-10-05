import { create } from "zustand";

export type CoverField =
  | "portfolioTitle"
  | "coverImage"
  | "schoolName"
  | "prefaceText"
  | "authorName";

interface CoverState {
  portfolioTitle: string;
  coverImage: string;
  schoolName: string;
  prefaceText: string;
  authorName: string;
  setCover: (field: CoverField, value: string) => void;
}

export const useCoverStore = create<CoverState>((set) => ({
  portfolioTitle: "PORTFOLIO",
  coverImage: "",
  schoolName: "",
  prefaceText:
    "แฟ้มสะสมผลงาน (Portfolio) เล่มนี้ จัดทำขึ้นเพื่อเป็นตัวแทนในการนำเสนอข้อมูลของข้าพเจ้า ซึ่งเกี่ยวกับประวัติส่วนตัว ประวัติการศึกษา ผลงาน และกิจกรรมต่างๆ ที่สะท้อนถึงความรู้ความสามารถและความตั้งใจ ข้าพเจ้าหวังว่าแฟ้มสะสมผลงานเล่มนี้จะทำให้ทุกท่านได้เห็นถึงศักยภาพและความพร้อมในการศึกษาต่อ",
  authorName: "",
  setCover: (field, value) =>
    set((state) => ({
      ...state,
      [field]: value,
    })),
}));
