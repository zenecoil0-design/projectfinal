import { create } from "zustand";

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  images: string[];
}

type ActivityTextField = "title" | "description";

interface ActivityState {
  activities: ActivityItem[];
  addActivity: () => void;
  updateActivity: (
    id: string,
    field: ActivityTextField,
    value: string
  ) => void;
  removeActivity: (id: string) => void;
  addImageToActivity: (
    activityId: string,
    imageUrl: string
  ) => void;
  removeImageFromActivity: (
    activityId: string,
    imageIndex: number
  ) => void;
}

export const useActivityStore = create<ActivityState>((set) => ({
  activities: [
    {
      id: "1",
      title: "",
      description: "",
      images: [],
    },
  ],

  addActivity: () =>
    set((state) => ({
      activities: [
        ...state.activities,
        {
          id: crypto.randomUUID(),
          title: "",
          description: "",
          images: [],
        },
      ],
    })),

  updateActivity: (id, field, value) =>
    set((state) => ({
      activities: state.activities.map((activity) =>
        activity.id === id
          ? { ...activity, [field]: value }
          : activity
      ),
    })),

  removeActivity: (id) =>
    set((state) => ({
      activities: state.activities.filter(
        (activity) => activity.id !== id
      ),
    })),

  addImageToActivity: (activityId, imageUrl) =>
    set((state) => ({
      activities: state.activities.map((activity) =>
        activity.id === activityId
          ? {
              ...activity,
              images: [...activity.images, imageUrl].slice(0, 4),
            }
          : activity
      ),
    })),

  removeImageFromActivity: (activityId, imageIndex) =>
    set((state) => ({
      activities: state.activities.map((activity) =>
        activity.id === activityId
          ? {
              ...activity,
              images: activity.images.filter(
                (_, index) => index !== imageIndex
              ),
            }
          : activity
      ),
    })),
}));
