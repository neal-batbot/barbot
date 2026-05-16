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
    const monthlyTab = page.getByRole('tab', { name: 'Monthly', exact: true });
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

    await expect(pricingSection.getByText('$5.9 / month')).toBeVisible();
    await expect(pricingSection.getByText('$13.9 / month')).toBeVisible();
  });

  test('should switch to Annually tab and show annual plans', async ({
    page,
  }) => {
    const annuallyTab = page.getByRole('tab', {
      name: 'Annually Save 17%',
    });
    await annuallyTab.click();

    const pricingSection = page.locator('section#pricing');

    await expect(
      pricingSection.getByRole('heading', { name: 'Starter' }).first()
    ).toBeVisible();

    await expect(
      pricingSection.getByRole('heading', { name: 'Pro' }).first()
    ).toBeVisible();

    await expect(pricingSection.getByText('$59 / year')).toBeVisible();
    await expect(pricingSection.getByText('$139 / year')).toBeVisible();
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
