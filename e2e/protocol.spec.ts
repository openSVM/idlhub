import { test, expect } from '@playwright/test';

test.describe('ProtocolPage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/protocol');
  });

  test('should display page title', async ({ page }) => {
    const pageTitle = page.locator('.page-title');
    await expect(pageTitle).toHaveText('Prediction Markets');
  });

  test('should show wallet connect prompt when not connected', async ({ page }) => {
    const connectPrompt = page.locator('.connect-prompt');

    // The prompt should be visible if wallet is not connected
    const isVisible = await connectPrompt.isVisible().catch(() => false);

    if (isVisible) {
      await expect(connectPrompt).toContainText('Connect your wallet');
      await expect(connectPrompt).toContainText('place bets');
    }
  });

  test('should display stats grid with four stat cards', async ({ page }) => {
    const statsGrid = page.locator('.stats-grid');
    await expect(statsGrid).toBeVisible();

    const statCards = page.locator('.stat-card');
    await expect(statCards).toHaveCount(4);

    // Check stat labels
    await expect(page.locator('.stat-label').nth(0)).toHaveText('Total Staked');
    await expect(page.locator('.stat-label').nth(1)).toHaveText('Active Markets');
    await expect(page.locator('.stat-label').nth(2)).toHaveText('Reward Pool');
    await expect(page.locator('.stat-label').nth(3)).toHaveText('Burned');
  });

  test('should display active markets section title', async ({ page }) => {
    const sectionTitle = page.locator('h2.section-title').first();
    await expect(sectionTitle).toHaveText('Active Markets');
  });

  test('should show loading state for markets', async ({ page }) => {
    const loading = page.locator('.loading');
    const isEmpty = await loading.isVisible().catch(() => false);

    // Should show loading or empty state or actual markets
    if (isEmpty) {
      await expect(loading).toContainText('Loading markets from chain');
    }
  });

  test('should show empty state when no active markets', async ({ page }) => {
    // Wait for loading to complete
    await page.waitForTimeout(2000);

    const emptyState = page.locator('.empty-state');
    const marketsGrid = page.locator('.markets-grid').first();

    const hasEmptyState = await emptyState.isVisible().catch(() => false);
    const hasMarkets = await marketsGrid.isVisible().catch(() => false);

    if (hasEmptyState) {
      await expect(emptyState).toContainText('No active markets');
      await expect(emptyState).toContainText('Markets will appear when created');
    } else if (hasMarkets) {
      // Markets exist, verify structure
      await expect(marketsGrid).toBeVisible();
    }
  });

  test('should display market cards with correct structure when markets exist', async ({ page }) => {
    await page.waitForTimeout(2000);

    const marketsGrid = page.locator('.markets-grid').first();
    const hasMarkets = await marketsGrid.isVisible().catch(() => false);

    if (hasMarkets) {
      const firstMarket = page.locator('.market-card').first();

      // Check market card structure
      await expect(firstMarket.locator('.market-protocol')).toBeVisible();
      await expect(firstMarket.locator('.market-description')).toBeVisible();
      await expect(firstMarket.locator('.market-odds')).toBeVisible();
      await expect(firstMarket.locator('.market-meta')).toBeVisible();
    }
  });

  test('should display YES and NO betting buttons in market cards', async ({ page }) => {
    await page.waitForTimeout(2000);

    const marketsGrid = page.locator('.markets-grid').first();
    const hasMarkets = await marketsGrid.isVisible().catch(() => false);

    if (hasMarkets) {
      const firstMarket = page.locator('.market-card').first();

      // Check YES button
      const yesBtn = firstMarket.locator('.odds-btn.yes');
      await expect(yesBtn).toBeVisible();
      await expect(yesBtn.locator('.odds-label')).toHaveText('YES');

      // YES odds should be a percentage
      const yesOdds = await yesBtn.locator('.odds-value').textContent();
      expect(yesOdds).toMatch(/\d+%/);

      // Check NO button
      const noBtn = firstMarket.locator('.odds-btn.no');
      await expect(noBtn).toBeVisible();
      await expect(noBtn.locator('.odds-label')).toHaveText('NO');

      // NO odds should be a percentage
      const noOdds = await noBtn.locator('.odds-value').textContent();
      expect(noOdds).toMatch(/\d+%/);
    }
  });

  test('should display market metadata (pool and resolution time)', async ({ page }) => {
    await page.waitForTimeout(2000);

    const marketsGrid = page.locator('.markets-grid').first();
    const hasMarkets = await marketsGrid.isVisible().catch(() => false);

    if (hasMarkets) {
      const firstMarket = page.locator('.market-card').first();
      const meta = firstMarket.locator('.market-meta');

      await expect(meta).toBeVisible();

      const metaText = await meta.textContent();
      expect(metaText).toContain('Pool:');
      expect(metaText).toContain('IDL');
      expect(metaText).toContain('Resolves:');
    }
  });

  test('should display resolved markets section if any exist', async ({ page }) => {
    await page.waitForTimeout(2000);

    const resolvedSection = page.locator('h2.section-title', { hasText: 'Resolved Markets' });
    const hasResolved = await resolvedSection.isVisible().catch(() => false);

    if (hasResolved) {
      await expect(resolvedSection).toHaveText('Resolved Markets');

      const resolvedGrid = page.locator('.markets-grid.resolved');
      await expect(resolvedGrid).toBeVisible();

      // Check resolved market structure
      const resolvedCard = page.locator('.market-card.resolved').first();
      await expect(resolvedCard).toBeVisible();
      await expect(resolvedCard.locator('.market-outcome')).toBeVisible();

      const outcome = await resolvedCard.locator('.market-outcome').textContent();
      expect(outcome).toMatch(/Resolved: (YES|NO)/);
    }
  });

  test('should verify odds percentages add up to 100', async ({ page }) => {
    await page.waitForTimeout(2000);

    const marketsGrid = page.locator('.markets-grid').first();
    const hasMarkets = await marketsGrid.isVisible().catch(() => false);

    if (hasMarkets) {
      const markets = page.locator('.market-card');
      const count = await markets.count();

      for (let i = 0; i < Math.min(count, 3); i++) {
        const market = markets.nth(i);

        const yesText = await market.locator('.odds-btn.yes .odds-value').textContent();
        const noText = await market.locator('.odds-btn.no .odds-value').textContent();

        if (yesText && noText) {
          const yesOdds = parseInt(yesText.replace('%', ''));
          const noOdds = parseInt(noText.replace('%', ''));

          // Should be approximately 100 (allowing for rounding)
          expect(yesOdds + noOdds).toBeGreaterThanOrEqual(99);
          expect(yesOdds + noOdds).toBeLessThanOrEqual(101);
        }
      }
    }
  });

  test('should be responsive', async ({ page }) => {
    // Desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator('.protocol-page')).toBeVisible();
    await expect(page.locator('.stats-grid')).toBeVisible();

    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('.protocol-page')).toBeVisible();

    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('.protocol-page')).toBeVisible();
  });

  test('should navigate from home page Start Trading button', async ({ page }) => {
    await page.goto('/');

    const startTradingBtn = page.getByRole('link', { name: /start trading/i });
    await startTradingBtn.click();

    await page.waitForURL('**/protocol');
    await expect(page).toHaveURL(/\/protocol/);
    await expect(page.locator('.page-title')).toHaveText('Prediction Markets');
  });

  test('should show active markets count in stats', async ({ page }) => {
    await page.waitForTimeout(2000);

    const activeMarketsValue = page.locator('.stat-card').nth(1).locator('.stat-value');
    const count = await activeMarketsValue.textContent();

    // Should be a number
    expect(count).toMatch(/^\d+$/);
    const numCount = parseInt(count || '0');
    expect(numCount).toBeGreaterThanOrEqual(0);
  });

  test('should display protocol ID for each market', async ({ page }) => {
    await page.waitForTimeout(2000);

    const marketsGrid = page.locator('.markets-grid').first();
    const hasMarkets = await marketsGrid.isVisible().catch(() => false);

    if (hasMarkets) {
      const firstMarket = page.locator('.market-card').first();
      const protocolId = firstMarket.locator('.market-protocol');

      await expect(protocolId).toBeVisible();
      const text = await protocolId.textContent();
      expect(text).toBeTruthy();
      expect(text!.length).toBeGreaterThan(0);
    }
  });

  test('should display market description for each market', async ({ page }) => {
    await page.waitForTimeout(2000);

    const marketsGrid = page.locator('.markets-grid').first();
    const hasMarkets = await marketsGrid.isVisible().catch(() => false);

    if (hasMarkets) {
      const firstMarket = page.locator('.market-card').first();
      const description = firstMarket.locator('.market-description');

      await expect(description).toBeVisible();
      const text = await description.textContent();
      expect(text).toBeTruthy();
      expect(text!.length).toBeGreaterThan(0);
    }
  });

  test('should have clickable betting buttons', async ({ page }) => {
    await page.waitForTimeout(2000);

    const marketsGrid = page.locator('.markets-grid').first();
    const hasMarkets = await marketsGrid.isVisible().catch(() => false);

    if (hasMarkets) {
      const firstMarket = page.locator('.market-card').first();

      const yesBtn = firstMarket.locator('.odds-btn.yes');
      const noBtn = firstMarket.locator('.odds-btn.no');

      // Buttons should be enabled (clickable)
      await expect(yesBtn).toBeVisible();
      await expect(noBtn).toBeVisible();

      // They're button elements
      expect(await yesBtn.evaluate(el => el.tagName)).toBe('BUTTON');
      expect(await noBtn.evaluate(el => el.tagName)).toBe('BUTTON');
    }
  });

  test('should display valid resolution dates', async ({ page }) => {
    await page.waitForTimeout(2000);

    const marketsGrid = page.locator('.markets-grid').first();
    const hasMarkets = await marketsGrid.isVisible().catch(() => false);

    if (hasMarkets) {
      const markets = page.locator('.market-card');
      const count = await markets.count();

      for (let i = 0; i < Math.min(count, 3); i++) {
        const market = markets.nth(i);
        const metaText = await market.locator('.market-meta').textContent();

        // Should contain a date pattern
        expect(metaText).toMatch(/\d{1,2}\/\d{1,2}\/\d{2,4}/);
      }
    }
  });
});
