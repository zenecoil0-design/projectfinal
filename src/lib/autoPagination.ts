export function packItemsByHeight<T>(
  items: T[],
  getItemHeight: (item: T) => number,
  pageCapacity: number,
  gap = 20
): T[][] {
  if (items.length === 0) {
    return [[]];
  }

  const pages: T[][] = [];
  let currentPage: T[] = [];
  let usedHeight = 0;

  for (const item of items) {
    const itemHeight = Math.min(
      Math.max(getItemHeight(item), 1),
      pageCapacity
    );

    const nextHeight =
      currentPage.length === 0
        ? itemHeight
        : usedHeight + gap + itemHeight;

    if (currentPage.length > 0 && nextHeight > pageCapacity) {
      pages.push(currentPage);
      currentPage = [item];
      usedHeight = itemHeight;
      continue;
    }

    currentPage.push(item);
    usedHeight = nextHeight;
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages;
}
