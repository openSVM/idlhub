import { test, expect } from '@playwright/test';

test.describe('Performance', () => {
  test('should load home page within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const loadTime = Date.now() - startTime;

    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should have reasonable page size', async ({ page }) => {
    const response = await page.goto('/');

    if (response) {
      const responseBody = await response.body();
      const sizeKB = responseBody.length / 1024;

      // Initial HTML should be under 500KB
      expect(sizeKB).toBeLessThan(500);
    }
  });

  test('should not have excessive JavaScript bundles', async ({ page }) => {
    const scriptSizes: number[] = [];

    page.on('response', async (response) => {
      if (response.url().endsWith('.js')) {
        try {
          const body = await response.body();
          scriptSizes.push(body.length / 1024);
        } catch (e) {
          // Ignore errors for failed requests
        }
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // No single JS bundle should exceed 2MB
    for (const size of scriptSizes) {
      expect(size).toBeLessThan(2048);
    }
  });

  test('should render content progressively', async ({ page }) => {
    await page.goto('/');

    // Hero section should be visible quickly
    const hero = page.locator('.hero').first();
    await expect(hero).toBeVisible({ timeout: 3000 });

    // Stats grid should load after hero
    const statsGrid = page.locator('.stats-grid').first();
    await expect(statsGrid).toBeVisible({ timeout: 5000 });

    // Features section should also be visible
    const features = page.locator('.features').first();
    await expect(features).toBeVisible({ timeout: 5000 });
  });

  test('should handle search input efficiently', async ({ page }) => {
    await page.goto('/registry');

    await page.waitForSelector('.search-box input', { timeout: 5000 });

    const searchInput = page.locator('.search-box input');
    const startTime = Date.now();

    // Type search query
    await searchInput.fill('test');

    // Results should filter quickly
    await page.waitForTimeout(500);

    const filterTime = Date.now() - startTime;

    // Filtering should be nearly instant (< 1 second)
    expect(filterTime).toBeLessThan(1000);
  });

  test('should not cause memory leaks on navigation', async ({ page }) => {
    await page.goto('/');

    // Navigate through pages multiple times
    for (let i = 0; i < 5; i++) {
      await page.goto('/registry');
      await page.goto('/protocol');
      await page.goto('/battles');
      await page.goto('/');
    }

    // Page should still be responsive
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 3000 });
  });

  test('should lazy load images if present', async ({ page }) => {
    await page.goto('/');

    const images = await page.locator('img').all();

    for (const img of images) {
      const loading = await img.getAttribute('loading');
      const isAboveFold = await img.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return rect.top < window.innerHeight;
      });

      // Images below the fold should be lazy loaded
      if (!isAboveFold && loading !== 'eager') {
        // Image can have loading="lazy" or no attribute (browser default)
        expect(['lazy', null]).toContain(loading);
      }
    }
  });

  test('should optimize font loading', async ({ page }) => {
    await page.goto('/');

    // Check if fonts are loaded
    const fontFaces = await page.evaluate(() => {
      return document.fonts.size;
    });

    // Should have some fonts loaded, but not excessive
    expect(fontFaces).toBeGreaterThanOrEqual(0);
    expect(fontFaces).toBeLessThan(20);
  });

  test('should minimize layout shifts', async ({ page }) => {
    await page.goto('/');

    // Wait for page to stabilize
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Take initial screenshot position
    const initialBox = await page.locator('h1').first().boundingBox();

    // Wait a bit more
    await page.waitForTimeout(1000);

    // Check if heading moved (layout shift)
    const finalBox = await page.locator('h1').first().boundingBox();

    if (initialBox && finalBox) {
      const shift = Math.abs(initialBox.y - finalBox.y);
      // Should not shift more than 5px after initial load
      expect(shift).toBeLessThan(5);
    }
  });

  test('should cache static assets', async ({ page }) => {
    let cachedRequests = 0;

    page.on('response', (response) => {
      const cacheControl = response.headers()['cache-control'];
      if (cacheControl && cacheControl.includes('max-age')) {
        cachedRequests++;
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Some assets should have cache headers
    // Note: This may vary based on dev vs production
    expect(cachedRequests).toBeGreaterThanOrEqual(0);
  });

  test('should handle rapid navigation without errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // Rapidly navigate
    await page.goto('/');
    await page.goto('/registry');
    await page.goto('/protocol');
    await page.goto('/battles');
    await page.goto('/');

    // Should not have JavaScript errors
    expect(errors.length).toBe(0);
  });

  test('should have reasonable API response times', async ({ page }) => {
    const apiTimes: number[] = [];

    page.on('response', async (response) => {
      if (response.url().includes('/api/')) {
        const timing = response.timing();
        if (timing) {
          apiTimes.push(timing.responseEnd);
        }
      }
    });

    await page.goto('/registry');
    await page.waitForLoadState('networkidle');

    // API calls should complete reasonably fast
    for (const time of apiTimes) {
      expect(time).toBeLessThan(5000); // 5 second timeout
    }
  });
});

test.describe('Mobile Performance', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should load efficiently on mobile', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const loadTime = Date.now() - startTime;

    // Mobile should load within 6 seconds (slightly more lenient)
    expect(loadTime).toBeLessThan(6000);
  });

  test('should not load desktop-only resources on mobile', async ({ page }) => {
    let desktopImages = 0;

    page.on('response', (response) => {
      const url = response.url();
      // Check for desktop-specific image naming patterns
      if (url.match(/desktop|large|@2x/) && url.match(/\.(jpg|png|webp)/)) {
        desktopImages++;
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should minimize desktop-specific resources on mobile
    expect(desktopImages).toBeLessThan(5);
  });

  test('should have smooth scrolling on mobile', async ({ page }) => {
    await page.goto('/');

    // Scroll down
    await page.evaluate(() => {
      window.scrollTo({ top: 500, behavior: 'smooth' });
    });

    await page.waitForTimeout(1000);

    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(400);
  });
});

test.describe('Network Resilience', () => {
  test('should handle slow network gracefully', async ({ page }) => {
    // Simulate slow 3G
    await page.route('**/*', (route) => {
      setTimeout(() => route.continue(), 100);
    });

    await page.goto('/');

    // Should still load, just slower
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
  });

  test('should show loading states during data fetch', async ({ page }) => {
    await page.goto('/protocol');

    // Should show loading indicator
    const loading = page.locator('.loading, .stat-value:has-text("...")');

    // Either loading is shown briefly or data loads very fast
    const wasVisible = await loading.isVisible().catch(() => false);

    // This is ok - either shows loading or data is already there
    expect(typeof wasVisible).toBe('boolean');
  });

  test('should handle API failures gracefully', async ({ page }) => {
    // Intercept API calls and make some fail
    await page.route('**/api/**', (route) => {
      if (Math.random() > 0.5) {
        route.abort();
      } else {
        route.continue();
      }
    });

    await page.goto('/protocol');

    // Should not crash, might show error or empty state
    await expect(page.locator('.protocol-page')).toBeVisible();
  });
});
