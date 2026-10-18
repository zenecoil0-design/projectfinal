import { expect, type Page } from '@playwright/test';

export async function expectCurrentContents(page: Page) {
  await expect.poll(() => page.locator('main').evaluate(main => {
    const pages = Array.from(main.querySelectorAll<HTMLElement>('[data-portfolio-page]'));
    const first = pages.filter((paper, index) => paper.dataset.numbered === 'true' && !pages.slice(0, index).some(previous => previous.dataset.pageSection === paper.dataset.pageSection));
    const rows = Array.from(main.querySelectorAll<HTMLElement>('[data-toc-section]'));
    return rows.length === first.length && rows.every((row, index) => row.dataset.tocSection === first[index].dataset.pageSection && row.querySelector('.toc-title')?.textContent === first[index].dataset.section && row.querySelector('[data-toc-page]')?.textContent === first[index].querySelector('[data-page-number]')?.textContent);
  })).toBe(true);
}
