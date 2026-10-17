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
