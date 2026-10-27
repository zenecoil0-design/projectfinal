"use client";
import Paper, { useTemplate, PortfolioColorsContext } from "./Paper";

import { Children, cloneElement, isValidElement, useContext, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { splitText } from "@/lib/editor/split-text";
import { packPages } from "@/lib/editor/pagination";
import { portfolioThemeStyle } from "@/lib/editor/portfolio-colors";
import type { Section } from "@/lib/editor/section-state";
import { PageNumber, usePageMeasurements } from "./PageLayout";

// Leave 80px inside the existing 840px packing budget for taller template headings.
const splitCardBudget = 760;
type Fragment = { index: number; text?: string; continuation?: boolean };
function fragmentCard(node: ReactNode, fragment: Fragment): ReactNode {
  if (!isValidElement<{children?: ReactNode; className?: string; 'data-split-description'?: boolean}>(node)) return node;
  if (fragment.continuation && node.props.className?.split(' ').includes('document-images')) return null;
  if (node.props['data-split-description'] && fragment.text !== undefined) return cloneElement(node, {}, fragment.text);
  if (!node.props.children) return node;
  return cloneElement(node, {}, Children.map(node.props.children, child => fragmentCard(child, fragment)));
}

export default function PaginatedSection({ sectionId, title, cards }: { sectionId: Section; title: string; cards: ReactNode[] }) {
  const client = useSyncExternalStore(subscribeClient, () => true, () => false);
  const template = useTemplate();
  const colors = useContext(PortfolioColorsContext);
  const measurement = useRef<HTMLDivElement>(null);
  const registerMeasurement = usePageMeasurements();
  const [layout, setLayout] = useState<{pages: number[][]; fragments: Fragment[]}>({pages: [cards.map((_, index) => index)], fragments: cards.map((_, index) => ({index}))});
  useLayoutEffect(() => {
    const element = measurement.current;
    if (!element) return;
    const update = () => {
      const fragments: Fragment[] = [];
      const heights: number[] = [];
      Array.from(element.children).forEach((child, index) => {
        if (!(child instanceof HTMLElement)) return;
        const description = child.querySelector<HTMLElement>('[data-split-description]');
        const original = description?.textContent ?? '';
        if (child.offsetHeight <= splitCardBudget || !description || !original) {
          fragments.push({index}); heights.push(child.offsetHeight); return;
        }
        const parts = splitText(original, candidate => {
          description.textContent = candidate;
          return child.offsetHeight <= splitCardBudget;
        });
        parts.forEach((text, part) => {
          description.textContent = text;
          fragments.push({index, text, continuation: part > 0}); heights.push(child.offsetHeight);
        });
        description.textContent = original;
      });
      const next = {fragments, pages: packPages(heights, 840)};
      setLayout(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    const observer = new ResizeObserver(update);
    Array.from(element.children).forEach(child => observer.observe(child));
    update();
    const unregister = registerMeasurement?.(update);
    return () => { observer.disconnect(); unregister?.(); };
  }, [cards, template, client, registerMeasurement]);
  return <>
    {/* Same 666px content width as A4, outside export/accessibility trees. */}
    {client && createPortal(<div data-template={template} style={portfolioThemeStyle(colors, template)} aria-hidden="true" className="portfolio-measurement pointer-events-none fixed left-[-10000px] top-0 invisible w-[794px] px-16" ref={measurement}>
      {cards.map((card, index) => <div key={index}>{card}</div>)}
    </div>, document.body)}
    {layout.pages.map((indices, pageIndex) => <Paper sectionId={sectionId} key={pageIndex} data-section={title} className="portfolio-page relative mb-10 flex flex-col bg-white p-16 text-slate-800 shadow-2xl">
      <div className="mb-6 flex items-center justify-between border-b pb-4">
        <h2 className="text-3xl font-bold tracking-wide">{title}</h2>
      </div>
      <div className="flex flex-1 flex-col gap-6">
        {indices.length ? indices.map(index => <div key={index}>{fragmentCard(cards[layout.fragments[index].index], layout.fragments[index])}</div>) : <p className="m-auto text-slate-500">ยังไม่ได้เลือก{title}</p>}
      </div>
      <div className="mt-6 border-t pt-4 text-center text-xs text-slate-400">Portfolio — {title}<PageNumber /></div>
    </Paper>)}
  </>;
}

// Hydration-safe portal: measure outside a display:none mobile Preview ancestor.
function subscribeClient() { return () => {}; }
