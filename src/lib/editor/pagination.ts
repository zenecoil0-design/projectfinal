/** Pack complete cards in order. Oversized cards stay intact and are flagged by export validation. */
export function packPages(heights: number[], available: number, gap = 24): number[][] {
  const pages: number[][] = [[]];
  let used = 0;
  heights.forEach((height, index) => {
    let page = pages[pages.length - 1];
    const extra = page.length ? gap : 0;
    if (page.length && used + extra + height > available) {
      pages.push([]);
      page = pages[pages.length - 1];
      used = 0;
    }
    used += (page.length ? gap : 0) + height;
    page.push(index);
  });
  return pages;
}
