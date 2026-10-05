// src/store/useCoverStore.ts
import { create } from 'zustand';

interface CoverState {
  portfolioTitle: string; // หัวข้อหลัก เช่น PORTFOLIO
  coverImage: string;     // รูปหน้าปก
  schoolName: string;     // ชื่อโรงเรียน
  prefaceText: string;    // ข้อความคำนำ
  authorName: string;

  setCover: (field: string, value: string) => void;
}

export const useCoverStore = create<CoverState>((set) => ({
  portfolioTitle: 'PORTFOLIO',
  coverImage: '',
  schoolName: '',
  prefaceText: 'แฟ้มสะสมผลงาน (Portfolio) เล่มนี้ จัดทำขึ้นเพื่อเป็นตัวแทนในการนำเสนอข้อมูลของข้าพเจ้า ซึ่งเกี่ยวกับประวัติส่วนตัว ประวัติการศึกษา ผลงาน และกิจกรรมต่างๆ ที่สะท้อนถึงความรู้ความสามารถและความตั้งใจ ข้าพเจ้าหวังว่าแฟ้มสะสมผลงานเล่มนี้จะทำให้ทุกท่านได้เห็นถึงศักยภาพและความพร้อมในการศึกษาต่อ',
  authorName:'',
  setCover: (field, value) => set((state) => ({ ...state, [field]: value })),
}));