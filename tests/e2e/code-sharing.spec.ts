import { test, expect } from '@playwright/test';

test.describe('Code Sharing', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the playground
    await page.goto('/');
  });

  test('should have a share button', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('.monaco-editor', { timeout: 10000 });

    // Check for share button
    const shareButton = page.getByRole('button', { name: /share/i });
    await expect(shareButton).toBeVisible();
  });

  test('should create a shareable link', async ({ page }) => {
    // Wait for Monaco editor to load
    await page.waitForSelector('.monaco-editor', { timeout: 10000 });

    // Type some code
    const editorTextarea = page.locator('.monaco-editor textarea').first();
    await editorTextarea.click();
    await editorTextarea.fill('print("This is shared code")');

    // Click share button
    await page.getByRole('button', { name: /share/i }).click();

    // Wait for share dialog
    await page.waitForSelector('[data-testid="share-dialog"]', { timeout: 5000 });

    // Should show shareable link
    const shareLink = page.locator('[data-testid="share-link"]');
    await expect(shareLink).toBeVisible();

    // Get the share link value
    const linkValue = await shareLink.inputValue();
    expect(linkValue).toMatch(/\/share\/[a-zA-Z0-9]+/);
  });

  test('should copy share link to clipboard', async ({ page }) => {
    // Wait for Monaco editor to load
    await page.waitForSelector('.monaco-editor', { timeout: 10000 });

    // Type some code
    const editorTextarea = page.locator('.monaco-editor textarea').first();
    await editorTextarea.click();
    await editorTextarea.fill('print("Copy test")');

    // Click share button
    await page.getByRole('button', { name: /share/i }).click();

    // Wait for share dialog
    await page.waitForSelector('[data-testid="share-dialog"]', { timeout: 5000 });

    // Click copy button
    await page.getByRole('button', { name: /copy/i }).click();

    // Should show success message
    await expect(page.getByText(/copied|success/i)).toBeVisible();
  });

  test('should set expiration time for shared code', async ({ page }) => {
    // Wait for Monaco editor to load
    await page.waitForSelector('.monaco-editor', { timeout: 10000 });

    // Type some code
    const editorTextarea = page.locator('.monaco-editor textarea').first();
    await editorTextarea.click();
    await editorTextarea.fill('print("Expiring share")');

    // Click share button
    await page.getByRole('button', { name: /share/i }).click();

    // Wait for share dialog
    await page.waitForSelector('[data-testid="share-dialog"]', { timeout: 5000 });

    // Select expiration time
    const expirationSelect = page.locator('[data-testid="expiration-select"]');
    await expirationSelect.click();
    await page.getByRole('option', { name: /1 day/i }).click();

    // Create share
    await page.getByRole('button', { name: /create share|generate/i }).click();

    // Should show shareable link
    const shareLink = page.locator('[data-testid="share-link"]');
    await expect(shareLink).toBeVisible();
  });

  test('should load shared code from URL', async ({ page, context }) => {
    // First create a share
    await page.waitForSelector('.monaco-editor', { timeout: 10000 });
    const editorTextarea = page.locator('.monaco-editor textarea').first();
    await editorTextarea.click();
    await editorTextarea.fill('print("Loaded from share")');

    // Click share button
    await page.getByRole('button', { name: /share/i }).click();
    await page.waitForSelector('[data-testid="share-dialog"]', { timeout: 5000 });

    // Get the share link
    const shareLink = page.locator('[data-testid="share-link"]');
    const linkValue = await shareLink.inputValue();

    // Extract share ID from link
    const shareId = linkValue.split('/share/')[1];

    // Open share in new page
    const newPage = await context.newPage();
    await newPage.goto(`/share/${shareId}`);

    // Wait for Monaco editor to load
    await newPage.waitForSelector('.monaco-editor', { timeout: 10000 });

    // Verify code is loaded
    const loadedCode = await newPage.locator('[data-testid="editor-content"]').textContent();
    expect(loadedCode).toContain('Loaded from share');
  });

  test('should show error for invalid share ID', async ({ page }) => {
    // Try to access invalid share
    await page.goto('/share/invalid-share-id-123');

    // Should show error message
    await expect(page.getByText(/not found|invalid share/i)).toBeVisible();
  });

  test('should show error for expired share', async ({ page }) => {
    // This test would require a share that's actually expired
    // For now, we can test the UI flow
    await page.goto('/share/expired-share-id');

    // Should show expiration message
    await expect(page.getByText(/expired|no longer available/i)).toBeVisible();
  });

  test('should allow creating multiple shares', async ({ page }) => {
    // Wait for Monaco editor to load
    await page.waitForSelector('.monaco-editor', { timeout: 10000 });

    const shares: string[] = [];

    // Create first share
    let editorTextarea = page.locator('.monaco-editor textarea').first();
    await editorTextarea.click();
    await editorTextarea.fill('print("Share 1")');
    await page.getByRole('button', { name: /share/i }).click();
    await page.waitForSelector('[data-testid="share-dialog"]', { timeout: 5000 });
    let shareLink = page.locator('[data-testid="share-link"]');
    shares.push(await shareLink.inputValue());
    await page.getByRole('button', { name: /close|cancel/i }).click();

    // Create second share
    await editorTextarea.click();
    await editorTextarea.fill('print("Share 2")');
    await page.getByRole('button', { name: /share/i }).click();
    await page.waitForSelector('[data-testid="share-dialog"]', { timeout: 5000 });
    shareLink = page.locator('[data-testid="share-link"]');
    shares.push(await shareLink.inputValue());

    // Verify different share IDs
    expect(shares[0]).not.toBe(shares[1]);
  });

  test('should preserve code formatting in shared code', async ({ page, context }) => {
    // Wait for Monaco editor to load
    await page.waitForSelector('.monaco-editor', { timeout: 10000 });

    // Type code with specific formatting
    const originalCode = `def hello():
    print("Hello")
    print("World")

hello()`;

    const editorTextarea = page.locator('.monaco-editor textarea').first();
    await editorTextarea.click();
    await editorTextarea.fill(originalCode);

    // Create share
    await page.getByRole('button', { name: /share/i }).click();
    await page.waitForSelector('[data-testid="share-dialog"]', { timeout: 5000 });
    const shareLink = page.locator('[data-testid="share-link"]');
    const linkValue = await shareLink.inputValue();
    const shareId = linkValue.split('/share/')[1];

    // Load in new page
    const newPage = await context.newPage();
    await newPage.goto(`/share/${shareId}`);
    await newPage.waitForSelector('.monaco-editor', { timeout: 10000 });

    // Verify formatting is preserved
    const loadedCode = await newPage.locator('[data-testid="editor-content"]').textContent();
    expect(loadedCode).toBe(originalCode);
  });
});
