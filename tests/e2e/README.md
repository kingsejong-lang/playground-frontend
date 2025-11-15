# E2E Tests

Playwright-based end-to-end tests for the Playground frontend.

## Setup

Install Playwright browsers:

```bash
npx playwright install
```

## Running Tests

### Run all tests (headless mode)
```bash
npm run test:e2e
```

### Run tests with UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Debug tests
```bash
npm run test:e2e:debug
```

### View test report
```bash
npm run test:e2e:report
```

## Test Structure

- **code-execution.spec.ts**: Tests for code execution functionality
  - Loading playground page
  - Executing code and displaying output
  - Compilation errors
  - Language selection
  - Execution timeout
  - Metrics display

- **authentication.spec.ts**: Tests for user authentication
  - Login/logout flows
  - Registration
  - Session persistence
  - Protected routes

- **code-sharing.spec.ts**: Tests for code sharing features
  - Creating shareable links
  - Loading shared code
  - Expiration handling
  - Code formatting preservation

## Writing Tests

Tests use Playwright's test framework. Key concepts:

```typescript
import { test, expect } from '@playwright/test';

test('test description', async ({ page }) => {
  // Navigate
  await page.goto('/');

  // Interact
  await page.getByRole('button', { name: /run/i }).click();

  // Assert
  await expect(page.getByText('output')).toBeVisible();
});
```

## Test Selectors

Use data-testid attributes for stable selectors:

```typescript
// In component
<div data-testid="output-panel">...</div>

// In test
page.locator('[data-testid="output-panel"]')
```

## CI/CD Integration

Tests run automatically on CI with:
- Single worker (no parallelization)
- 2 retries on failure
- HTML and list reporters
- Screenshots on failure
- Videos on failure

## Configuration

See `playwright.config.ts` for:
- Test directory location
- Browser configurations
- Timeouts and retries
- Reporter settings
- Web server setup
