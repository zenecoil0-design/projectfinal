import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CertificateItem {
  id: string;
  title: string;
  description: string;
  issuedBy: string;
  issuedDate: string;
  images: string[];
}

interface CertificateState {
  certificates: CertificateItem[];

  setCertificates: (
    certificates: CertificateItem[]
  ) => void;

  addCertificate: () => void;

  updateCertificate: (
    id: string,
    field: keyof CertificateItem,
    value: string | string[]
  ) => void;

  removeCertificate: (
    id: string
  ) => void;

  clearCertificates: () => void;
}

export const useCertificateStore =
  create<CertificateState>()(
    persist(
      (set) => ({
        certificates: [],

        setCertificates: (
          certificates
        ) =>
          set({
            certificates,
          }),

        addCertificate: () =>
          set((state) => ({
            certificates: [
              ...state.certificates,
              {
                id: crypto.randomUUID(),
                title: "",
                description: "",
                issuedBy: "",
                issuedDate: "",
                images: [],
              },
            ],
          })),

        updateCertificate: (
          id,
          field,
          value
        ) =>
          set((state) => ({
            certificates:
              state.certificates.map(
                (certificate) =>
                  certificate.id === id
                    ? {
                        ...certificate,
                        [field]: value,
                      }
                    : certificate
              ),
          })),

        removeCertificate: (
          id
        ) =>
          set((state) => ({
            certificates:
              state.certificates.filter(
                (certificate) =>
                  certificate.id !== id
              ),
          })),

        clearCertificates: () =>
          set({
            certificates: [],
          }),
      }),
      {
        name:
          "portfolio-certificate-storage",
      }
    )
  );