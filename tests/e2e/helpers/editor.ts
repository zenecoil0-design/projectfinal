import type { Page } from '@playwright/test';

export async function openEditorSection(page: Page, section: string) {
  const header = page.locator(`#editor-heading-${section}`);
  if (await header.getAttribute('aria-expanded') !== 'true') await header.click();
}
