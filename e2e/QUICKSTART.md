# E2E Testing Quick Start

## Setup (First Time)

```bash
# Install dependencies (includes Playwright)
npm install

# Install Playwright browsers
npx playwright install --with-deps
```

## Running Tests

### Quick Commands

```bash
# Run all tests (headless)
npm run test:e2e

# Run with UI (recommended for development)
npm run test:e2e:ui

# Run with browser visible
npm run test:e2e:headed

# Debug tests step-by-step
npm run test:e2e:debug
```

### Test Specific Browsers

```bash
# Chrome only
npm run test:e2e:chromium

# Firefox only
npm run test:e2e:firefox

# Safari (WebKit) only
npm run test:e2e:webkit

# Mobile devices
npm run test:e2e:mobile
```

### Run Specific Tests

```bash
# Single test file
npx playwright test e2e/home.spec.ts

# Single test by name
npx playwright test -g "should display hero section"

# Tests matching pattern
npx playwright test -g "wallet"
```

## Viewing Results

```bash
# Open HTML report
npm run test:e2e:report

# Or manually
npx playwright show-report
```

## Common Tasks

### Update Visual Snapshots

When you change the design:

```bash
npx playwright test visual.spec.ts --update-snapshots
```

### Run Tests in Specific Viewport

```bash
# Desktop
npx playwright test --project=chromium

# Mobile
npx playwright test --project='Mobile Chrome'
```

### Record New Tests

```bash
# Generate test code by interacting with the app
npx playwright codegen http://localhost:5173
```

### Trace Viewer (Debug Failed Tests)

```bash
# View trace of last test run
npx playwright show-trace test-results/.../trace.zip
```

## Writing Tests

### Basic Test Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/your-page');
  });

  test('should do something', async ({ page }) => {
    // Arrange
    const element = page.locator('.selector');

    // Act
    await element.click();

    // Assert
    await expect(element).toBeVisible();
  });
});
```

### Common Patterns

#### Test Navigation
```typescript
await page.goto('/protocol');
await expect(page).toHaveURL(/\/protocol/);
```

#### Test Form Input
```typescript
const input = page.locator('input[type="text"]');
await input.fill('test value');
await expect(input).toHaveValue('test value');
```

#### Test Button Click
```typescript
const button = page.getByRole('button', { name: /submit/i });
await button.click();
await expect(page.locator('.success')).toBeVisible();
```

#### Test Loading States
```typescript
await page.waitForTimeout(2000);
const loading = page.locator('.loading');
const hasLoading = await loading.isVisible().catch(() => false);
```

#### Test Conditional Elements
```typescript
const element = page.locator('.optional-element');
const isVisible = await element.isVisible().catch(() => false);

if (isVisible) {
  await expect(element).toContainText('Expected text');
}
```

## Debugging Tips

### 1. Use UI Mode (Best for Development)
```bash
npm run test:e2e:ui
```
- See tests run in real-time
- Explore DOM as test runs
- Time-travel through test steps

### 2. Use Debug Mode
```bash
npm run test:e2e:debug
```
- Opens Playwright Inspector
- Step through tests line by line
- Inspect page at any point

### 3. Add Pauses in Tests
```typescript
await page.pause(); // Stops execution, opens inspector
```

### 4. Take Screenshots
```typescript
await page.screenshot({ path: 'debug.png' });
await element.screenshot({ path: 'element.png' });
```

### 5. Console Logging
```typescript
// Log from test
console.log(await page.title());

// Capture browser console
page.on('console', msg => console.log(msg.text()));
```

### 6. Network Inspection
```typescript
// Log all requests
page.on('request', request => {
  console.log('>>', request.method(), request.url());
});

// Log responses
page.on('response', response => {
  console.log('<<', response.status(), response.url());
});
```

## Troubleshooting

### Tests Timeout
```typescript
// Increase timeout for specific assertion
await expect(element).toBeVisible({ timeout: 10000 });

// Wait for network to settle
await page.waitForLoadState('networkidle');
```

### Flaky Tests
```typescript
// Add explicit waits
await page.waitForTimeout(1000);

// Wait for specific condition
await page.waitForSelector('.element');

// Retry specific action
await expect(async () => {
  await element.click();
  await expect(result).toBeVisible();
}).toPass({ timeout: 5000 });
```

### Element Not Found
```typescript
// Check if element exists first
const element = page.locator('.selector');
if (await element.count() > 0) {
  await element.click();
}

// Use more specific selectors
const button = page.getByRole('button', { name: 'Exact Text' });
```

### Tests Pass Locally but Fail in CI
- Ensure dev server is running
- Check viewport sizes match
- Add more explicit waits
- Increase timeouts for slow CI

## Best Practices

1. **Use Semantic Locators**
   ```typescript
   ✅ page.getByRole('button', { name: /submit/i })
   ❌ page.locator('button:nth-child(3)')
   ```

2. **Test User Flows, Not Implementation**
   ```typescript
   ✅ await expect(page.locator('.success')).toBeVisible()
   ❌ await expect(component.state.isSuccess).toBe(true)
   ```

3. **Keep Tests Independent**
   - Each test should work standalone
   - Use `beforeEach` for setup
   - Don't rely on test order

4. **Handle Async Data Gracefully**
   ```typescript
   await page.waitForTimeout(2000);
   const hasData = await element.isVisible().catch(() => false);
   ```

5. **Use Page Object Pattern for Complex Pages**
   ```typescript
   class HomePage {
     constructor(page) {
       this.page = page;
       this.heroTitle = page.locator('h1');
     }

     async goto() {
       await this.page.goto('/');
     }
   }
   ```

## Continuous Integration

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests
- Manual trigger via GitHub Actions

View results in GitHub Actions tab.

## Resources

- [Playwright Docs](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
- [E2E Test Patterns](https://playwright.dev/docs/test-runners)

## Need Help?

1. Check [e2e/README.md](./README.md) for detailed documentation
2. Run tests in UI mode to inspect issues
3. Check existing test files for examples
4. Review Playwright documentation

Happy Testing! 🎭
