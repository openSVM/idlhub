import { test, expect } from '@playwright/test';

test.describe('RegistryPage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/registry');
  });

  test('should display page title and subtitle', async ({ page }) => {
    const pageTitle = page.locator('.page-title');
    await expect(pageTitle).toHaveText('IDL Registry');

    const pageSubtitle = page.locator('.page-subtitle');
    await expect(pageSubtitle).toContainText('Browse and search Solana protocol IDL files');
    await expect(pageSubtitle).toContainText('Arweave');
  });

  test('should display search box', async ({ page }) => {
    const searchBox = page.locator('.search-box input');
    await expect(searchBox).toBeVisible();
    await expect(searchBox).toHaveAttribute('placeholder', 'Search protocols...');
    await expect(searchBox).toHaveAttribute('type', 'text');
  });

  test('should show loading state initially', async ({ page }) => {
    const loading = page.locator('.loading');
    const isVisible = await loading.isVisible().catch(() => false);

    // Loading might disappear quickly, so just check if it exists or grid exists
    const grid = page.locator('.idl-grid');
    const gridVisible = await grid.isVisible();

    expect(isVisible || gridVisible).toBeTruthy();
  });

  test('should display IDL cards after loading', async ({ page }) => {
    // Wait for loading to complete
    await page.waitForSelector('.idl-grid, .empty-state', { timeout: 10000 });

    const grid = page.locator('.idl-grid');
    const isEmpty = await page.locator('.empty-state').isVisible().catch(() => false);

    if (!isEmpty) {
      await expect(grid).toBeVisible();

      // Check if there are IDL cards
      const cards = page.locator('.idl-card');
      const count = await cards.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should display IDL card with correct structure', async ({ page }) => {
    await page.waitForSelector('.idl-grid, .empty-state', { timeout: 10000 });

    const firstCard = page.locator('.idl-card').first();
    const isEmpty = await page.locator('.empty-state').isVisible().catch(() => false);

    if (!isEmpty) {
      // Check card structure
      await expect(firstCard).toBeVisible();
      await expect(firstCard.locator('h3')).toBeVisible();
      await expect(firstCard.locator('.idl-id')).toBeVisible();
      await expect(firstCard.locator('.idl-desc')).toBeVisible();
      await expect(firstCard.locator('.idl-actions')).toBeVisible();
    }
  });

  test('should have View IDL link in each card', async ({ page }) => {
    await page.waitForSelector('.idl-grid, .empty-state', { timeout: 10000 });

    const isEmpty = await page.locator('.empty-state').isVisible().catch(() => false);

    if (!isEmpty) {
      const firstCard = page.locator('.idl-card').first();
      const viewLink = firstCard.locator('a', { hasText: 'View IDL' });

      await expect(viewLink).toBeVisible();
      const href = await viewLink.getAttribute('href');
      expect(href).toMatch(/\/api\/idl\/.+/);
      await expect(viewLink).toHaveAttribute('target', '_blank');
      await expect(viewLink).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  test('should filter IDLs based on search input', async ({ page }) => {
    await page.waitForSelector('.idl-grid, .empty-state', { timeout: 10000 });

    const searchBox = page.locator('.search-box input');
    const isEmpty = await page.locator('.empty-state').isVisible().catch(() => false);

    if (!isEmpty) {
      // Get initial card count
      const initialCards = page.locator('.idl-card');
      const initialCount = await initialCards.count();

      if (initialCount > 1) {
        // Get the name of the first protocol
        const firstName = await initialCards.first().locator('h3').textContent();

        if (firstName) {
          // Search for part of the first protocol name
          const searchTerm = firstName.substring(0, Math.min(3, firstName.length));
          await searchBox.fill(searchTerm);

          // Wait a bit for filtering
          await page.waitForTimeout(500);

          // Count should be equal or less
          const filteredCount = await page.locator('.idl-card').count();
          expect(filteredCount).toBeLessThanOrEqual(initialCount);

          // Clear search
          await searchBox.clear();
          await page.waitForTimeout(500);

          // Count should return to original
          const resetCount = await page.locator('.idl-card').count();
          expect(resetCount).toBe(initialCount);
        }
      }
    }
  });

  test('should show empty state when no results match search', async ({ page }) => {
    await page.waitForSelector('.idl-grid, .empty-state', { timeout: 10000 });

    const searchBox = page.locator('.search-box input');

    // Search for something that definitely doesn't exist
    await searchBox.fill('zzzzz_nonexistent_protocol_xyz_123');
    await page.waitForTimeout(500);

    const emptyState = page.locator('.empty-state');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText('No protocols found matching');
    await expect(emptyState).toContainText('zzzzz_nonexistent_protocol_xyz_123');
  });

  test('should search by protocol ID', async ({ page }) => {
    await page.waitForSelector('.idl-grid, .empty-state', { timeout: 10000 });

    const isEmpty = await page.locator('.empty-state').isVisible().catch(() => false);

    if (!isEmpty) {
      const firstCard = page.locator('.idl-card').first();
      const protocolId = await firstCard.locator('.idl-id').textContent();

      if (protocolId) {
        const searchBox = page.locator('.search-box input');
        await searchBox.fill(protocolId);
        await page.waitForTimeout(500);

        // Should show at least the matching card
        const cards = page.locator('.idl-card');
        const count = await cards.count();
        expect(count).toBeGreaterThanOrEqual(1);

        // First card should have the matching ID
        const firstMatchId = await cards.first().locator('.idl-id').textContent();
        expect(firstMatchId).toBe(protocolId);
      }
    }
  });

  test('should search case-insensitively', async ({ page }) => {
    await page.waitForSelector('.idl-grid, .empty-state', { timeout: 10000 });

    const isEmpty = await page.locator('.empty-state').isVisible().catch(() => false);

    if (!isEmpty) {
      const firstCard = page.locator('.idl-card').first();
      const protocolName = await firstCard.locator('h3').textContent();

      if (protocolName && protocolName.length > 2) {
        const searchBox = page.locator('.search-box input');

        // Search with lowercase
        await searchBox.fill(protocolName.toLowerCase());
        await page.waitForTimeout(500);
        const lowerCount = await page.locator('.idl-card').count();

        // Search with uppercase
        await searchBox.clear();
        await searchBox.fill(protocolName.toUpperCase());
        await page.waitForTimeout(500);
        const upperCount = await page.locator('.idl-card').count();

        // Should return same results
        expect(lowerCount).toBe(upperCount);
      }
    }
  });

  test('should have Arweave link for protocols with arweaveId', async ({ page }) => {
    await page.waitForSelector('.idl-grid, .empty-state', { timeout: 10000 });

    const isEmpty = await page.locator('.empty-state').isVisible().catch(() => false);

    if (!isEmpty) {
      const cards = page.locator('.idl-card');
      const count = await cards.count();

      // Check if any card has Arweave link
      for (let i = 0; i < count; i++) {
        const card = cards.nth(i);
        const arweaveLink = card.locator('a', { hasText: 'Arweave' });
        const hasArweaveLink = await arweaveLink.isVisible().catch(() => false);

        if (hasArweaveLink) {
          const href = await arweaveLink.getAttribute('href');
          expect(href).toMatch(/https:\/\/arweave\.net\/.+/);
          await expect(arweaveLink).toHaveAttribute('target', '_blank');
          await expect(arweaveLink).toHaveAttribute('rel', 'noopener noreferrer');
          break; // Found at least one, test passes
        }
      }
    }
  });

  test('should be responsive', async ({ page }) => {
    await page.waitForSelector('.idl-grid, .empty-state', { timeout: 10000 });

    // Test desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator('.registry-page')).toBeVisible();
    await expect(page.locator('.search-box')).toBeVisible();

    // Test tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('.registry-page')).toBeVisible();
    await expect(page.locator('.search-box')).toBeVisible();

    // Test mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('.registry-page')).toBeVisible();
    await expect(page.locator('.search-box')).toBeVisible();
  });

  test('should clear search when input is cleared', async ({ page }) => {
    await page.waitForSelector('.idl-grid, .empty-state', { timeout: 10000 });

    const isEmpty = await page.locator('.empty-state').isVisible().catch(() => false);

    if (!isEmpty) {
      const searchBox = page.locator('.search-box input');
      const initialCount = await page.locator('.idl-card').count();

      // Add search term
      await searchBox.fill('test');
      await page.waitForTimeout(500);

      // Clear search
      await searchBox.clear();
      await page.waitForTimeout(500);

      // Should show all cards again
      const finalCount = await page.locator('.idl-card').count();
      expect(finalCount).toBe(initialCount);
    }
  });

  test('should navigate from home page', async ({ page }) => {
    await page.goto('/');

    // Navigate to registry (via navigation menu)
    const registryLink = page.getByRole('link', { name: /registry/i });
    if (await registryLink.isVisible()) {
      await registryLink.click();
      await page.waitForURL('**/registry');
      await expect(page).toHaveURL(/\/registry/);
    }
  });
});
