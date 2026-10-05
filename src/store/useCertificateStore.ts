// src/store/useCertificateStore.ts
import { create } from 'zustand';

export interface CertificateItem {
  id: string;
  title: string;       // ชื่อเกียรติบัตร
  description: string; // รายละเอียด/หน่วยงานที่ออกให้
  imageUrl: string;    // รูปเกียรติบัตร
}

interface CertificateState {
  certificates: CertificateItem[];
  
  addCertificate: () => void;
  updateCertificate: (id: string, field: keyof CertificateItem, value: string) => void;
  removeCertificate: (id: string) => void;
  setCertificateImage: (id: string, imageUrl: string) => void;
}

export const useCertificateStore = create<CertificateState>((set) => ({
  certificates: [
    { id: '1', title: '', description: '', imageUrl: '' }
  ],

  addCertificate: () => set((state) => ({
    certificates: [
      ...state.certificates,
      { id: Date.now().toString(), title: '', description: '', imageUrl: '' }
    ]
  })),

  updateCertificate: (id, field, value) => set((state) => ({
    certificates: state.certificates.map((cert) => cert.id === id ? { ...cert, [field]: value } : cert)
  })),

  removeCertificate: (id) => set((state) => ({
    certificates: state.certificates.filter((cert) => cert.id !== id)
  })),

  setCertificateImage: (id, imageUrl) => set((state) => ({
    certificates: state.certificates.map((cert) => cert.id === id ? { ...cert, imageUrl } : cert)
  })),
}));