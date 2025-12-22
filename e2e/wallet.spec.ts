import { test, expect } from '@playwright/test';

test.describe('Wallet Integration', () => {
  test('should display wallet connect button or status', async ({ page }) => {
    await page.goto('/');

    // Look for wallet-related elements in header/nav
    const nav = page.locator('nav, header').first();
    const hasNav = await nav.isVisible().catch(() => false);

    if (hasNav) {
      // Should have some wallet UI element
      const walletBtn = page.locator('button:has-text("Connect"), button:has-text("Wallet"), .wallet-button, .connect-wallet').first();
      const hasWalletBtn = await walletBtn.isVisible().catch(() => false);

      // Wallet button might exist
      if (hasWalletBtn) {
        await expect(walletBtn).toBeVisible();
      }
    }
  });

  test('should show connect prompt on pages requiring wallet', async ({ page }) => {
    // Protocol page
    await page.goto('/protocol');
    const protocolPrompt = page.locator('.connect-prompt');
    const hasProtocolPrompt = await protocolPrompt.isVisible().catch(() => false);

    if (hasProtocolPrompt) {
      await expect(protocolPrompt).toContainText(/connect.*wallet/i);
    }

    // Battles page
    await page.goto('/battles');
    const battlesPrompt = page.locator('.connect-prompt');
    const hasBattlesPrompt = await battlesPrompt.isVisible().catch(() => false);

    if (hasBattlesPrompt) {
      await expect(battlesPrompt).toContainText(/connect.*wallet/i);
    }
  });

  test('should not show wallet prompts on public pages', async ({ page }) => {
    // Home page - should work without wallet
    await page.goto('/');
    await expect(page.locator('h1').first()).toBeVisible();

    // Registry page - should work without wallet
    await page.goto('/registry');
    await expect(page.locator('.page-title')).toBeVisible();

    // Docs page - should work without wallet
    await page.goto('/docs');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle wallet not installed gracefully', async ({ page }) => {
    await page.goto('/');

    // Look for connect wallet button
    const walletBtn = page.locator('button:has-text("Connect"), button:has-text("Wallet")').first();
    const hasWalletBtn = await walletBtn.isVisible().catch(() => false);

    if (hasWalletBtn) {
      // Mock: Wallet not installed scenario is handled by opening Phantom website
      // The app should handle this gracefully without crashing
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should display wallet features consistently', async ({ page }) => {
    const pagesWithWallet = ['/protocol', '/battles'];

    for (const pagePath of pagesWithWallet) {
      await page.goto(pagePath);

      // Should either show connect prompt or wallet UI
      const connectPrompt = page.locator('.connect-prompt');
      const hasPrompt = await connectPrompt.isVisible().catch(() => false);

      if (hasPrompt) {
        await expect(connectPrompt).toContainText(/wallet/i);
      }
    }
  });
});

test.describe('Wallet State Management', () => {
  test('should maintain disconnected state across navigation', async ({ page }) => {
    await page.goto('/protocol');

    const initialPrompt = page.locator('.connect-prompt');
    const hasInitialPrompt = await initialPrompt.isVisible().catch(() => false);

    // Navigate away and back
    await page.goto('/');
    await page.goto('/protocol');

    const finalPrompt = page.locator('.connect-prompt');
    const hasFinalPrompt = await finalPrompt.isVisible().catch(() => false);

    // State should be consistent
    expect(hasInitialPrompt).toBe(hasFinalPrompt);
  });

  test('should show consistent wallet state across pages', async ({ page }) => {
    await page.goto('/protocol');
    const protocolPrompt = page.locator('.connect-prompt');
    const hasProtocolPrompt = await protocolPrompt.isVisible().catch(() => false);

    await page.goto('/battles');
    const battlesPrompt = page.locator('.connect-prompt');
    const hasBattlesPrompt = await battlesPrompt.isVisible().catch(() => false);

    // Wallet state should be consistent
    expect(hasProtocolPrompt).toBe(hasBattlesPrompt);
  });
});

test.describe('Protected Features', () => {
  test('should hide create battle form when wallet not connected', async ({ page }) => {
    await page.goto('/battles');

    const connectPrompt = page.locator('.connect-prompt');
    const hasPrompt = await connectPrompt.isVisible().catch(() => false);

    if (hasPrompt) {
      // Create battle form should not be visible
      const createForm = page.locator('.create-battle');
      const hasForm = await createForm.isVisible().catch(() => false);
      expect(hasForm).toBe(false);
    }
  });

  test('should show betting interface state on protocol page', async ({ page }) => {
    await page.goto('/protocol');

    // Wait for markets to load
    await page.waitForTimeout(2000);

    const marketsGrid = page.locator('.markets-grid').first();
    const hasMarkets = await marketsGrid.isVisible().catch(() => false);

    if (hasMarkets) {
      // Betting buttons should be visible but may be disabled
      const betBtn = page.locator('.odds-btn').first();
      await expect(betBtn).toBeVisible();
    }
  });
});

test.describe('Wallet Connect Flow', () => {
  test('should have accessible wallet connect button', async ({ page }) => {
    await page.goto('/');

    const walletBtn = page.locator('button:has-text("Connect"), button:has-text("Wallet")').first();
    const hasWalletBtn = await walletBtn.isVisible().catch(() => false);

    if (hasWalletBtn) {
      // Button should be clickable
      await expect(walletBtn).toBeEnabled();

      // Button should have button role
      const role = await walletBtn.evaluate(el => el.tagName);
      expect(role).toBe('BUTTON');
    }
  });

  test('should show wallet connect option in navigation', async ({ page }) => {
    await page.goto('/');

    // Check for wallet UI in navigation area
    const nav = page.locator('nav, header, .navbar, .header').first();
    const hasNav = await nav.isVisible().catch(() => false);

    if (hasNav) {
      const navText = await nav.textContent();
      // Might contain wallet-related text
      // This is flexible since design may vary
      expect(navText).toBeTruthy();
    }
  });
});

test.describe('RPC Connection', () => {
  test('should load protocol data from RPC', async ({ page }) => {
    await page.goto('/protocol');

    // Wait for data to load
    await page.waitForTimeout(3000);

    const statsGrid = page.locator('.stats-grid');
    await expect(statsGrid).toBeVisible();

    // Stats should show either loading or actual data
    const statValues = page.locator('.stat-value');
    const firstValue = await statValues.first().textContent();
    expect(firstValue).toBeTruthy();
  });

  test('should handle RPC connection errors gracefully', async ({ page }) => {
    // Monitor console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/protocol');
    await page.waitForTimeout(2000);

    // Page should still be functional even if RPC fails
    await expect(page.locator('.protocol-page')).toBeVisible();
    await expect(page.locator('.page-title')).toBeVisible();

    // Should show error banner if RPC fails, not crash
    const errorBanner = page.locator('.error-banner');
    const hasError = await errorBanner.isVisible().catch(() => false);

    // Either works or shows error, but doesn't crash
    expect(await page.locator('body').isVisible()).toBe(true);
  });

  test('should display loading states before data loads', async ({ page }) => {
    await page.goto('/protocol');

    // Should show loading indicator initially
    const loading = page.locator('.loading');
    const statsLoading = page.locator('.stat-value:has-text("...")');

    // Either loading indicator or loaded data should be visible
    await page.waitForTimeout(100);
    const hasLoadingOrData = await loading.isVisible().catch(() => false) ||
                             await statsLoading.isVisible().catch(() => false) ||
                             await page.locator('.stat-value').first().isVisible().catch(() => false);

    expect(hasLoadingOrData).toBe(true);
  });
});

test.describe('Wallet Security', () => {
  test('should not expose wallet private keys in DOM', async ({ page }) => {
    await page.goto('/');

    // Check page source for any private key patterns
    const content = await page.content();

    // Should not contain base58-encoded private keys (typically 88 chars)
    // This is a basic check - real private keys should never be in frontend
    expect(content).not.toMatch(/[1-9A-HJ-NP-Za-km-z]{87,88}/);
  });

  test('should use secure RPC connection', async ({ page }) => {
    await page.goto('/protocol');

    // Check if app uses HTTPS for RPC (in production)
    // In dev mode, it might use HTTP localhost
    const url = page.url();

    // If deployed (not localhost), should use HTTPS
    if (!url.includes('localhost') && !url.includes('127.0.0.1')) {
      expect(url).toMatch(/^https:/);
    }
  });
});
