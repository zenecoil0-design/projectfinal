"use client";
import Paper, { useTemplate } from "./Paper";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { packPages } from "@/lib/editor/pagination";

export default function PaginatedSection({ title, cards }: { title: string; cards: ReactNode[] }) {
  const client = useSyncExternalStore(subscribeClient, () => true, () => false);
  const template = useTemplate();
  const measurement = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<number[][]>([cards.map((_, index) => index)]);
  useEffect(() => {
    const element = measurement.current;
    if (!element) return;
    const update = () => {
      const next = packPages(Array.from(element.children).map(child => (child as HTMLElement).offsetHeight), 840);
      setPages(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    const observer = new ResizeObserver(update);
    Array.from(element.children).forEach(child => observer.observe(child));
    update();
    return () => observer.disconnect();
  }, [cards, template, client]);
  return <>
    {/* Same 664px content width as the A4 page, but outside export and accessibility trees. */}
    {client && createPortal(<div data-template={template} aria-hidden="true" className="pointer-events-none fixed left-[-10000px] top-0 invisible w-[794px] px-16" ref={measurement}>
      {cards.map((card, index) => <div key={index}>{card}</div>)}
    </div>, document.body)}
    {pages.map((indices, pageIndex) => <Paper key={pageIndex} data-section={title} className="portfolio-page relative mb-10 flex flex-col bg-white p-16 text-slate-800 shadow-2xl">
      <div className="mb-6 flex items-center justify-between border-b pb-4">
        <h2 className="text-3xl font-bold tracking-wide">{title}</h2>
        <span className="text-xs text-slate-500">{pageIndex + 1} / {pages.length}</span>
      </div>
      <div className="flex flex-1 flex-col gap-6">
        {indices.length ? indices.map(index => <div key={index}>{cards[index]}</div>) : <p className="m-auto text-slate-500">ยังไม่ได้เลือก{title}</p>}
      </div>
      <div className="mt-6 border-t pt-4 text-center text-xs text-slate-400">Portfolio — {title}</div>
    </Paper>)}
  </>;
}

// Hydration-safe portal: measure outside a display:none mobile Preview ancestor.
function subscribeClient() { return () => {}; }
