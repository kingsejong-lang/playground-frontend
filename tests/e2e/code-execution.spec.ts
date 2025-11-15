import { test, expect } from '@playwright/test';

test.describe('Code Execution', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the playground
    await page.goto('/');
  });

  test('should load the playground page', async ({ page }) => {
    // Check that the page title is correct
    await expect(page).toHaveTitle(/Playground/i);

    // Check for essential UI elements
    await expect(page.getByRole('button', { name: /run/i })).toBeVisible();
  });

  test('should execute simple code and display output', async ({ page }) => {
    // Wait for Monaco editor to load
    await page.waitForSelector('.monaco-editor', { timeout: 10000 });

    // Type code into the editor
    const editorTextarea = page.locator('.monaco-editor textarea').first();
    await editorTextarea.click();
    await editorTextarea.fill('print("Hello, Playwright!")');

    // Click the run button
    await page.getByRole('button', { name: /run/i }).click();

    // Wait for output to appear
    await page.waitForSelector('[data-testid="output-panel"]', { timeout: 5000 });

    // Check that output contains the expected text
    const output = page.locator('[data-testid="output-panel"]');
    await expect(output).toContainText('Hello, Playwright!');
  });

  test('should display compilation errors', async ({ page }) => {
    // Wait for Monaco editor to load
    await page.waitForSelector('.monaco-editor', { timeout: 10000 });

    // Type invalid code
    const editorTextarea = page.locator('.monaco-editor textarea').first();
    await editorTextarea.click();
    await editorTextarea.fill('this is invalid syntax !!!');

    // Click the run button
    await page.getByRole('button', { name: /run/i }).click();

    // Wait for error to appear
    await page.waitForSelector('[data-testid="output-panel"]', { timeout: 5000 });

    // Check that output contains error indication
    const output = page.locator('[data-testid="output-panel"]');
    await expect(output).toContainText(/error|failed/i);
  });

  test('should clear output when running new code', async ({ page }) => {
    // Wait for Monaco editor to load
    await page.waitForSelector('.monaco-editor', { timeout: 10000 });

    // First execution
    const editorTextarea = page.locator('.monaco-editor textarea').first();
    await editorTextarea.click();
    await editorTextarea.fill('print("First run")');
    await page.getByRole('button', { name: /run/i }).click();

    // Wait for first output
    await page.waitForSelector('[data-testid="output-panel"]', { timeout: 5000 });
    let output = page.locator('[data-testid="output-panel"]');
    await expect(output).toContainText('First run');

    // Second execution
    await editorTextarea.click();
    await editorTextarea.fill('print("Second run")');
    await page.getByRole('button', { name: /run/i }).click();

    // Wait for output to update
    await page.waitForTimeout(1000);
    output = page.locator('[data-testid="output-panel"]');

    // Should only show second output
    await expect(output).toContainText('Second run');
  });

  test('should select different languages', async ({ page }) => {
    // Find language selector
    const languageSelector = page.locator('[data-testid="language-selector"]');
    await expect(languageSelector).toBeVisible();

    // Click to open dropdown
    await languageSelector.click();

    // Select a language (e.g., Python)
    await page.getByRole('option', { name: /python/i }).click();

    // Verify language is selected
    await expect(languageSelector).toContainText(/python/i);
  });

  test('should handle execution timeout', async ({ page }) => {
    // Wait for Monaco editor to load
    await page.waitForSelector('.monaco-editor', { timeout: 10000 });

    // Type code that will timeout (infinite loop)
    const editorTextarea = page.locator('.monaco-editor textarea').first();
    await editorTextarea.click();
    await editorTextarea.fill('while True:\n    pass');

    // Click the run button
    await page.getByRole('button', { name: /run/i }).click();

    // Wait for timeout error
    await page.waitForSelector('[data-testid="output-panel"]', { timeout: 15000 });

    // Check that output contains timeout indication
    const output = page.locator('[data-testid="output-panel"]');
    await expect(output).toContainText(/timeout/i);
  });

  test('should display execution metrics', async ({ page }) => {
    // Wait for Monaco editor to load
    await page.waitForSelector('.monaco-editor', { timeout: 10000 });

    // Execute simple code
    const editorTextarea = page.locator('.monaco-editor textarea').first();
    await editorTextarea.click();
    await editorTextarea.fill('print("Testing metrics")');
    await page.getByRole('button', { name: /run/i }).click();

    // Wait for metrics panel
    await page.waitForSelector('[data-testid="metrics-panel"]', { timeout: 5000 });

    // Check that metrics are displayed
    const metrics = page.locator('[data-testid="metrics-panel"]');
    await expect(metrics).toContainText(/time|memory/i);
  });
});
