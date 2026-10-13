export const MAX_PAGES = 10;
export const MAX_PDF_BYTES = 10_000_000;

export function inspectPages(container: HTMLElement) {
  const pages = Array.from(container.querySelectorAll<HTMLElement>("[data-portfolio-page]"));
  const overflow = pages.flatMap((page, index) => {
    const bounds = page.getBoundingClientRect();
    const outside = Array.from(page.querySelectorAll<HTMLElement>("*")).some(element => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && (rect.bottom > bounds.bottom + 1 || rect.right > bounds.right + 1 || rect.left < bounds.left - 1);
    });
    return outside || page.scrollHeight > page.clientHeight + 1 ? [index + 1] : [];
  });
  return { pages, overflow };
}

export async function createPortfolioPdf(container: HTMLElement, onProgress: (message: string) => void) {
  await document.fonts.ready;
  const images = Array.from(container.querySelectorAll<HTMLImageElement>("[data-portfolio-page] img"));
  await Promise.all(images.map(async image => {
    try { await image.decode(); } catch { throw new Error("มีรูปภาพโหลดไม่สำเร็จ กรุณาตรวจสอบรูปก่อนส่งออก"); }
  }));
  // The renderer otherwise silently replaces failed CORS fetches with blank images.
  const imageData = new Map<string, string>();
  await Promise.all([...new Set(images.map(image => image.currentSrc || image.src))].map(async source => {
    try {
      const response = await fetch(source);
      if (!response.ok) throw new Error("Image request failed");
      const blob = await response.blob();
      const encoded = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      imageData.set(source, encoded);
    } catch {
      throw new Error("ไม่สามารถนำรูปภาพบางรูปใส่ PDF ได้ กรุณาตรวจสอบสิทธิ์เข้าถึงรูปหรืออัปโหลดรูปใหม่");
    }
  }));
  // Let image-dependent pagination finish its ResizeObserver and React updates.
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  const { pages, overflow } = inspectPages(container);
  if (!pages.length) throw new Error("ยังไม่มีหน้าสำหรับส่งออก");
  if (pages.length > MAX_PAGES) throw new Error(`พอร์ตมี ${pages.length} หน้า กรุณาลดให้เหลือไม่เกิน ${MAX_PAGES} หน้า`);
  if (overflow.length) throw new Error(`เนื้อหาล้นหน้า ${overflow.join(", ")} กรุณาลดข้อความหรือจำนวนรูปในรายการนั้น`);
  const [{ toCanvas }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);

  // Keep one page canvas in memory at a time; retry at a lower resolution if needed.
  for (const [pixelRatio, quality] of [[2, 0.9], [1.5, 0.8], [1, 0.7]]) {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    for (let index = 0; index < pages.length; index++) {
      onProgress(`กำลังสร้าง PDF หน้า ${index + 1} / ${pages.length}`);
      const wrapper = document.createElement("div");
      wrapper.style.cssText = "position:fixed;left:-10000px;top:0;pointer-events:none";
      const clone = pages[index].cloneNode(true) as HTMLElement;
      const originals = pages[index].querySelectorAll<HTMLImageElement>("img");
      clone.querySelectorAll<HTMLImageElement>("img").forEach((image, imageIndex) => {
        const original = originals[imageIndex];
        image.removeAttribute("srcset");
        image.src = imageData.get(original.currentSrc || original.src)!;
      });
      clone.style.transform = "none";
      clone.style.margin = "0";
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);
      try {
        // The mobile form tab hides the preview; validate the visible-size clone too.
        if (inspectPages(wrapper).overflow.length) throw new Error(`เนื้อหาล้นหน้า ${index + 1} กรุณาลดข้อความหรือจำนวนรูปในรายการนั้น`);
        const canvas = await toCanvas(clone, {
          pixelRatio, backgroundColor: getComputedStyle(clone).backgroundColor,
          width: 794, height: 1123, canvasWidth: 794, canvasHeight: 1123,
          style: { margin: "0", boxShadow: "none", borderRadius: "0", transform: "none", width: "794px", height: "1123px" },
        });
        if (index) pdf.addPage();
        // One uniform scale protects text and photos from non-uniform stretching.
        const ratio = Math.min(210 / canvas.width, 297 / canvas.height);
        const width = canvas.width * ratio;
        const height = canvas.height * ratio;
        pdf.addImage(canvas.toDataURL("image/jpeg", quality), "JPEG", (210 - width) / 2, (297 - height) / 2, width, height, undefined, "FAST");
        canvas.width = 0;
        canvas.height = 0;
      } finally { wrapper.remove(); }
    }
    const blob = pdf.output("blob");
    if (blob.size <= MAX_PDF_BYTES) return blob;
  }
  throw new Error("ไฟล์ยังเกิน 10 MB กรุณาลดจำนวนหรือขนาดรูปภาพแล้วลองใหม่");
}
