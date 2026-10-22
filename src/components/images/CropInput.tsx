"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ChangeEvent, type ComponentProps } from "react";
import { createPortal } from "react-dom";

type Selection = { id: number; files: File[]; done: File[] };
type Props = ComponentProps<"input"> & { active?: boolean };

/** Use the original input contract so existing upload validation and storage paths stay intact. */
export default function CropInput({ active = true, ...props }: Props) {
  // Reset only the transient crop queue/input; confirmed files live in the parent form.
  return <CropSelection key={active ? "active" : "inactive"} active={active} {...props} />;
}

function CropSelection({ onChange, active = true, ...props }: Props) {
  const pendingEvent = useRef<ChangeEvent<HTMLInputElement> | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const generation = useRef(0);
  const cancel = useCallback(() => {
    generation.current++;
    if (pendingEvent.current) pendingEvent.current.target.value = "";
    pendingEvent.current = null;
    setSelection(null);
  }, []);
  useLayoutEffect(() => () => { generation.current++; pendingEvent.current = null; }, []);
  function choose(event: ChangeEvent<HTMLInputElement>) {
    if (!active) return;
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    const id = ++generation.current;
    pendingEvent.current = null;
    setSelection(null);
    if (files.some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      onChange?.(event); // Existing form displays its validation message.
      return;
    }
    pendingEvent.current = event;
    setSelection({ id, files, done: [] });
  }
  function accept(file: File) {
    if (!selection || !active || selection.id !== generation.current || !pendingEvent.current) return;
    const done = [...selection.done, file];
    if (done.length < selection.files.length) {
      setSelection({ ...selection, done });
      return;
    }
    const transfer = new DataTransfer();
    done.forEach(item => transfer.items.add(item));
    const event = pendingEvent.current;
    event.target.files = transfer.files;
    pendingEvent.current = null;
    onChange?.(event);
    setSelection(null);
  }
  return <>
    <input {...props} type="file" onChange={choose} />
    {active && selection && createPortal(<CropDialog key={selection.id + "-" + selection.done.length} file={selection.files[selection.done.length]} onAccept={accept} onCancel={cancel} />, document.body)}
  </>;
}

function CropDialog({ file, onAccept, onCancel }: { file: File; onAccept: (file: File) => void; onCancel: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const filenameId = useId();
  const image = useRef<HTMLImageElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [ratio, setRatio] = useState("original");
  const [zoom, setZoom] = useState(1);
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  useEffect(() => {
    const source = URL.createObjectURL(file);
    if (image.current) image.current.src = source;
    dialog.current?.showModal();
    return () => URL.revokeObjectURL(source);
  }, [file]);
  const aspect = ratio === "original" ? (size.width / size.height || 1) : Number(ratio);
  const width = Math.min(300, 400 * aspect);
  const height = width / aspect;
  const scale = Math.max(width / (size.width || 1), height / (size.height || 1)) * zoom;
  const left = (size.width * scale - width) * x / 100;
  const top = (size.height * scale - height) * y / 100;
  async function crop() {
    if (!image.current || !size.width) return;
    setWorking(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(Math.min(2000, width / scale)));
      canvas.height = Math.max(1, Math.round(canvas.width / aspect));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("ไม่สามารถประมวลผลรูปได้");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image.current, left / scale, top / scale, width / scale, height / scale, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("ตัดรูปไม่สำเร็จ")), "image/jpeg", 0.92));
      onAccept(new File([blob], `${file.name.replace(/\.[^.]+$/, "")}-crop.jpg`, { type: "image/jpeg" }));
    } catch {
      setError("ตัดรูปไม่สำเร็จ ลองอีกครั้งหรือใช้รูปต้นฉบับ");
    } finally { setWorking(false); }
  }
  return <dialog ref={dialog} aria-labelledby={titleId} aria-describedby={filenameId} onCancel={event => { event.preventDefault(); onCancel(); }} className="fixed inset-0 m-auto max-h-[95dvh] w-[min(95vw,480px)] overflow-auto rounded-2xl bg-white p-6 text-slate-800 shadow-2xl backdrop:bg-slate-950/60">
    <h2 id={titleId} className="text-lg font-bold">ปรับขอบเขตรูปภาพ</h2>
    <p id={filenameId} className="mb-4 text-xs text-slate-500">{file.name}</p>
    <div className="relative mx-auto overflow-hidden bg-slate-100" style={{ width, height }}>
      <img ref={image} alt="ตัวอย่างขอบเขตที่จะตัด" onLoad={event => setSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} onError={() => setError("อ่านรูปภาพไม่ได้")} style={{ position: "absolute", maxWidth: "none", width: size.width * scale, height: size.height * scale, left: -left, top: -top }} />
    </div>
    <label className="mt-4 block text-sm">สัดส่วน <select aria-label="สัดส่วนรูป" value={ratio} onChange={event => setRatio(event.target.value)} className="ml-2 rounded border p-1"><option value="original">ต้นฉบับ</option><option value="1">จัตุรัส 1:1</option><option value={210/297}>A4 แนวตั้ง</option><option value={4/3}>4:3</option><option value={16/9}>16:9</option></select></label>
    {[{ label: "ซูม", value: zoom, set: setZoom, min: 1, max: 3, step: 0.01 }, { label: "ตำแหน่งแนวนอน", value: x, set: setX, min: 0, max: 100, step: 1 }, { label: "ตำแหน่งแนวตั้ง", value: y, set: setY, min: 0, max: 100, step: 1 }].map(control => <label key={control.label} className="mt-3 block text-xs">{control.label}<input aria-label={control.label} type="range" min={control.min} max={control.max} step={control.step} value={control.value} onChange={event => control.set(Number(event.target.value))} className="block w-full" /></label>)}
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    <div className="mt-5 flex flex-wrap justify-end gap-3 text-sm">
      <button type="button" disabled={working} onClick={onCancel} className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">ยกเลิก</button>
      <button type="button" disabled={working} onClick={() => onAccept(file)} className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">ใช้รูปต้นฉบับ</button>
      <button type="button" disabled={working || !size.width} onClick={crop} className="min-h-11 rounded-lg bg-blue-600 px-3 py-2 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-40">ตัดรูปและใช้รูปนี้</button>
    </div>
  </dialog>;
}
