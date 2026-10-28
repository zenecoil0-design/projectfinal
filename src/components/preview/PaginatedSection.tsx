"use client";
import Paper, { useTemplate, PortfolioColorsContext } from "./Paper";

import { Children, cloneElement, isValidElement, useContext, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { splitCardFields, type CardFragment } from "@/lib/editor/card-fragments";
import { packPages } from "@/lib/editor/pagination";
import { portfolioThemeStyle } from "@/lib/editor/portfolio-colors";
import type { Section } from "@/lib/editor/section-state";
import { PageNumber, usePageMeasurements } from "./PageLayout";

// Leave 80px inside the existing 840px packing budget for taller template headings.
const splitCardBudget = 760;
type Fragment = { index: number; fields?: Record<string, string>; continuation?: boolean };
type CardNodeProps = {
  children?: ReactNode;
  className?: string;
  'data-split-field'?: string;
  'data-split-row'?: boolean;
  'data-split-media'?: boolean;
  'data-has-image'?: boolean;
};
const mediaSelector = '.document-images, [data-split-media]';
const continuationClass = 'mb-1 text-sm';
const continuationText = (index: number) => `รายการที่ ${index + 1} (ต่อ)`;

function fragmentCard(node: ReactNode, fragment: Fragment): ReactNode {
  if (!fragment.fields || !isValidElement<CardNodeProps>(node)) return node;
  const classes = node.props.className?.split(' ') ?? [];
  if (fragment.continuation && (classes.includes('document-images') || node.props['data-split-media'])) return null;
  const field = node.props['data-split-field'];
  if (field) return field in fragment.fields ? cloneElement(node, {}, fragment.fields[field]) : null;
  const children = Children.map(node.props.children, child => fragmentCard(child, fragment));
  if (node.props['data-split-row'] && !Children.toArray(children).some(child =>
    isValidElement<CardNodeProps>(child) && child.props['data-split-field'])) return null;
  const props: Partial<CardNodeProps> = {};
  if (fragment.continuation && classes.includes('education-card')) {
    props.className = [...new Set([...classes, 'without-logo'])].join(' ');
    if (node.props['data-has-image'] !== undefined) props['data-has-image'] = false;
  }
  return cloneElement(node, props, children);
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
        const fields = Array.from(child.querySelectorAll<HTMLElement>('[data-split-field]'));
        if (child.offsetHeight <= splitCardBudget || !fields.length) {
          fragments.push({index}); heights.push(child.offsetHeight); return;
        }
        // Measure disposable clones; never replace text in React's measurement tree.
        const height = (values: Record<string, string>, continuation: boolean) => {
          const clone = child.cloneNode(true) as HTMLElement;
          clone.querySelectorAll<HTMLElement>('[data-split-field]').forEach(field => {
            const key = field.dataset.splitField!;
            if (key in values) field.textContent = values[key]; else field.remove();
          });
          clone.querySelectorAll('[data-split-row]').forEach(row => {
            if (!row.querySelector('[data-split-field]')) row.remove();
          });
          if (continuation) {
            clone.querySelectorAll(mediaSelector).forEach(media => media.remove());
            clone.querySelectorAll('.education-card').forEach(card => {
              card.classList.add('without-logo');
              if (card.hasAttribute('data-has-image')) card.setAttribute('data-has-image', 'false');
            });
            const label = document.createElement('p');
            label.className = continuationClass;
            label.textContent = continuationText(index);
            clone.prepend(label);
          }
          element.appendChild(clone);
          try { return clone.offsetHeight; } finally { clone.remove(); }
        };
        const parts = splitCardFields(
          fields.map(field => ({ key: field.dataset.splitField!, text: field.textContent ?? '' })),
          (values, continuation) => height(values, continuation) <= splitCardBudget,
          Boolean(child.querySelector(mediaSelector)),
        );
        parts.forEach((part: CardFragment) => {
          fragments.push({index, ...part}); heights.push(height(part.fields, part.continuation));
        });
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
        {indices.length ? indices.map(index => <div key={index}>{layout.fragments[index].continuation && <p className={continuationClass}>{continuationText(layout.fragments[index].index)}</p>}{fragmentCard(cards[layout.fragments[index].index], layout.fragments[index])}</div>) : <p className="m-auto text-slate-500">ยังไม่ได้เลือก{title}</p>}
      </div>
      <div className="mt-6 border-t pt-4 text-center text-xs text-slate-400">Portfolio — {title}<PageNumber /></div>
    </Paper>)}
  </>;
}

// Hydration-safe portal: measure outside a display:none mobile Preview ancestor.
function subscribeClient() { return () => {}; }
