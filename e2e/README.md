# IDLHub E2E Tests

Comprehensive end-to-end tests for the IDLHub web application using Playwright.

## Overview

This test suite covers:
- **Core Pages**: Home, Registry, Protocol, Battles, Guilds, Docs, Tokenomics, Status
- **Navigation**: Cross-page navigation, browser history, mobile navigation
- **Wallet Integration**: Connect/disconnect flows, protected features
- **Accessibility**: WCAG compliance, keyboard navigation, screen readers
- **Responsive Design**: Desktop, tablet, and mobile viewports

## Test Files

- `home.spec.ts` - Homepage functionality and hero section
- `registry.spec.ts` - IDL registry, search, and filtering
- `protocol.spec.ts` - Prediction markets and betting interface
- `battles.spec.ts` - 1v1 battles creation and management
- `navigation.spec.ts` - Cross-page navigation and routing
- `wallet.spec.ts` - Wallet connection and state management
- `accessibility.spec.ts` - WCAG compliance and a11y features

## Running Tests

### Run all tests
```bash
npm run test:e2e
```

### Run tests in UI mode (interactive)
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

### Run specific browser
```bash
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit
```

### Run mobile tests only
```bash
npm run test:e2e:mobile
```

### View test report
```bash
npm run test:e2e:report
```

### Run specific test file
```bash
npx playwright test e2e/home.spec.ts
```

### Run specific test by name
```bash
npx playwright test -g "should display hero section"
```

## Configuration

Test configuration is in `playwright.config.ts`:

- **Base URL**: `http://localhost:5173` (auto-starts dev server)
- **Browsers**: Chromium, Firefox, WebKit
- **Mobile**: Pixel 5, iPhone 12
- **Retries**: 2 on CI, 0 locally
- **Reporters**: HTML, List, JSON

### Environment Variables

Set `BASE_URL` to test against a different server:

```bash
BASE_URL=https://idlhub.com npm run test:e2e
```

## Test Structure

### Page Object Pattern

Tests use direct selectors for simplicity, but can be refactored to use Page Objects if needed.

### Test Organization

```typescript
test.describe('Feature Group', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/path');
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

### Best Practices

1. **Isolation**: Each test is independent and can run in any order
2. **Resilience**: Tests handle loading states and async data gracefully
3. **Conditional Logic**: Tests adapt to different app states (wallet connected/disconnected)
4. **Mobile-First**: Responsive design is tested across viewports
5. **Accessibility**: All tests verify a11y compliance

## Writing New Tests

### Example: Testing a new page

```typescript
import { test, expect } from '@playwright/test';

test.describe('NewPage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/new-page');
  });

  test('should display page title', async ({ page }) => {
    await expect(page.locator('.page-title')).toHaveText('New Page');
  });

  test('should handle user interaction', async ({ page }) => {
    const button = page.locator('.action-button');
    await button.click();

    await expect(page.locator('.result')).toBeVisible();
  });
});
```

### Testing async data

```typescript
test('should load data from API', async ({ page }) => {
  await page.goto('/data-page');

  // Wait for loading to complete
  await page.waitForTimeout(2000);

  // Check for one of the possible states
  const loading = page.locator('.loading');
  const data = page.locator('.data-grid');
  const empty = page.locator('.empty-state');

  const hasData = await data.isVisible().catch(() => false);
  const isEmpty = await empty.isVisible().catch(() => false);

  // Should show either data or empty state (not loading)
  expect(hasData || isEmpty).toBe(true);
});
```

### Testing wallet-dependent features

```typescript
test('should show protected feature when wallet connected', async ({ page }) => {
  await page.goto('/protected');

  const connectPrompt = page.locator('.connect-prompt');
  const feature = page.locator('.protected-feature');

  const isConnected = await feature.isVisible().catch(() => false);
  const needsConnection = await connectPrompt.isVisible().catch(() => false);

  // Should show one or the other
  expect(isConnected !== needsConnection).toBe(true);
});
```

## Debugging Tests

### Visual debugging
```bash
npm run test:e2e:headed
```

### Step-through debugging
```bash
npm run test:e2e:debug
```

### Generate screenshots on failure
Screenshots are automatically captured on test failure in `test-results/`

### View trace files
```bash
npx playwright show-trace test-results/trace.zip
```

## CI/CD Integration

Tests run automatically on CI with:
- 2 retries for flaky tests
- Parallel execution disabled (workers: 1)
- Screenshots and videos on failure
- HTML and JSON reports

### GitHub Actions Example

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npm run test:e2e
  env:
    CI: true

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Coverage

### Pages Tested
- ✅ HomePage
- ✅ RegistryPage
- ✅ ProtocolPage
- ✅ BattlesPage
- ✅ GuildsPage (via navigation)
- ✅ DocsPage (via navigation)
- ✅ TokenomicsPage (via navigation)
- ✅ StatusPage (via navigation)

### Features Tested
- ✅ Navigation between pages
- ✅ Search and filtering
- ✅ Wallet connection states
- ✅ Form inputs and validation
- ✅ Loading states
- ✅ Error handling
- ✅ Responsive design
- ✅ Accessibility (WCAG)
- ✅ Keyboard navigation

## Troubleshooting

### Tests fail with "page.goto: Timeout"
- Ensure dev server is running: `npm run dev`
- Check if port 5173 is available
- Increase timeout in `playwright.config.ts`

### Tests are flaky
- Add explicit waits: `await page.waitForTimeout(1000)`
- Use `waitForLoadState`: `await page.waitForLoadState('networkidle')`
- Increase retries in config

### Wallet tests not working
- Tests handle both connected and disconnected states
- Mock wallet is not implemented (tests check UI states only)

### Mobile tests failing
- Check viewport sizes in config
- Verify responsive CSS is working
- Test manually with device emulation in browser

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
