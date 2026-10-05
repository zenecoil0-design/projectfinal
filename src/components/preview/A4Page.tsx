import type { ReactNode } from "react";

type A4PageProps = {
  children: ReactNode;
  className?: string;
};

export default function A4Page({
  children,
  className = "",
}: A4PageProps) {
  return (
    <section
      className={`relative box-border h-[297mm] w-[210mm] shrink-0 overflow-hidden rounded-sm border border-slate-300 bg-white shadow-2xl ${className}`}
    >
      {children}
    </section>
  );
}
