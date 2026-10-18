export const numberedSections = new Set(["profile", "education", "activity", "certificate"]);

/** Input is actual document order, never component mount order or Accordion steps. */
export function documentPageNumbers(pages: readonly { sectionId: string; numbered: boolean }[]) {
  let printed = 0;
  return pages.map((page, index) => ({
    sectionId: page.sectionId,
    physical: index + 1,
    printed: page.numbered ? ++printed : null,
  }));
}

/** Section-level TOC reuses the printed numbers, never physical offsets. */
export function documentContents(pages: readonly { sectionId: string; printed: number | null }[], titles: Readonly<Record<string, string>>) {
  const seen = new Set<string>();
  return pages.flatMap(page => {
    if (page.printed === null || seen.has(page.sectionId)) return [];
    seen.add(page.sectionId);
    return [{ sectionId: page.sectionId, title: titles[page.sectionId] ?? page.sectionId, page: page.printed }];
  });
}
