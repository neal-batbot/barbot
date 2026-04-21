import { test, expect } from '@playwright/test';

test.describe('Pricing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
    // Wait for the pricing section to render (SSR may be slow on first request)
    await expect(page.locator('section#pricing')).toBeVisible({
      timeout: 45000,
    });
  });

  test('should display pricing title and description', async ({ page }) => {
    const title = page.getByText('Simple, Transparent Pricing');
    await expect(title).toBeVisible();

    const description = page.getByText('Token usage bundled', {
      exact: false,
    });
    await expect(description).toBeVisible();
  });

  test('should display three pricing tabs: Monthly, Annually, Enterprise', async ({
    page,
  }) => {
    const tabsList = page.getByRole('tablist');
    await expect(tabsList).toBeVisible();

    await expect(
      page.getByRole('tab', { name: 'Monthly' })
    ).toBeVisible();
    await expect(
      page.getByRole('tab', { name: 'Annually' })
    ).toBeVisible();
    await expect(
      page.getByRole('tab', { name: 'Enterprise' })
    ).toBeVisible();
  });

  test('Monthly tab should show Starter and Pro plans with correct prices', async ({
    page,
  }) => {
    // Monthly tab should be active by default (featured)
    const monthlyTab = page.getByRole('tab', { name: 'Monthly' });
    await monthlyTab.click();

    const pricingSection = page.locator('section#pricing');

    // Starter plan should be visible
    await expect(
      pricingSection.getByRole('heading', { name: 'Starter' }).first()
    ).toBeVisible();

    // Pro plan should be visible
    await expect(
      pricingSection.getByRole('heading', { name: 'Pro' }).first()
    ).toBeVisible();

    // Prices should contain expected values (either USD or CNY)
    const priceTexts = await pricingSection
      .locator('.text-primary')
      .allTextContents();
    const priceString = priceTexts.join(' ');

    // USD: $5.9 / $13.9, CNY: 39.9 / 99
    const hasExpectedPrices =
      (priceString.includes('$5.9') && priceString.includes('$13.9')) ||
      (priceString.includes('39.9') && priceString.includes('99'));

    expect(hasExpectedPrices).toBeTruthy();
  });

  test('should switch to Annually tab and show annual plans', async ({
    page,
  }) => {
    const annuallyTab = page.getByRole('tab', { name: 'Annually' });
    await annuallyTab.click();

    // Wait for tab content to update
    await page.waitForTimeout(500);

    const pricingSection = page.locator('section#pricing');

    await expect(
      pricingSection.getByRole('heading', { name: 'Starter' }).first()
    ).toBeVisible();

    await expect(
      pricingSection.getByRole('heading', { name: 'Pro' }).first()
    ).toBeVisible();

    // Annual prices (USD: $59/$139, CNY: 399/999)
    const priceTexts = await pricingSection
      .locator('.text-primary')
      .allTextContents();
    const priceString = priceTexts.join(' ');

    const hasExpectedPrices =
      (priceString.includes('$59') && priceString.includes('$139')) ||
      (priceString.includes('399') && priceString.includes('999'));

    expect(hasExpectedPrices).toBeTruthy();
  });

  test('should switch to Enterprise tab and show Contact Us / Book a Demo', async ({
    page,
  }) => {
    const enterpriseTab = page.getByRole('tab', { name: 'Enterprise' });
    await enterpriseTab.click();

    // Wait for tab content to update
    await page.waitForTimeout(1000);

    const pricingSection = page.locator('section#pricing');

    // Team plan heading
    await expect(
      pricingSection.getByRole('heading', { name: 'Team' }).first()
    ).toBeVisible({ timeout: 10000 });

    // Enterprise plan heading
    await expect(
      pricingSection.getByRole('heading', { name: 'Enterprise' }).first()
    ).toBeVisible();

    // Should show "Contact Us" or "Book a Demo" button text
    const hasContactButton = await pricingSection
      .getByRole('button', { name: /Contact Us/i })
      .first()
      .isVisible()
      .catch(() => false);
    const hasDemoButton = await pricingSection
      .getByRole('button', { name: /Book a Demo/i })
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasContactButton || hasDemoButton).toBeTruthy();
  });

  test('Annually tab should display "Save 17%" badge', async ({ page }) => {
    const saveBadge = page.getByText('Save 17%');
    await expect(saveBadge).toBeVisible();
  });
});
