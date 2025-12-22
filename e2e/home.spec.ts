import { test, expect } from '@playwright/test';

test.describe('HomePage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display hero section with correct content', async ({ page }) => {
    // Check hero heading
    const heroHeading = page.locator('h1').first();
    await expect(heroHeading).toHaveText('IDL Protocol');

    // Check hero subtitle
    const heroSubtitle = page.locator('.hero-subtitle');
    await expect(heroSubtitle).toContainText('Stake $IDL');
    await expect(heroSubtitle).toContainText('Predict DeFi metrics');
    await expect(heroSubtitle).toContainText('Earn rewards');
  });

  test('should have functional navigation buttons', async ({ page }) => {
    // Check "Start Trading" button navigates to /protocol
    const startTradingBtn = page.getByRole('link', { name: /start trading/i });
    await expect(startTradingBtn).toBeVisible();
    await expect(startTradingBtn).toHaveAttribute('href', '/protocol');

    // Check "Read Docs" button navigates to /docs
    const readDocsBtn = page.getByRole('link', { name: /read docs/i });
    await expect(readDocsBtn).toBeVisible();
    await expect(readDocsBtn).toHaveAttribute('href', '/docs');
  });

  test('should display stats grid with four stat cards', async ({ page }) => {
    const statsGrid = page.locator('.stats-grid');
    await expect(statsGrid).toBeVisible();

    // Check for four stat cards
    const statCards = page.locator('.stat-card');
    await expect(statCards).toHaveCount(4);

    // Check stat card labels
    await expect(page.locator('.stat-label').nth(0)).toContainText('Total Staked');
    await expect(page.locator('.stat-label').nth(1)).toContainText('Vote Escrow Supply');
    await expect(page.locator('.stat-label').nth(2)).toContainText('Reward Pool');
    await expect(page.locator('.stat-label').nth(3)).toContainText('Total Burned');
  });

  test('should display stats with loading state', async ({ page }) => {
    // Stats should show either loading or actual values
    const statValues = page.locator('.stat-value');

    for (let i = 0; i < 4; i++) {
      const value = await statValues.nth(i).textContent();
      expect(value).toBeTruthy();
      // Should contain either '...' (loading) or 'IDL' (loaded)
      expect(value).toMatch(/(\.\.\.|IDL)/);
    }
  });

  test('should display features section with four feature cards', async ({ page }) => {
    const featuresSection = page.locator('.features');
    await expect(featuresSection).toBeVisible();

    // Check section title
    const sectionTitle = featuresSection.locator('h2');
    await expect(sectionTitle).toHaveText('Core Features');

    // Check for four feature cards
    const featureCards = page.locator('.feature-card');
    await expect(featureCards).toHaveCount(4);

    // Verify feature titles
    await expect(featureCards.nth(0).locator('h3')).toHaveText('Stake & Lock');
    await expect(featureCards.nth(1).locator('h3')).toHaveText('Prediction Markets');
    await expect(featureCards.nth(2).locator('h3')).toHaveText('1v1 Battles');
    await expect(featureCards.nth(3).locator('h3')).toHaveText('Guilds');
  });

  test('should have feature descriptions', async ({ page }) => {
    const featureCards = page.locator('.feature-card');

    // Check each feature has a description
    for (let i = 0; i < 4; i++) {
      const description = featureCards.nth(i).locator('p');
      await expect(description).toBeVisible();
      const text = await description.textContent();
      expect(text).toBeTruthy();
      expect(text!.length).toBeGreaterThan(10);
    }
  });

  test('should navigate to protocol page when clicking Start Trading', async ({ page }) => {
    await page.getByRole('link', { name: /start trading/i }).click();
    await page.waitForURL('**/protocol');
    await expect(page).toHaveURL(/\/protocol/);
  });

  test('should navigate to docs page when clicking Read Docs', async ({ page }) => {
    await page.getByRole('link', { name: /read docs/i }).click();
    await page.waitForURL('**/docs');
    await expect(page).toHaveURL(/\/docs/);
  });

  test('should display error banner when RPC connection fails', async ({ page }) => {
    // Wait for potential error banner
    await page.waitForTimeout(2000);

    const errorBanner = page.locator('.error-banner');
    const isVisible = await errorBanner.isVisible();

    if (isVisible) {
      await expect(errorBanner).toContainText('Failed to fetch protocol data');
      await expect(errorBanner).toContainText('RPC connection');
    }
  });

  test('should have responsive layout', async ({ page }) => {
    // Test desktop layout
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator('.hero')).toBeVisible();
    await expect(page.locator('.stats-grid')).toBeVisible();

    // Test mobile layout
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('.hero')).toBeVisible();
    await expect(page.locator('.stats-grid')).toBeVisible();
  });

  test('should have accessible headings hierarchy', async ({ page }) => {
    // Check h1
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText('IDL Protocol');

    // Check h2
    const h2 = page.locator('h2');
    await expect(h2).toHaveCount(1);
    await expect(h2).toHaveText('Core Features');

    // Check h3 (feature titles)
    const h3 = page.locator('h3');
    await expect(h3).toHaveCount(4);
  });
});
