import { test, expect } from '@playwright/test';

test.describe('Language Toggle (EN/ZH)', () => {
  test('should switch from English to Chinese on landing page', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Verify English hero title is visible
    const englishTitle = page.getByText('Industry Knowledge, Meet Agentic AI');
    await expect(englishTitle).toBeVisible({ timeout: 45000 });

    // Find and click the locale selector (Languages icon button in header)
    const localeButton = page.locator('header').locator('button').filter({
      has: page.locator('svg.lucide-languages'),
    });
    await expect(localeButton).toBeVisible();
    await localeButton.click();

    // Click on the Chinese option in the dropdown
    const chineseOption = page.getByRole('menuitem', { name: /中文/ });
    await expect(chineseOption).toBeVisible();
    await chineseOption.click();

    // Wait for navigation to /zh
    await page.waitForURL(/\/zh/, { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');

    // Verify Chinese hero title is now displayed
    const chineseTitle = page.getByText('行业知识，遇见 Agentic AI');
    await expect(chineseTitle).toBeVisible({ timeout: 30000 });

    // Verify CTA button changed to Chinese
    const chineseCta = page.locator('#hero').getByRole('link', {
      name: '立即开始',
    });
    await expect(chineseCta).toBeVisible();
  });

  test('should switch from Chinese to English on landing page', async ({
    page,
  }) => {
    await page.goto('/zh', { waitUntil: 'domcontentloaded' });

    // Verify Chinese hero title
    const chineseTitle = page.getByText('行业知识，遇见 Agentic AI');
    await expect(chineseTitle).toBeVisible({ timeout: 45000 });

    // Click locale selector
    const localeButton = page.locator('header').locator('button').filter({
      has: page.locator('svg.lucide-languages'),
    });
    await expect(localeButton).toBeVisible();
    await localeButton.click();

    // Click English option
    const englishOption = page.getByRole('menuitem', { name: /English/ });
    await expect(englishOption).toBeVisible();
    await englishOption.click();

    // Wait for navigation back to root (away from /zh)
    await page.waitForLoadState('domcontentloaded');

    // Verify English hero title
    const englishTitle = page.getByText('Industry Knowledge, Meet Agentic AI');
    await expect(englishTitle).toBeVisible({ timeout: 30000 });

    // Verify CTA changed to English
    const englishCta = page.locator('#hero').getByRole('link', {
      name: 'Get Started',
    });
    await expect(englishCta).toBeVisible();
  });
});
