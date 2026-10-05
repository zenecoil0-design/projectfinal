import { create } from "zustand";

export interface CertificateItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
}

type CertificateTextField = "title" | "description";

interface CertificateState {
  certificates: CertificateItem[];
  addCertificate: () => void;
  updateCertificate: (
    id: string,
    field: CertificateTextField,
    value: string
  ) => void;
  removeCertificate: (id: string) => void;
  setCertificateImage: (
    id: string,
    imageUrl: string
  ) => void;
}

export const useCertificateStore = create<CertificateState>((set) => ({
  certificates: [
    {
      id: "1",
      title: "",
      description: "",
      imageUrl: "",
    },
  ],

  addCertificate: () =>
    set((state) => ({
      certificates: [
        ...state.certificates,
        {
          id: crypto.randomUUID(),
          title: "",
          description: "",
          imageUrl: "",
        },
      ],
    })),

  updateCertificate: (id, field, value) =>
    set((state) => ({
      certificates: state.certificates.map((certificate) =>
        certificate.id === id
          ? { ...certificate, [field]: value }
          : certificate
      ),
    })),

  removeCertificate: (id) =>
    set((state) => ({
      certificates: state.certificates.filter(
        (certificate) => certificate.id !== id
      ),
    })),

  setCertificateImage: (id, imageUrl) =>
    set((state) => ({
      certificates: state.certificates.map((certificate) =>
        certificate.id === id
          ? { ...certificate, imageUrl }
          : certificate
      ),
    })),
}));
