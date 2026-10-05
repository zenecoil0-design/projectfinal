import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  activityDate: string;
  organization: string;
  images: string[];
}

interface ActivityState {
  activities: ActivityItem[];

  setActivities: (
    activities: ActivityItem[]
  ) => void;

  addActivity: () => void;

  updateActivity: (
    id: string,
    field: keyof ActivityItem,
    value: string | string[]
  ) => void;

  removeActivity: (
    id: string
  ) => void;

  addImageToActivity: (
    activityId: string,
    imageUrl: string
  ) => void;

  removeImageFromActivity: (
    activityId: string,
    imageIndex: number
  ) => void;

  clearActivities: () => void;
}

export const useActivityStore =
  create<ActivityState>()(
    persist(
      (set) => ({
        activities: [],

        setActivities: (
          activities
        ) =>
          set({
            activities,
          }),

        addActivity: () =>
          set((state) => ({
            activities: [
              ...state.activities,
              {
                id: crypto.randomUUID(),
                title: "",
                description: "",
                activityDate: "",
                organization: "",
                images: [],
              },
            ],
          })),

        updateActivity: (
          id,
          field,
          value
        ) =>
          set((state) => ({
            activities:
              state.activities.map(
                (activity) =>
                  activity.id === id
                    ? {
                        ...activity,
                        [field]: value,
                      }
                    : activity
              ),
          })),

        removeActivity: (
          id
        ) =>
          set((state) => ({
            activities:
              state.activities.filter(
                (activity) =>
                  activity.id !== id
              ),
          })),

        addImageToActivity: (
          activityId,
          imageUrl
        ) =>
          set((state) => ({
            activities:
              state.activities.map(
                (activity) =>
                  activity.id ===
                  activityId
                    ? {
                        ...activity,
                        images: [
                          ...activity.images,
                          imageUrl,
                        ],
                      }
                    : activity
              ),
          })),

        removeImageFromActivity: (
          activityId,
          imageIndex
        ) =>
          set((state) => ({
            activities:
              state.activities.map(
                (activity) =>
                  activity.id ===
                  activityId
                    ? {
                        ...activity,
                        images:
                          activity.images.filter(
                            (
                              _,
                              index
                            ) =>
                              index !==
                              imageIndex
                          ),
                      }
                    : activity
              ),
          })),

        clearActivities: () =>
          set({
            activities: [],
          }),
      }),
      {
        name:
          "portfolio-activity-storage",
      }
    )
  );