"use client";

import { createContext, useContext, useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";
import { PageLayout } from "./PageLayout";
import { numberedSections } from "@/lib/editor/page-numbers";
import type { Section } from "@/lib/editor/section-state";

export const TemplateContext = createContext("classic");
export const useTemplate = () => useContext(TemplateContext);

const ScaleContext = createContext(1);

/** Scale the whole physical page, never its type or individual elements. */
export function PreviewViewport({ children }: { children: ReactNode }) {
  const viewport = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setScale(Math.min(1, entry.contentRect.width / 794));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div ref={viewport} className="mx-4 py-6">
    <p className="mb-4 text-center text-xs text-slate-600">A4 · 210 × 297 มม. · พอดีหน้าจอ {Math.round(scale * 100)}%</p>
    <ScaleContext.Provider value={scale}><PageLayout>{children}</PageLayout></ScaleContext.Provider>
  </div>;
}

export default function Paper({ sectionId, children, style, ...props }: HTMLAttributes<HTMLDivElement> & { sectionId: Section | "toc" }) {
  const scale = useContext(ScaleContext);
  const template = useTemplate();
  return <div className="paper-frame" style={{ width: 794 * scale, height: 1123 * scale }}>
    <div {...props} data-template={template} data-portfolio-page data-page-section={sectionId} data-numbered={numberedSections.has(sectionId)} style={{ ...style, transform: `scale(${scale})`, transformOrigin: "top left" }}>{children}</div>
  </div>;
}
