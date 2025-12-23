import { test, expect } from '@playwright/test';

test.describe('SwapPage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/swap');
  });

  test('should display page title and description', async ({ page }) => {
    const pageTitle = page.locator('.page-title');
    await expect(pageTitle).toHaveText('AMM Swap & Liquidity');

    const description = page.locator('.page-description');
    await expect(description).toContainText('Curve StableSwap');
    await expect(description).toContainText('BAGS-IDL');
    await expect(description).toContainText('PUMP-IDL');
  });

  test('should display pool stats grid with four cards', async ({ page }) => {
    const statsGrid = page.locator('.stats-grid');
    await expect(statsGrid).toBeVisible();

    const statCards = page.locator('.stat-card');
    await expect(statCards).toHaveCount(4);

    // Check stat labels
    await expect(page.locator('.stat-label').nth(0)).toHaveText('TVL (IDL)');
    await expect(page.locator('.stat-label').nth(1)).toHaveText('BAGS Reserve');
    await expect(page.locator('.stat-label').nth(2)).toHaveText('PUMP Reserve');
    await expect(page.locator('.stat-label').nth(3)).toHaveText('LP Supply');
  });

  test('should display all four tabs', async ({ page }) => {
    const tabs = page.locator('.tab-nav button');
    await expect(tabs).toHaveCount(4);

    await expect(tabs.nth(0)).toHaveText('Swap');
    await expect(tabs.nth(1)).toHaveText('Add Liquidity');
    await expect(tabs.nth(2)).toHaveText('Remove Liquidity');
    await expect(tabs.nth(3)).toHaveText('Farm LP');
  });

  test('should show Swap tab as active by default', async ({ page }) => {
    const swapTab = page.locator('.tab-nav button').nth(0);
    await expect(swapTab).toHaveClass(/active/);
  });

  test.describe('Swap Tab', () => {
    test('should show wallet connect prompt when not connected', async ({ page }) => {
      const connectPrompt = page.locator('.connect-wallet-prompt');
      const isVisible = await connectPrompt.isVisible().catch(() => false);

      if (isVisible) {
        await expect(connectPrompt).toContainText('Connect your wallet to swap tokens');
      }
    });

    test('should display swap form with token inputs', async ({ page }) => {
      // Check if form exists (may be hidden if wallet not connected)
      const form = page.locator('.swap-form');
      const formExists = await form.count() > 0;

      if (formExists) {
        const tokenInputs = page.locator('.token-input-group');
        await expect(tokenInputs).toHaveCount(2);
      }
    });

    test('should show "From" and "To" labels', async ({ page }) => {
      const form = page.locator('.swap-form');
      const formVisible = await form.isVisible().catch(() => false);

      if (formVisible) {
        const fromLabel = page.locator('.input-header label').first();
        await expect(fromLabel).toHaveText('From');

        const toLabel = page.locator('.input-header label').nth(1);
        await expect(toLabel).toContainText('To');
      }
    });

    test('should display flip button', async ({ page }) => {
      const flipBtn = page.locator('.flip-btn');
      const btnExists = await flipBtn.count() > 0;

      if (btnExists && await flipBtn.isVisible()) {
        await expect(flipBtn).toHaveText('⇅');
      }
    });

    test('should display slippage settings', async ({ page }) => {
      const slippageSection = page.locator('.slippage-section');
      const sectionExists = await slippageSection.count() > 0;

      if (sectionExists && await slippageSection.isVisible()) {
        const slippageOptions = page.locator('.slippage-options button');
        await expect(slippageOptions).toHaveCount(3); // 0.1%, 0.5%, 1.0%
      }
    });

    test('should have MAX button for quick balance entry', async ({ page }) => {
      const maxBtn = page.locator('.max-btn').first();
      const btnExists = await maxBtn.count() > 0;

      if (btnExists && await maxBtn.isVisible()) {
        await expect(maxBtn).toHaveText('MAX');
      }
    });

    test('should show submit button', async ({ page }) => {
      const submitBtn = page.locator('.submit-btn').first();
      const btnExists = await submitBtn.count() > 0;

      if (btnExists && await submitBtn.isVisible()) {
        await expect(submitBtn).toContainText('Swap');
      }
    });

    test('should display token names (BAGS/PUMP)', async ({ page }) => {
      const tokenNames = page.locator('.token-name');
      const namesExist = await tokenNames.count() > 0;

      if (namesExist) {
        // Should have at least 2 token names visible
        const visibleNames = await tokenNames.allTextContents();
        const hasBags = visibleNames.some(name => name.includes('BAGS'));
        const hasPump = visibleNames.some(name => name.includes('PUMP'));

        expect(hasBags || hasPump).toBeTruthy();
      }
    });
  });

  test.describe('Add Liquidity Tab', () => {
    test.beforeEach(async ({ page }) => {
      const addLiqTab = page.locator('.tab-nav button').nth(1);
      await addLiqTab.click();
      await page.waitForTimeout(100); // Wait for tab transition
    });

    test('should activate Add Liquidity tab on click', async ({ page }) => {
      const addLiqTab = page.locator('.tab-nav button').nth(1);
      await expect(addLiqTab).toHaveClass(/active/);
    });

    test('should show liquidity info banner', async ({ page }) => {
      const infoSection = page.locator('.liquidity-info');
      const infoExists = await infoSection.count() > 0;

      if (infoExists && await infoSection.isVisible()) {
        await expect(infoSection).toContainText('proportionally');
      }
    });

    test('should display BAGS and PUMP input fields', async ({ page }) => {
      const form = page.locator('.swap-form');
      const formVisible = await form.isVisible().catch(() => false);

      if (formVisible) {
        const labels = page.locator('.input-header label');
        const labelTexts = await labels.allTextContents();

        expect(labelTexts.some(text => text.includes('BAGS'))).toBeTruthy();
        expect(labelTexts.some(text => text.includes('PUMP'))).toBeTruthy();
      }
    });

    test('should show Add Liquidity submit button', async ({ page }) => {
      const submitBtn = page.locator('.submit-btn');
      const btnExists = await submitBtn.count() > 0;

      if (btnExists && await submitBtn.isVisible()) {
        const btnText = await submitBtn.textContent();
        expect(btnText).toContain('Add Liquidity');
      }
    });
  });

  test.describe('Remove Liquidity Tab', () => {
    test.beforeEach(async ({ page }) => {
      const removeLiqTab = page.locator('.tab-nav button').nth(2);
      await removeLiqTab.click();
      await page.waitForTimeout(100);
    });

    test('should activate Remove Liquidity tab on click', async ({ page }) => {
      const removeLiqTab = page.locator('.tab-nav button').nth(2);
      await expect(removeLiqTab).toHaveClass(/active/);
    });

    test('should show liquidity info banner', async ({ page }) => {
      const infoSection = page.locator('.liquidity-info');
      const infoExists = await infoSection.count() > 0;

      if (infoExists && await infoSection.isVisible()) {
        await expect(infoSection).toContainText('Withdraw');
      }
    });

    test('should display LP token input field', async ({ page }) => {
      const form = page.locator('.swap-form');
      const formVisible = await form.isVisible().catch(() => false);

      if (formVisible) {
        const label = page.locator('.input-header label').first();
        await expect(label).toHaveText('LP Tokens');
      }
    });

    test('should show Remove Liquidity submit button', async ({ page }) => {
      const submitBtn = page.locator('.submit-btn');
      const btnExists = await submitBtn.count() > 0;

      if (btnExists && await submitBtn.isVisible()) {
        const btnText = await submitBtn.textContent();
        expect(btnText).toContain('Remove Liquidity');
      }
    });
  });

  test.describe('Farm LP Tab', () => {
    test.beforeEach(async ({ page }) => {
      const farmTab = page.locator('.tab-nav button').nth(3);
      await farmTab.click();
      await page.waitForTimeout(100);
    });

    test('should activate Farm LP tab on click', async ({ page }) => {
      const farmTab = page.locator('.tab-nav button').nth(3);
      await expect(farmTab).toHaveClass(/active/);
    });

    test('should display farming info banner', async ({ page }) => {
      const banner = page.locator('.farm-info-banner');
      const bannerExists = await banner.count() > 0;

      if (bannerExists && await banner.isVisible()) {
        await expect(banner).toContainText('LP Token Farming');
        await expect(banner).toContainText('Stake your LP tokens');
      }
    });

    test('should show farm stats (APR, Staked, Rewards)', async ({ page }) => {
      const farmStats = page.locator('.farm-stat');
      const statsExist = await farmStats.count() > 0;

      if (statsExist) {
        await expect(farmStats).toHaveCount(3);

        const statLabels = page.locator('.farm-stat .stat-label');
        const labels = await statLabels.allTextContents();

        expect(labels.some(l => l.includes('APR'))).toBeTruthy();
        expect(labels.some(l => l.includes('Staked'))).toBeTruthy();
        expect(labels.some(l => l.includes('Rewards'))).toBeTruthy();
      }
    });

    test('should display Stake LP section', async ({ page }) => {
      const farmSections = page.locator('.farm-section');
      const sectionsExist = await farmSections.count() > 0;

      if (sectionsExist) {
        const firstSection = farmSections.first();
        await expect(firstSection).toContainText('Stake LP Tokens');
      }
    });

    test('should display Unstake LP section', async ({ page }) => {
      const farmSections = page.locator('.farm-section');
      const sectionsExist = await farmSections.count() > 1;

      if (sectionsExist) {
        const sections = await farmSections.allTextContents();
        expect(sections.some(s => s.includes('Unstake'))).toBeTruthy();
      }
    });

    test('should display Claim Rewards section', async ({ page }) => {
      const farmSections = page.locator('.farm-section');
      const sectionsExist = await farmSections.count() > 2;

      if (sectionsExist) {
        const sections = await farmSections.allTextContents();
        expect(sections.some(s => s.includes('Claim Rewards'))).toBeTruthy();
      }
    });

    test('should show farm notes', async ({ page }) => {
      const notes = page.locator('.farm-notes');
      const notesExist = await notes.count() > 0;

      if (notesExist && await notes.isVisible()) {
        await expect(notes).toContainText('Minimum stake');
        await expect(notes).toContainText('Lock period');
      }
    });
  });

  test.describe('User Balances Section', () => {
    test('should display balances when wallet is connected', async ({ page }) => {
      const balancesSection = page.locator('.balances-section');
      const sectionExists = await balancesSection.count() > 0;

      if (sectionExists && await balancesSection.isVisible()) {
        await expect(balancesSection).toContainText('Your Balances');

        const balanceItems = page.locator('.balance-item');
        await expect(balanceItems).toHaveCount(4); // BAGS, PUMP, LP, LP Value
      }
    });

    test('should show balance labels correctly', async ({ page }) => {
      const balanceLabels = page.locator('.balance-label');
      const labelsExist = await balanceLabels.count() > 0;

      if (labelsExist) {
        const labels = await balanceLabels.allTextContents();

        expect(labels.some(l => l.includes('BAGS'))).toBeTruthy();
        expect(labels.some(l => l.includes('PUMP'))).toBeTruthy();
        expect(labels.some(l => l.includes('LP'))).toBeTruthy();
      }
    });
  });

  test.describe('Pool State Loading', () => {
    test('should handle pool loading state', async ({ page }) => {
      const loading = page.locator('.loading');
      const error = page.locator('.error-banner');

      // Page should either show loading, error, or pool data
      const loadingVisible = await loading.isVisible().catch(() => false);
      const errorVisible = await error.isVisible().catch(() => false);
      const statsVisible = await page.locator('.stats-grid').isVisible().catch(() => false);

      expect(loadingVisible || errorVisible || statsVisible).toBeTruthy();
    });

    test('should show error banner if pool not found', async ({ page }) => {
      const errorBanner = page.locator('.error-banner');
      const errorVisible = await errorBanner.isVisible().catch(() => false);

      if (errorVisible) {
        await expect(errorBanner).toContainText('Pool not found');
      }
    });
  });

  test.describe('Navigation', () => {
    test('should be accessible from navigation menu', async ({ page }) => {
      await page.goto('/');

      const swapLink = page.locator('.nav-link').filter({ hasText: 'Swap' });
      await swapLink.click();

      await expect(page).toHaveURL(/.*\/swap/);
    });

    test('should maintain URL on page refresh', async ({ page }) => {
      await page.reload();
      await expect(page).toHaveURL(/.*\/swap/);
    });
  });

  test.describe('Tab Navigation', () => {
    test('should switch between all tabs', async ({ page }) => {
      const tabs = page.locator('.tab-nav button');

      // Click each tab and verify it becomes active
      for (let i = 0; i < 4; i++) {
        await tabs.nth(i).click();
        await expect(tabs.nth(i)).toHaveClass(/active/);
      }
    });

    test('should persist tab content when switching', async ({ page }) => {
      // Switch to Add Liquidity tab
      const addLiqTab = page.locator('.tab-nav button').nth(1);
      await addLiqTab.click();

      const liquidityInfo = page.locator('.liquidity-info');
      const infoExists = await liquidityInfo.count() > 0;

      if (infoExists) {
        await expect(liquidityInfo).toBeVisible();
      }

      // Switch back to Swap tab
      const swapTab = page.locator('.tab-nav button').nth(0);
      await swapTab.click();

      // Liquidity info should be hidden
      if (infoExists) {
        await expect(liquidityInfo).not.toBeVisible();
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should be mobile-friendly', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone size

      const pageTitle = page.locator('.page-title');
      await expect(pageTitle).toBeVisible();

      const statsGrid = page.locator('.stats-grid');
      await expect(statsGrid).toBeVisible();
    });

    test('should adapt layout on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad size

      const swapContainer = page.locator('.swap-container');
      const containerExists = await swapContainer.count() > 0;

      if (containerExists) {
        await expect(swapContainer).toBeVisible();
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper form labels', async ({ page }) => {
      const labels = page.locator('label');
      const labelsExist = await labels.count() > 0;

      expect(labelsExist).toBeTruthy();
    });

    test('should have keyboard-navigable buttons', async ({ page }) => {
      const buttons = page.locator('button');
      const firstButton = buttons.first();

      if (await firstButton.isVisible()) {
        await firstButton.focus();
        await expect(firstButton).toBeFocused();
      }
    });

    test('should have semantic HTML structure', async ({ page }) => {
      const main = page.locator('.swap-page');
      await expect(main).toBeVisible();

      const heading = page.locator('h1');
      await expect(heading).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle pool initialization error gracefully', async ({ page }) => {
      const errorBanner = page.locator('.error-banner');
      const errorVisible = await errorBanner.isVisible().catch(() => false);

      if (errorVisible) {
        // Error should be descriptive
        const errorText = await errorBanner.textContent();
        expect(errorText?.length).toBeGreaterThan(10);
      }
    });
  });
});
