"use client";
import Paper, { useTemplate, PortfolioColorsContext } from "./Paper";
import { useCoverStore } from "@/store/useCoverStore";
import { useContext, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { usePageMeasurements } from "./PageLayout";
import { portfolioThemeStyle } from "@/lib/editor/portfolio-colors";
import { splitText } from "@/lib/editor/split-text";
const pageClass = "portfolio-page bg-white shadow-2xl rounded-sm relative overflow-hidden flex flex-col justify-between p-16 mx-auto my-auto border border-slate-300 text-slate-800";
const subscribe = () => () => {};
function Content({text, author, last = true}: {text: string; author: string; last?: boolean}) {
 return <>
      {/*ด้านบน: หัวข้อหน้าคำนำ*/}
      <div className="flex flex-col items-center">
        <h2 className="text-4xl font-bold tracking-wider mb-12">คำนำ</h2>
      </div>

      {/*ส่วนกลาง: ข้อความคำนำที่ผู้ใช้พิมพ์*/}
      <div data-preface-body className="flex-1 px-8">
        <p data-preface-text className="text-base leading-relaxed whitespace-pre-line text-slate-700">
          {text}
        </p>
      </div>

      {/*ส่วนท้าย: ลงชื่อผู้จัดทำ*/}
      <div style={{ visibility: last ? undefined : "hidden" }} className="flex flex-col items-end pr-12 mt-10">
        <p className="text-sm mb-6">ด้วยความเคารพอย่างสูง</p>
        <p className="text-base font-bold">
          {author}
        </p>
        <p className="text-sm text-slate-500 mt-1">ผู้จัดทำ</p>
      </div>

</>;
}
export default function PrefacePreview() {
 const {prefaceText, authorName} = useCoverStore();
 const text = prefaceText || "พิมพ์ข้อความคำนำของคุณที่นี่ .";
 const author = authorName || "ชื่อผู้จัดทำ";
 const template = useTemplate(); const colors = useContext(PortfolioColorsContext);
 const client = useSyncExternalStore(subscribe, () => true, () => false);
 const measurement = useRef<HTMLDivElement>(null); const register = usePageMeasurements();
 const [pages, setPages] = useState([text]);
 useLayoutEffect(() => {
   const root = measurement.current;
   const body = root?.querySelector<HTMLElement>('[data-preface-body]');
   const paragraph = root?.querySelector<HTMLElement>('[data-preface-text]');
   if (!root || !body || !paragraph) return;
   let active = true;
   const measure = () => {
     if (!active) return;
     paragraph.textContent = '';
     const style = getComputedStyle(body);
     const budget = body.getBoundingClientRect().height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
     const next = splitText(text, candidate => {
       paragraph.textContent = candidate;
       return paragraph.getBoundingClientRect().height <= budget;
     });
     paragraph.textContent = '';
     setPages(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
   };
   measure(); const unregister = register?.(measure);
   void document.fonts.ready.then(measure);
   return () => {active = false; unregister?.();};
 }, [text, author, template, client, register]);
 return <>
 {client && createPortal(<div aria-hidden="true" className="pointer-events-none fixed left-[-10000px] top-0 invisible"><div ref={measurement} data-template={template} data-page-section="preface" data-section="คำนำ" className={pageClass} style={portfolioThemeStyle(colors, template)}><Content text="" author={author} /></div></div>, document.body)}
 {pages.map((part, index) => <Paper key={index} sectionId="preface" data-section="คำนำ" className={pageClass}><Content text={part} author={author} last={index === pages.length - 1} /></Paper>)}
 </>;
}
