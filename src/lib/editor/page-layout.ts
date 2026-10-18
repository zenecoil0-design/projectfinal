import { flushSync } from "react-dom";
import { documentContents, documentPageNumbers } from "./page-numbers";

// Only live Preview roots register. Measurement portals and PDF clones never do.
const layouts = new WeakMap<HTMLElement, () => void>();

type Contents = ReturnType<typeof documentContents>;

function contentsMatch(list: Element, entries: Contents) {
  return list.children.length === entries.length && entries.every((entry, index) => {
    const row = list.children[index];
    return row.getAttribute("data-toc-section") === entry.sectionId &&
      row.querySelector(".toc-title")?.textContent === entry.title &&
      row.querySelector("[data-toc-page]")?.textContent === String(entry.page);
  });
}

function currentContents(pages: HTMLElement[], numbers: ReturnType<typeof documentPageNumbers>) {
  const titles = Object.fromEntries(pages.map(page => [page.dataset.pageSection ?? "", page.dataset.section ?? ""]));
  return documentContents(numbers, titles);
}

export function synchronizePageNumbers(root: HTMLElement) {
  const pages = Array.from(root.querySelectorAll<HTMLElement>("[data-portfolio-page]"));
  const numbers = documentPageNumbers(pages.map(page => ({
    sectionId: page.dataset.pageSection ?? "",
    numbered: page.dataset.numbered === "true",
  })));
  numbers.forEach((number, index) => {
    const page = pages[index];
    const marker = page.querySelector<HTMLElement>("[data-page-number]");
    page.dataset.physicalPage = String(number.physical);
    if (number.printed !== null && marker) {
      const value = String(number.printed);
      // PageNumber owns the empty element; this coordinator alone owns its text.
      if (marker.textContent !== value) marker.textContent = value;
      marker.setAttribute("aria-label", `หน้า ${value}`);
    }
  });
  const entries = currentContents(pages, numbers);
  for (const list of root.querySelectorAll("[data-toc-entries]")) {
    if (contentsMatch(list, entries)) continue;
    // As with PageNumber, the coordinator is the only owner of list contents.
    list.replaceChildren(...entries.map(entry => {
      const row = root.ownerDocument.createElement("li");
      row.className = "toc-entry";
      row.dataset.tocSection = entry.sectionId;
      const title = root.ownerDocument.createElement("span");
      title.className = "toc-title"; title.textContent = entry.title;
      const page = root.ownerDocument.createElement("span");
      page.className = "toc-number"; page.dataset.tocPage = ""; page.textContent = String(entry.page);
      row.append(title, page);
      return row;
    }));
  }
  return numbers;
}

export function bindPageLayout(root: HTMLElement, measure: () => void) {
  layouts.set(root, measure);
  const observer = new MutationObserver(() => synchronizePageNumbers(root));
  observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["data-page-section", "data-numbered", "data-section"] });
  synchronizePageNumbers(root);
  return () => { observer.disconnect(); layouts.delete(root); };
}

/** Called after fonts/images resolve. Commit current measurements, then number
 * that committed DOM before the exporter captures its page list or any clone. */
export function preparePageLayout(container: HTMLElement) {
  if (!container.isConnected) throw new Error("ตัวอย่างเปลี่ยนแล้ว กรุณาลองส่งออกอีกครั้ง");
  for (const root of container.querySelectorAll<HTMLElement>("[data-page-layout]")) {
    const measure = layouts.get(root);
    if (!measure) throw new Error("กำลังจัดหน้าตัวอย่าง กรุณาลองส่งออกอีกครั้ง");
    flushSync(measure);
    const numbers = synchronizePageNumbers(root);
    const pages = Array.from(root.querySelectorAll<HTMLElement>("[data-portfolio-page]"));
    if (numbers.some((number, index) => number.printed !== null &&
      pages[index].querySelector("[data-page-number]")?.textContent !== String(number.printed))) {
      throw new Error("จัดเลขหน้ายังไม่สำเร็จ กรุณาลองส่งออกอีกครั้ง");
    }
    const lists = Array.from(root.querySelectorAll("[data-toc-entries]"));
    const entries = currentContents(pages, numbers);
    if ((pages.some(page => page.dataset.pageSection === "toc") && lists.length !== 1) ||
      lists.some(list => !contentsMatch(list, entries))) {
      throw new Error("จัดสารบัญยังไม่สำเร็จ กรุณาลองส่งออกอีกครั้ง");
    }
  }
}
