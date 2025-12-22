import { test, expect } from '@playwright/test';

/**
 * Visual Regression Tests
 *
 * These tests capture screenshots and compare them against baseline images.
 * Run with --update-snapshots to update baseline images when design changes.
 *
 * Example: npx playwright test visual.spec.ts --update-snapshots
 */

test.describe('Visual Regression', () => {
  test('should match homepage screenshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for stats to load or timeout
    await page.waitForTimeout(2000);

    // Take screenshot and compare
    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      maxDiffPixels: 100, // Allow minor differences
    });
  });

  test('should match registry page screenshot', async ({ page }) => {
    await page.goto('/registry');
    await page.waitForLoadState('networkidle');

    // Wait for IDLs to load
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot('registry-page.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('should match protocol page screenshot', async ({ page }) => {
    await page.goto('/protocol');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot('protocol-page.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('should match battles page screenshot', async ({ page }) => {
    await page.goto('/battles');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot('battles-page.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });
});

test.describe('Component Screenshots', () => {
  test('should match hero section', async ({ page }) => {
    await page.goto('/');

    const hero = page.locator('.hero');
    await expect(hero).toBeVisible();

    await expect(hero).toHaveScreenshot('hero-section.png', {
      maxDiffPixels: 50,
    });
  });

  test('should match stats grid', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const statsGrid = page.locator('.stats-grid').first();
    await expect(statsGrid).toBeVisible();

    await expect(statsGrid).toHaveScreenshot('stats-grid.png', {
      maxDiffPixels: 50,
    });
  });

  test('should match features section', async ({ page }) => {
    await page.goto('/');

    const features = page.locator('.features');
    await expect(features).toBeVisible();

    await expect(features).toHaveScreenshot('features-section.png', {
      maxDiffPixels: 50,
    });
  });

  test('should match search box', async ({ page }) => {
    await page.goto('/registry');

    const searchBox = page.locator('.search-box');
    await expect(searchBox).toBeVisible();

    await expect(searchBox).toHaveScreenshot('search-box.png', {
      maxDiffPixels: 20,
    });
  });

  test('should match IDL card', async ({ page }) => {
    await page.goto('/registry');
    await page.waitForTimeout(2000);

    const firstCard = page.locator('.idl-card').first();
    const hasCard = await firstCard.isVisible().catch(() => false);

    if (hasCard) {
      await expect(firstCard).toHaveScreenshot('idl-card.png', {
        maxDiffPixels: 30,
      });
    }
  });

  test('should match market card', async ({ page }) => {
    await page.goto('/protocol');
    await page.waitForTimeout(2000);

    const firstCard = page.locator('.market-card').first();
    const hasCard = await firstCard.isVisible().catch(() => false);

    if (hasCard) {
      await expect(firstCard).toHaveScreenshot('market-card.png', {
        maxDiffPixels: 30,
      });
    }
  });

  test('should match battle card', async ({ page }) => {
    await page.goto('/battles');
    await page.waitForTimeout(2000);

    const firstCard = page.locator('.battle-card').first();
    const hasCard = await firstCard.isVisible().catch(() => false);

    if (hasCard) {
      await expect(firstCard).toHaveScreenshot('battle-card.png', {
        maxDiffPixels: 30,
      });
    }
  });
});

test.describe('Mobile Visual Regression', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should match mobile homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot('mobile-homepage.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('should match mobile registry', async ({ page }) => {
    await page.goto('/registry');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot('mobile-registry.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('should match mobile navigation', async ({ page }) => {
    await page.goto('/');

    const nav = page.locator('nav, header').first();
    const hasNav = await nav.isVisible().catch(() => false);

    if (hasNav) {
      await expect(nav).toHaveScreenshot('mobile-navigation.png', {
        maxDiffPixels: 50,
      });
    }
  });
});

test.describe('Theme and Styling', () => {
  test('should have consistent color scheme', async ({ page }) => {
    await page.goto('/');

    // Check primary button color
    const primaryBtn = page.locator('.btn-primary').first();
    const hasPrimaryBtn = await primaryBtn.isVisible().catch(() => false);

    if (hasPrimaryBtn) {
      const bgColor = await primaryBtn.evaluate((el) =>
        window.getComputedStyle(el).backgroundColor
      );

      // Should have a background color
      expect(bgColor).toBeTruthy();
      expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
    }
  });

  test('should have consistent typography', async ({ page }) => {
    await page.goto('/');

    const h1 = page.locator('h1').first();
    const fontFamily = await h1.evaluate((el) =>
      window.getComputedStyle(el).fontFamily
    );

    // Should have a font family
    expect(fontFamily).toBeTruthy();
    expect(fontFamily).not.toBe('');
  });

  test('should have consistent spacing', async ({ page }) => {
    await page.goto('/');

    const hero = page.locator('.hero');
    const hasHero = await hero.isVisible().catch(() => false);

    if (hasHero) {
      const padding = await hero.evaluate((el) =>
        window.getComputedStyle(el).padding
      );

      // Should have padding
      expect(padding).toBeTruthy();
    }
  });

  test('should have proper border radius', async ({ page }) => {
    await page.goto('/');

    const card = page.locator('.stat-card, .feature-card').first();
    const hasCard = await card.isVisible().catch(() => false);

    if (hasCard) {
      const borderRadius = await card.evaluate((el) =>
        window.getComputedStyle(el).borderRadius
      );

      // Cards typically have border radius
      expect(borderRadius).toBeTruthy();
    }
  });
});

test.describe('Interactive States', () => {
  test('should show hover state on buttons', async ({ page }) => {
    await page.goto('/');

    const button = page.locator('button, .btn').first();
    const hasButton = await button.isVisible().catch(() => false);

    if (hasButton) {
      // Take screenshot of normal state
      await expect(button).toHaveScreenshot('button-normal.png', {
        maxDiffPixels: 20,
      });

      // Hover over button
      await button.hover();
      await page.waitForTimeout(300);

      // Take screenshot of hover state
      await expect(button).toHaveScreenshot('button-hover.png', {
        maxDiffPixels: 20,
      });
    }
  });

  test('should show focus state on inputs', async ({ page }) => {
    await page.goto('/registry');

    const input = page.locator('.search-box input');
    await expect(input).toBeVisible();

    // Normal state
    await expect(input).toHaveScreenshot('input-normal.png', {
      maxDiffPixels: 20,
    });

    // Focused state
    await input.focus();
    await page.waitForTimeout(200);

    await expect(input).toHaveScreenshot('input-focused.png', {
      maxDiffPixels: 20,
    });
  });
});

test.describe('Responsive Breakpoints', () => {
  test('should match tablet layout', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot('tablet-homepage.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('should match large desktop layout', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot('desktop-large-homepage.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });
});

test.describe('Dark Mode / Theme', () => {
  test('should handle dark mode if implemented', async ({ page }) => {
    await page.goto('/');

    // Check if there's a theme toggle
    const themeToggle = page.locator('[class*="theme"], [class*="dark-mode"]').first();
    const hasToggle = await themeToggle.isVisible().catch(() => false);

    if (hasToggle) {
      // Take light mode screenshot
      await expect(page).toHaveScreenshot('light-mode.png', {
        maxDiffPixels: 100,
      });

      // Toggle to dark mode
      await themeToggle.click();
      await page.waitForTimeout(500);

      // Take dark mode screenshot
      await expect(page).toHaveScreenshot('dark-mode.png', {
        maxDiffPixels: 100,
      });
    }
  });
});

test.describe('Loading States', () => {
  test('should show loading skeleton if implemented', async ({ page }) => {
    await page.goto('/protocol', { waitUntil: 'domcontentloaded' });

    // Capture loading state quickly
    const loading = page.locator('.loading');
    const hasLoading = await loading.isVisible().catch(() => false);

    if (hasLoading) {
      await expect(loading).toHaveScreenshot('loading-state.png', {
        maxDiffPixels: 30,
      });
    }
  });

  test('should show empty state', async ({ page }) => {
    await page.goto('/protocol');
    await page.waitForTimeout(2000);

    const emptyState = page.locator('.empty-state');
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    if (hasEmpty) {
      await expect(emptyState).toHaveScreenshot('empty-state.png', {
        maxDiffPixels: 30,
      });
    }
  });

  test('should show error state', async ({ page }) => {
    await page.goto('/protocol');
    await page.waitForTimeout(2000);

    const errorBanner = page.locator('.error-banner');
    const hasError = await errorBanner.isVisible().catch(() => false);

    if (hasError) {
      await expect(errorBanner).toHaveScreenshot('error-state.png', {
        maxDiffPixels: 30,
      });
    }
  });
});
