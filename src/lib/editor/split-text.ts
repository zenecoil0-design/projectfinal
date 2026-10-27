/** Preserve all source characters and split only between complete graphemes. */
export function splitText(text: string, fits: (text: string) => boolean): string[] {
  const units = Array.from(new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(text), x => x.segment);
  const pages: string[] = [];
  let start = 0;
  while (start < units.length) {
    let low = 1, high = units.length - start, best = 0;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (fits(units.slice(start, start + mid).join(''))) { best = mid; low = mid + 1; }
      else high = mid - 1;
    }
    if (!best) { pages.push(units.slice(start).join('')); break; }
    pages.push(units.slice(start, start + best).join('')); start += best;
  }
  return pages.length ? pages : [''];
}
