// src/store/useActivityStore.ts
import { create } from 'zustand';

// โครงสร้างข้อมูลของแต่ละกิจกรรม
export interface ActivityItem {
  id: string;
  title: string;       // ชื่อกิจกรรม
  description: string; // รายละเอียดกิจกรรม
  images: string[];    // รูปภาพประกอบกิจกรรม (รองรับหลายรูปตาม Layout)
}

interface ActivityState {
  activities: ActivityItem[];
  
  // ฟังก์ชันจัดการกิจกรรม
  addActivity: () => void;
  updateActivity: (id: string, field: keyof ActivityItem, value: any) => void;
  removeActivity: (id: string) => void;
  addImageToActivity: (activityId: string, imageUrl: string) => void;
  removeImageFromActivity: (activityId: string, imageIndex: number) => void;
}

export const useActivityStore = create<ActivityState>((set) => ({
  // ค่าเริ่มต้น ให้มีกิจกรรมตัวอย่างสัก 1 รายการ
  activities: [
    {
      id: '1',
      title: '',
      description: '',
      images: [],
    }
  ],

  addActivity: () => set((state) => ({
    activities: [
      ...state.activities,
      { id: Date.now().toString(), title: '', description: '', images: [] }
    ]
  })),

  updateActivity: (id, field, value) => set((state) => ({
    activities: state.activities.map((act) => act.id === id ? { ...act, [field]: value } : act)
  })),

  removeActivity: (id) => set((state) => ({
    activities: state.activities.filter((act) => act.id !== id)
  })),

  addImageToActivity: (activityId, imageUrl) => set((state) => ({
    activities: state.activities.map((act) => 
      act.id === activityId ? { ...act, images: [...act.images, imageUrl] } : act
    )
  })),

  removeImageFromActivity: (activityId, imageIndex) => set((state) => ({
    activities: state.activities.map((act) => 
      act.id === activityId 
        ? { ...act, images: act.images.filter((_, idx) => idx !== imageIndex) } 
        : act
    )
  })),
}));