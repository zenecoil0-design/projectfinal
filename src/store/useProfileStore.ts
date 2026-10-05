import { create } from "zustand";

export interface SocialMedia {
  id: string;
  platform: string;
  link: string;
}

export interface CustomField {
  id: string;
  title: string;
  value: string;
}

interface ProfileState {
  profileImage: string;

  firstName: string;
  lastName: string;
  nickname: string;

  birthday: string;

  nationality: string;
  ethnicity: string;
  religion: string;

  phone: string;
  email: string;
  address: string;

  socials: SocialMedia[];

  school: string;
  plan: string;
  gpax: string;

  skills: string;
  motto: string;

  customFields: CustomField[];

  setProfile: (
    field:
      | "profileImage"
      | "firstName"
      | "lastName"
      | "nickname"
      | "birthday"
      | "nationality"
      | "ethnicity"
      | "religion"
      | "phone"
      | "email"
      | "address"
      | "school"
      | "plan"
      | "gpax"
      | "skills"
      | "motto",
    value: string
  ) => void;

  setSocials: (
    socials: SocialMedia[]
  ) => void;

  setCustomFields: (
    customFields: CustomField[]
  ) => void;

  resetProfile: () => void;

  addSocial: () => void;

  updateSocial: (
    id: string,
    field: "platform" | "link",
    value: string
  ) => void;

  removeSocial: (
    id: string
  ) => void;

  addCustomField: () => void;

  updateCustomField: (
    id: string,
    field: "title" | "value",
    value: string
  ) => void;

  removeCustomField: (
    id: string
  ) => void;
}

const createDefaultSocials =
  (): SocialMedia[] => [
    {
      id: crypto.randomUUID(),
      platform: "facebook",
      link: "",
    },
  ];

export const useProfileStore =
  create<ProfileState>((set) => ({
    profileImage: "",

    firstName: "",
    lastName: "",
    nickname: "",

    birthday: "",

    nationality: "",
    ethnicity: "",
    religion: "",

    phone: "",
    email: "",
    address: "",

    socials:
      createDefaultSocials(),

    school: "",
    plan: "",
    gpax: "",

    skills: "",
    motto: "",

    customFields: [],

    setProfile: (
      field,
      value
    ) =>
      set({
        [field]: value,
      }),

    setSocials: (
      socials
    ) =>
      set({
        socials,
      }),

    setCustomFields: (
      customFields
    ) =>
      set({
        customFields,
      }),

    resetProfile: () =>
      set({
        profileImage: "",

        firstName: "",
        lastName: "",
        nickname: "",

        birthday: "",

        nationality: "",
        ethnicity: "",
        religion: "",

        phone: "",
        email: "",
        address: "",

        socials:
          createDefaultSocials(),

        school: "",
        plan: "",
        gpax: "",

        skills: "",
        motto: "",

        customFields: [],
      }),

    addSocial: () =>
      set((state) => ({
        socials: [
          ...state.socials,
          {
            id: crypto.randomUUID(),
            platform: "line",
            link: "",
          },
        ],
      })),

    updateSocial: (
      id,
      field,
      value
    ) =>
      set((state) => ({
        socials:
          state.socials.map(
            (social) =>
              social.id === id
                ? {
                    ...social,
                    [field]: value,
                  }
                : social
          ),
      })),

    removeSocial: (
      id
    ) =>
      set((state) => ({
        socials:
          state.socials.filter(
            (social) =>
              social.id !== id
          ),
      })),

    addCustomField: () =>
      set((state) => ({
        customFields: [
          ...state.customFields,
          {
            id: crypto.randomUUID(),
            title: "",
            value: "",
          },
        ],
      })),

    updateCustomField: (
      id,
      field,
      value
    ) =>
      set((state) => ({
        customFields:
          state.customFields.map(
            (
              customField
            ) =>
              customField.id ===
              id
                ? {
                    ...customField,
                    [field]: value,
                  }
                : customField
          ),
      })),

    removeCustomField: (
      id
    ) =>
      set((state) => ({
        customFields:
          state.customFields.filter(
            (
              customField
            ) =>
              customField.id !== id
          ),
      })),
  }));