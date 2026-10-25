"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";
import { PageLayout } from "./PageLayout";
import { numberedSections } from "@/lib/editor/page-numbers";
import { portfolioThemeStyle, type PortfolioColors } from "@/lib/editor/portfolio-colors";
import type { Section } from "@/lib/editor/section-state";

export const TemplateContext = createContext("classic");
export const PortfolioColorsContext = createContext<PortfolioColors | null>(null);
export const useTemplate = () => useContext(TemplateContext);

const ScaleContext = createContext(1);

/** Scale the whole physical page, never its type or individual elements. */
export function PreviewViewport({ children, activeSection, visible = true }: { children: ReactNode; activeSection?: Section | null; visible?: boolean }) {
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
  useLayoutEffect(() => {
    const container = viewport.current?.closest("main");
    const target = activeSection && viewport.current?.querySelector<HTMLElement>(`[data-page-section="${activeSection}"]`);
    if (!visible || !container || !target || !viewport.current?.clientWidth) return;
    // A newly visible viewport may still have the previous width's scale.
    // ResizeObserver commits the new scale; only then is the scroll offset valid.
    const expectedScale = Math.min(1, viewport.current.clientWidth / 794);
    if (Math.abs(scale - expectedScale) > 0.001) return;
    container.scrollTo({ top: Math.max(0, container.scrollTop + target.getBoundingClientRect().top - container.getBoundingClientRect().top - 24), behavior: "smooth" });
  }, [activeSection, visible, scale]);
  return <div ref={viewport} className="mx-4 py-6">
    <p className="mb-4 text-center text-xs text-slate-600">A4 · 210 × 297 มม. · พอดีหน้าจอ {Math.round(scale * 100)}%</p>
    <ScaleContext.Provider value={scale}><PageLayout>{children}</PageLayout></ScaleContext.Provider>
  </div>;
}

export default function Paper({ sectionId, children, style, ...props }: HTMLAttributes<HTMLDivElement> & { sectionId: Section | "toc" }) {
  const scale = useContext(ScaleContext);
  const template = useTemplate();
  const colors = useContext(PortfolioColorsContext);
  const themeStyle = portfolioThemeStyle(colors, template);
  return <div className="paper-frame" style={{ width: 794 * scale, height: 1123 * scale }}>
    <div {...props} data-template={template} data-portfolio-page data-page-section={sectionId} data-numbered={numberedSections.has(sectionId)} style={{ ...style, ...themeStyle, transform: `scale(${scale})`, transformOrigin: "top left" }}>{children}</div>
  </div>;
}
