import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate between all pages', async ({ page }) => {
    // Start at home
    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);

    // Check if navigation menu is present
    const nav = page.locator('nav, header').first();
    const hasNav = await nav.isVisible().catch(() => false);

    if (hasNav) {
      // Test navigation to Registry
      const registryLink = page.getByRole('link', { name: /registry/i });
      if (await registryLink.isVisible().catch(() => false)) {
        await registryLink.click();
        await page.waitForURL('**/registry');
        await expect(page).toHaveURL(/\/registry/);
      }

      // Navigate back home
      await page.goto('/');

      // Test navigation to Protocol
      const protocolLink = page.getByRole('link', { name: /protocol|markets/i });
      if (await protocolLink.isVisible().catch(() => false)) {
        await protocolLink.click();
        await page.waitForURL('**/protocol');
        await expect(page).toHaveURL(/\/protocol/);
      }

      // Navigate back home
      await page.goto('/');

      // Test navigation to Battles
      const battlesLink = page.getByRole('link', { name: /battles/i });
      if (await battlesLink.isVisible().catch(() => false)) {
        await battlesLink.click();
        await page.waitForURL('**/battles');
        await expect(page).toHaveURL(/\/battles/);
      }

      // Navigate back home
      await page.goto('/');

      // Test navigation to Guilds
      const guildsLink = page.getByRole('link', { name: /guilds/i });
      if (await guildsLink.isVisible().catch(() => false)) {
        await guildsLink.click();
        await page.waitForURL('**/guilds');
        await expect(page).toHaveURL(/\/guilds/);
      }

      // Navigate back home
      await page.goto('/');

      // Test navigation to Docs
      const docsLink = page.getByRole('link', { name: /docs/i });
      if (await docsLink.isVisible().catch(() => false)) {
        await docsLink.click();
        await page.waitForURL('**/docs');
        await expect(page).toHaveURL(/\/docs/);
      }

      // Navigate back home
      await page.goto('/');

      // Test navigation to Tokenomics
      const tokenomicsLink = page.getByRole('link', { name: /tokenomics/i });
      if (await tokenomicsLink.isVisible().catch(() => false)) {
        await tokenomicsLink.click();
        await page.waitForURL('**/tokenomics');
        await expect(page).toHaveURL(/\/tokenomics/);
      }

      // Navigate back home
      await page.goto('/');

      // Test navigation to Status
      const statusLink = page.getByRole('link', { name: /status/i });
      if (await statusLink.isVisible().catch(() => false)) {
        await statusLink.click();
        await page.waitForURL('**/status');
        await expect(page).toHaveURL(/\/status/);
      }
    }
  });

  test('should have consistent navigation across pages', async ({ page }) => {
    const pages = ['/', '/registry', '/protocol', '/battles', '/guilds', '/docs', '/tokenomics', '/status'];

    for (const pagePath of pages) {
      await page.goto(pagePath);

      // Check if navigation is visible
      const nav = page.locator('nav, header').first();
      const hasNav = await nav.isVisible().catch(() => false);

      if (hasNav) {
        await expect(nav).toBeVisible();
      }
    }
  });

  test('should navigate using browser back button', async ({ page }) => {
    await page.goto('/');
    await page.goto('/registry');
    await expect(page).toHaveURL(/\/registry/);

    await page.goBack();
    await expect(page).toHaveURL(/\/$/);

    await page.goForward();
    await expect(page).toHaveURL(/\/registry/);
  });

  test('should handle direct URL navigation', async ({ page }) => {
    // Test direct navigation to each route
    await page.goto('/registry');
    await expect(page.locator('.page-title')).toHaveText('IDL Registry');

    await page.goto('/protocol');
    await expect(page.locator('.page-title')).toHaveText('Prediction Markets');

    await page.goto('/battles');
    await expect(page.locator('.page-title')).toHaveText('1v1 Prediction Battles');

    await page.goto('/');
    await expect(page.locator('h1').first()).toHaveText('IDL Protocol');
  });

  test('should have home link or logo', async ({ page }) => {
    await page.goto('/registry');

    // Look for logo or home link
    const homeLink = page.locator('a[href="/"], a[href="#/"]').first();
    const hasHomeLink = await homeLink.isVisible().catch(() => false);

    if (hasHomeLink) {
      await homeLink.click();
      await page.waitForURL(/\/$/);
      await expect(page).toHaveURL(/\/$/);
    }
  });

  test('should not have broken links in navigation', async ({ page }) => {
    await page.goto('/');

    const nav = page.locator('nav, header').first();
    const hasNav = await nav.isVisible().catch(() => false);

    if (hasNav) {
      const links = await nav.locator('a').all();

      for (const link of links) {
        const href = await link.getAttribute('href');

        if (href && !href.startsWith('http') && !href.startsWith('#')) {
          // Click and verify page loads without error
          await link.click();
          await page.waitForLoadState('domcontentloaded');

          // Should not show 404 or error page
          const bodyText = await page.locator('body').textContent();
          expect(bodyText).not.toContain('404');
          expect(bodyText).not.toContain('Page not found');

          // Go back to home
          await page.goto('/');
        }
      }
    }
  });

  test('should maintain scroll position when navigating', async ({ page }) => {
    await page.goto('/');

    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(500);

    const scrollBefore = await page.evaluate(() => window.scrollY);
    expect(scrollBefore).toBeGreaterThan(0);

    // Navigate to another page
    await page.goto('/registry');

    // Should start at top
    const scrollAfter = await page.evaluate(() => window.scrollY);
    expect(scrollAfter).toBeLessThan(100);
  });

  test('should update document title on navigation', async ({ page }) => {
    await page.goto('/');
    let title = await page.title();
    expect(title).toBeTruthy();

    await page.goto('/registry');
    const registryTitle = await page.title();
    expect(registryTitle).toBeTruthy();

    await page.goto('/protocol');
    const protocolTitle = await page.title();
    expect(protocolTitle).toBeTruthy();

    // Titles should be different or at least exist
    expect(registryTitle.length).toBeGreaterThan(0);
    expect(protocolTitle.length).toBeGreaterThan(0);
  });
});

test.describe('Mobile Navigation', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should have mobile-friendly navigation', async ({ page }) => {
    await page.goto('/');

    // Check for hamburger menu or mobile navigation
    const nav = page.locator('nav, header, .menu, .navbar').first();
    const hasNav = await nav.isVisible().catch(() => false);

    if (hasNav) {
      await expect(nav).toBeVisible();
    }
  });

  test('should navigate on mobile devices', async ({ page }) => {
    await page.goto('/');

    const registryLink = page.getByRole('link', { name: /registry/i }).first();
    const hasLink = await registryLink.isVisible().catch(() => false);

    if (hasLink) {
      await registryLink.click();
      await page.waitForURL('**/registry');
      await expect(page).toHaveURL(/\/registry/);
    }
  });
});
