"use client";
import { Children, cloneElement, isValidElement, useContext, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Paper, { PortfolioColorsContext, useTemplate } from "./Paper";
import { usePageMeasurements } from "./PageLayout";
import { portfolioThemeStyle } from "@/lib/editor/portfolio-colors";
import { splitText } from "@/lib/editor/split-text";

type Props = {children?: ReactNode; className?: string; 'data-profile-row'?: boolean; 'data-profile-column'?: string; 'data-flow-id'?: string; 'data-profile-group'?: boolean};
type Part = {id: string; text?: string};
const subscribe = () => () => {};
function hasRow(nodes: ReactNode): boolean {
 return Children.toArray(nodes).some(node => isValidElement<Props>(node) && (node.props['data-profile-row'] || hasRow(node.props.children)));
}
function mapRows(nodes: ReactNode, selected?: Part[], path = 'r'): ReactNode {
 return Children.map(nodes, (node, index) => {
   if (!isValidElement<Props>(node)) return node;
   const id = `${path}-${index}`;
   if (node.props['data-profile-row']) {
     const part = selected?.find(row => row.id === id);
     if (selected && !part) return null;
     return cloneElement(node, {'data-flow-id': id}, part?.text ?? node.props.children);
   }
   if (!node.props.children) return node;
   const children = mapRows(node.props.children, selected, id);
   if (selected && node.props['data-profile-group'] && !hasRow(children)) return null;
   return cloneElement(node, {}, children);
 });
}

/** Each template column advances independently; the physical pages share numbering. */
export default function ProfilePaper({children, className}: {children: ReactNode; className: string; sectionId: string; 'data-section': string}) {
 const template = useTemplate(); const colors = useContext(PortfolioColorsContext);
 const client = useSyncExternalStore(subscribe, () => true, () => false);
 const root = useRef<HTMLDivElement>(null); const register = usePageMeasurements();
 const [pages, setPages] = useState<Part[][] | null>(null);
 const content = mapRows(children);
 useLayoutEffect(() => {
   const source = root.current; if (!source) return;
   let active = true;
   const measure = () => {
     if (!active) return;
     const element = source.cloneNode(true) as HTMLDivElement;
     source.parentElement?.append(element);
     const rows = Array.from(element.querySelectorAll<HTMLElement>('[data-flow-id]'));
     const columns = new Map<string, HTMLElement[]>();
     rows.forEach(row => {const key = row.closest<HTMLElement>('[data-profile-column]')?.dataset.profileColumn ?? 'main';columns.set(key, [...(columns.get(key) ?? []),row]);});
     const next: Part[][] = [];
     try {
       rows.forEach(row => {row.style.display = 'none';});
       for (const group of columns.values()) {
         let page = 0; let visible: HTMLElement[] = [];
         const clear = () => {visible.forEach(row => {row.style.display='none';});visible=[];};
         const fits = (row: HTMLElement) => {
           const bounds = element.getBoundingClientRect();
           return row.getBoundingClientRect().bottom <= bounds.top + (template === "classic" ? 960 : 1020)
             && element.scrollHeight <= element.clientHeight
             && Array.from(element.querySelectorAll<HTMLElement>('*')).every(child => {
               const rect = child.getBoundingClientRect();
               return !rect.height || rect.bottom <= bounds.bottom;
             });
         };
         for (const row of group) {
           row.style.display = ''; const id = row.dataset.flowId!;
           if (!fits(row) && visible.length) {clear(); page++;}
           if (fits(row)) {
             (next[page] ??= []).push({id});visible.push(row);continue;
           }
           const html = row.innerHTML, text = row.textContent ?? '';
           const parts = splitText(text, candidate => {row.textContent=candidate;return fits(row);});
           parts.forEach((text,index) => {
             if (index) page++;
             (next[page] ??= []).push({id,text});
           });
           row.innerHTML=html; row.style.display='none';page++;clear();
         }
         clear();
       }
     } finally {element.remove();}
     const result = next.length ? next : [[]];
     setPages(previous => JSON.stringify(previous) === JSON.stringify(result) ? previous : result);
   };
   measure();const unregister=register?.(measure);
   void document.fonts.ready.then(measure);
   const images=Array.from(source.querySelectorAll('img'));images.forEach(image=>image.addEventListener('load',measure));
   return ()=>{active=false;unregister?.();images.forEach(image=>image.removeEventListener('load',measure));};
 },[children,template,client,register]);
 return <>
 {client && createPortal(<div aria-hidden="true" className="pointer-events-none fixed left-[-10000px] top-0 invisible"><div ref={root} className={className} data-template={template} data-page-section="profile" data-section="ประวัติส่วนตัว" style={portfolioThemeStyle(colors,template)}>{content}</div></div>,document.body)}
 {(pages ?? [undefined]).map((page,index)=><Paper key={index} sectionId="profile" data-section="ประวัติส่วนตัว" className={className}>{mapRows(children,page)}</Paper>)}
 </>;
}
