import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'Test123!@#',
    username: 'testuser',
  };

  test('should display login page', async ({ page }) => {
    await page.goto('/auth/login');

    // Check for login form elements
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in|login/i })).toBeVisible();
  });

  test('should show validation errors for invalid login', async ({ page }) => {
    await page.goto('/auth/login');

    // Try to submit without filling fields
    await page.getByRole('button', { name: /sign in|login/i }).click();

    // Should show validation errors
    await expect(page.getByText(/required|enter email/i)).toBeVisible();
  });

  test('should register a new user', async ({ page }) => {
    await page.goto('/auth/register');

    // Fill registration form
    await page.getByLabel(/email/i).fill(testUser.email);
    await page.getByLabel(/username/i).fill(testUser.username);
    await page.getByLabel(/^password$/i).fill(testUser.password);
    await page.getByLabel(/confirm password/i).fill(testUser.password);

    // Submit form
    await page.getByRole('button', { name: /sign up|register/i }).click();

    // Should redirect to playground or show success message
    await expect(page).toHaveURL(/\/(?:auth\/login)?/, { timeout: 5000 });
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/auth/login');

    // Fill login form
    await page.getByLabel(/email/i).fill(testUser.email);
    await page.getByLabel(/password/i).fill(testUser.password);

    // Submit form
    await page.getByRole('button', { name: /sign in|login/i }).click();

    // Should redirect to playground
    await expect(page).toHaveURL('/', { timeout: 5000 });

    // Should show user menu or profile indicator
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/auth/login');

    // Fill with invalid credentials
    await page.getByLabel(/email/i).fill('wrong@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');

    // Submit form
    await page.getByRole('button', { name: /sign in|login/i }).click();

    // Should show error message
    await expect(page.getByText(/invalid credentials|login failed/i)).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // First login
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill(testUser.email);
    await page.getByLabel(/password/i).fill(testUser.password);
    await page.getByRole('button', { name: /sign in|login/i }).click();

    // Wait for redirect
    await expect(page).toHaveURL('/', { timeout: 5000 });

    // Open user menu
    await page.locator('[data-testid="user-menu"]').click();

    // Click logout
    await page.getByRole('menuitem', { name: /logout|sign out/i }).click();

    // Should redirect to login or home
    await expect(page).toHaveURL(/\/(?:auth\/login)?/, { timeout: 5000 });
  });

  test('should require authentication for protected routes', async ({ page }) => {
    // Try to access a protected route without authentication
    await page.goto('/settings');

    // Should redirect to login
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 5000 });
  });

  test('should persist authentication across page reloads', async ({ page }) => {
    // Login
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill(testUser.email);
    await page.getByLabel(/password/i).fill(testUser.password);
    await page.getByRole('button', { name: /sign in|login/i }).click();

    // Wait for redirect
    await expect(page).toHaveURL('/', { timeout: 5000 });

    // Reload the page
    await page.reload();

    // Should still be authenticated
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should navigate between login and register', async ({ page }) => {
    await page.goto('/auth/login');

    // Click link to register
    await page.getByRole('link', { name: /sign up|register/i }).click();

    // Should navigate to register page
    await expect(page).toHaveURL(/\/auth\/register/, { timeout: 5000 });

    // Click link back to login
    await page.getByRole('link', { name: /sign in|login/i }).click();

    // Should navigate back to login page
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 5000 });
  });
});
