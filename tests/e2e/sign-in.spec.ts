import { test, expect } from '@playwright/test';

test.describe('Sign-In Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sign-in', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    // Wait for the sign-in card to render
    await expect(
      page.getByRole('heading', { name: 'Sign In', exact: true })
    ).toBeVisible({ timeout: 45000 });
  });

  test('should render sign-in form with email and password fields', async ({
    page,
  }) => {
    // Email input should be visible
    const emailInput = page.locator('input#email[type="email"]');
    await expect(emailInput).toBeVisible();

    // Password input should be visible
    const passwordInput = page.locator('input#password[type="password"]');
    await expect(passwordInput).toBeVisible();

    // Sign In submit button should be visible
    const submitButton = page.getByRole('button', {
      name: 'Sign In',
      exact: true,
    });
    await expect(submitButton).toBeVisible();
  });

  test('should show validation error when submitting with empty fields', async ({
    page,
  }) => {
    const submitButton = page.getByRole('button', {
      name: 'Sign In',
      exact: true,
    });

    // Click submit with empty fields
    await submitButton.click();

    // Should show toast error "email and password are required"
    // Sonner toast renders in a <li> inside an <ol> with [data-sonner-toaster]
    const toastMessage = page.getByText('email and password are required');
    await expect(toastMessage).toBeVisible({ timeout: 10000 });
  });

  test('should have a link to sign up page', async ({ page }) => {
    // "Sign Up" link should be visible
    const signUpLink = page.getByRole('link', { name: /Sign Up/i });
    await expect(signUpLink).toBeVisible();
    await expect(signUpLink).toHaveAttribute('href', /\/sign-up/);
  });

  test('should show description text below title', async ({ page }) => {
    const description = page.getByText('Sign in to your account');
    await expect(description).toBeVisible();
  });
});
