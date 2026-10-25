"use client";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { defaultColors, hexToHsv, hsvToHex, normalizeHex, type PortfolioColors } from "@/lib/editor/portfolio-colors";

const samples = ["#303F9F", "#1D416D", "#3479B8", "#167D98", "#277455", "#A13A50", "#77449B", "#D89B45", "#232B38", "#E4D7C6"];

function Spectrum({ value, setColor }: { value: string; setColor: (value: string) => void }) {
  const area = useRef<HTMLDivElement>(null);
  const color = hexToHsv(value);
  const pointer = (event: PointerEvent<HTMLDivElement>) => {
    const rect = area.current?.getBoundingClientRect();
    if (!rect?.width || !rect.height) return;
    setColor(hsvToHex({ h: color.h, s: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)), v: 1 - Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)) }));
  };
  const keyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    const increment: Record<string, [number, number]> = { ArrowLeft: [-0.02, 0], ArrowRight: [0.02, 0], ArrowUp: [0, 0.02], ArrowDown: [0, -0.02] };
    if (!increment[event.key]) return;
    event.preventDefault();
    const [ds, dv] = increment[event.key];
    setColor(hsvToHex({ h: color.h, s: Math.max(0, Math.min(1, color.s + ds)), v: Math.max(0, Math.min(1, color.v + dv)) }));
  };
  return <>
    <div ref={area} role="group" tabIndex={0} aria-label="จานเลือกความสดและความสว่างของสี ใช้ปุ่มลูกศรได้" onKeyDown={keyboard}
      onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); pointer(event); }}
      onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) pointer(event); }}
      onPointerUp={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
      className="relative h-40 cursor-crosshair touch-none overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      style={{ backgroundColor: "hsl(" + color.h + " 100% 50%)", backgroundImage: "linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,transparent)" }}>
      <span aria-hidden="true" className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-[0_0_0_1px_#0F172A,0_1px_7px_#0008]" style={{ left: (color.s * 100) + "%", top: ((1 - color.v) * 100) + "%" }} />
    </div>
    <label htmlFor="portfolio-hue" className="block text-sm font-semibold text-slate-700">แถบสีรุ้ง</label>
    <input id="portfolio-hue" type="range" min={0} max={359} value={Math.round(color.h)} aria-label="เลือกเฉดสี" onChange={event => setColor(hsvToHex({ ...color, h: Number(event.target.value) }))} className="block h-4 w-full cursor-pointer appearance-none rounded-full accent-white" style={{ background: "linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)" }} />
  </>;
}

export default function PortfolioColorPicker({ template, colors, onChange, onReset }: { template: string; colors: PortfolioColors; onChange: (colors: PortfolioColors) => void; onReset: () => void }) {
  const [selected, setSelected] = useState<"primary" | "secondary">("primary");
  const value = colors[selected];
  const [hexText, setHexText] = useState(value);
  const [eyedropperError, setEyedropperError] = useState("");
  useEffect(() => setHexText(value), [value, selected]);
  const update = (hex: string) => { const safe = normalizeHex(hex); if (safe) onChange({ ...colors, [selected]: safe }); };
  const changeHex = (text: string) => { setHexText(text); if (normalizeHex(text)) update(text); };
  const eyedropper = async () => {
    type EyeDropperApi = new () => { open: () => Promise<{ sRGBHex: string }> };
    const ctor = (window as Window & { EyeDropper?: EyeDropperApi }).EyeDropper;
    if (!ctor) { setEyedropperError("เบราว์เซอร์นี้ไม่รองรับหลอดดูดสี"); return; }
    try { update((await new ctor().open()).sRGBHex); setEyedropperError(""); } catch { /* User dismissed the OS picker. */ }
  };
  return <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-3 sm:p-4" aria-label="ปรับสีหลักและสีรอง">
    <h3 className="text-base font-bold text-slate-900">ปรับสี Portfolio</h3>
    <p className="text-sm leading-6 text-slate-600">เลือกสีหลักหรือสีรอง แล้วลากจุดในจานสีหรือพิมพ์ HEX เพื่อดูผลใน Preview ทันที</p>
    <div className="grid grid-cols-2 gap-2" role="group" aria-label="เลือกสีหลักหรือสีรอง">
      {(["primary", "secondary"] as const).map(key => <button key={key} type="button" aria-pressed={selected === key} onClick={() => setSelected(key)} className={"flex min-h-14 min-w-0 items-center gap-2 rounded-lg border-2 p-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 " + (selected === key ? "border-blue-600 bg-blue-50" : "border-slate-200")}>
        <span className="h-8 w-8 shrink-0 rounded-md border border-slate-200" style={{ backgroundColor: colors[key] }} /><span className="min-w-0 break-words font-semibold">{key === "primary" ? "สีหลัก" : "สีรอง"}<span className="block text-[11px] font-normal text-slate-600">{colors[key]}</span></span>
      </button>)}
    </div>
    {template === "minimal" && <p className="rounded-lg bg-blue-50 p-2 text-xs text-blue-800">Minimal ใช้สีแบบเรียบง่าย องค์ประกอบบางส่วนคงสีขาว–เทาเพื่อให้อ่านชัด</p>}
    <Spectrum value={value} setColor={update} />
    <div className="flex flex-wrap gap-2" aria-label="ชุดสีแนะนำ">{samples.map(color => <button key={color} type="button" onClick={() => update(color)} aria-label={"เลือกสี " + color} aria-pressed={value === color} className="h-9 w-9 rounded-full border-2 border-white shadow-[0_0_0_1px_#CBD5E1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600" style={{ backgroundColor: color }} />)}</div>
    <div className="flex items-end gap-2">
      <div className="min-w-0 flex-1"><label htmlFor="portfolio-color-hex" className="mb-1 block text-sm font-semibold text-slate-700">รหัสสี HEX</label><input id="portfolio-color-hex" value={hexText} maxLength={7} onChange={event => changeHex(event.target.value)} onBlur={() => { if (!normalizeHex(hexText)) setHexText(value); }} aria-invalid={!normalizeHex(hexText)} spellCheck={false} placeholder="#303F9F" className="min-h-11 w-full rounded-lg border border-slate-300 px-3 font-mono text-base focus-visible:outline-2 focus-visible:outline-blue-600" />{!normalizeHex(hexText) && <p role="alert" className="mt-1 text-xs text-red-700">ใส่รหัส HEX 6 หลัก เช่น #303F9F</p>}</div>
      <button type="button" onClick={() => void eyedropper()} title="ดูดสีจากหน้าจอ" aria-label="ดูดสีจากหน้าจอ" className="min-h-11 rounded-lg border border-slate-300 px-4 text-lg focus-visible:outline-2 focus-visible:outline-blue-600">⌖</button>
    </div>
    {eyedropperError && <p role="status" className="text-xs text-amber-700">{eyedropperError}</p>}
    <button type="button" onClick={onReset} className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm font-medium hover:bg-slate-50">คืนค่าสีเริ่มต้น</button>
    <p className="text-xs leading-5 text-slate-500">ระบบจำสีในเบราว์เซอร์นี้แยกตาม Portfolio สีจะไม่ซิงค์ไปอุปกรณ์อื่น</p>
  </section>;
}
