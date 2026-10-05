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
      data-a4-page
      className={`relative box-border shrink-0 overflow-hidden rounded-sm border border-slate-300 bg-white shadow-2xl ${className}`}
      style={{
        width: "210mm",
        height: "297mm",
        minWidth: "210mm",
        minHeight: "297mm",
        printColorAdjust: "exact",
        WebkitPrintColorAdjust: "exact",
      }}
    >
      {children}
    </section>
  );
}
