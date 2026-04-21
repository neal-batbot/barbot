import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // Wait for the hero section to appear, confirming the page has rendered
    await expect(page.locator('#hero')).toBeVisible({ timeout: 45000 });
  });

  test('should load and display hero section with title, description, and CTA buttons', async ({
    page,
  }) => {
    const heroSection = page.locator('#hero');

    // Hero title should be visible
    const heroTitle = heroSection.getByText(
      'Industry Knowledge, Meet Agentic AI'
    );
    await expect(heroTitle).toBeVisible();

    // Hero description text should be present
    const heroDescription = heroSection.getByText(
      'composable agent platform',
      { exact: false }
    );
    await expect(heroDescription).toBeVisible();

    // CTA buttons within the hero section
    const getStartedButton = heroSection.getByRole('link', {
      name: 'Get Started',
    });
    await expect(getStartedButton).toBeVisible();

    const seeDocsButton = heroSection.getByRole('link', {
      name: 'See the Docs',
    });
    await expect(seeDocsButton).toBeVisible();

    // Get Started should link to pricing
    await expect(getStartedButton).toHaveAttribute('href', /\/pricing/);
  });

  test('should display navigation with Pricing link', async ({ page }) => {
    // The header is position:fixed and may be reported as "hidden" by Playwright
    // because its outer element has no intrinsic height. Use the inner container
    // div instead, and look for the Pricing link within it.
    const pricingLink = page.locator('header').getByRole('link', {
      name: 'Pricing',
    });
    await expect(pricingLink).toBeVisible({ timeout: 15000 });
    await expect(pricingLink).toHaveAttribute('href', /\/pricing/);
  });

  test('should display BatBot brand name in header', async ({ page }) => {
    // Look for the brand text within the header element
    const brandText = page.locator('header').getByText('BatBot');
    await expect(brandText.first()).toBeVisible({ timeout: 15000 });
  });
});
