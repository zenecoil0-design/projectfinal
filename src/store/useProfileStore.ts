// src/store/useProfileStore.ts
import { create } from 'zustand';

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

  setProfile: (field: string, value: string) => void;
  addSocial: () => void;
  updateSocial: (id: string, field: 'platform' | 'link', value: string) => void;
  removeSocial: (id: string) => void;
  addCustomField: () => void;
  updateCustomField: (id: string, field: 'title' | 'value', value: string) => void;
  removeCustomField: (id: string) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profileImage: '', firstName: '', lastName: '', nickname: '',
  birthday: '', nationality: '', ethnicity: '', religion: '',
  phone: '', email: '', address: '',
  socials: [{ id: '1', platform: 'facebook', link: '' }],
  school: '', plan: '', gpax: '',
  skills: '', motto: '', customFields: [], 

  setProfile: (field, value) => set((state) => ({ ...state, [field]: value })),
  
  addSocial: () => set((state) => ({
    socials: [...state.socials, { id: Date.now().toString(), platform: 'line', link: '' }]
  })),
  updateSocial: (id, field, value) => set((state) => ({
    socials: state.socials.map((s) => s.id === id ? { ...s, [field]: value } : s)
  })),
  removeSocial: (id) => set((state) => ({
    socials: state.socials.filter((s) => s.id !== id)
  })),

  addCustomField: () => set((state) => ({
    customFields: [...state.customFields, { id: Date.now().toString(), title: '', value: '' }]
  })),
  updateCustomField: (id, field, value) => set((state) => ({
    customFields: state.customFields.map((cf) => cf.id === id ? { ...cf, [field]: value } : cf)
  })),
  removeCustomField: (id) => set((state) => ({
    customFields: state.customFields.filter((cf) => cf.id !== id)
  })),
}));