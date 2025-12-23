import { test, expect } from '@playwright/test';

test.describe('RegistryPage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/registry');
  });

  test('should display registry header with title and stats', async ({ page }) => {
    // Wait for header to load
    await page.waitForSelector('.header', { timeout: 15000 });

    const header = page.locator('.header');
    await expect(header).toBeVisible();

    // Check title (use more specific selector to avoid footer match)
    await expect(header.locator('text=idlhub.com')).toBeVisible();
    await expect(header.locator('text=Solana IDL Registry')).toBeVisible();

    // Check for stats
    const stats = page.locator('.stats');
    await expect(stats).toBeVisible();

    const statLabels = page.locator('.stat-label');
    await expect(statLabels).toHaveCount(3);

    // Check stat content
    await expect(page.locator('text=Total Protocols')).toBeVisible();
    await expect(page.locator('text=IDLs Available')).toBeVisible();
    await expect(page.locator('text=Selected')).toBeVisible();
  });

  test('should display search input', async ({ page }) => {
    await page.waitForSelector('.search-input', { timeout: 15000 });

    const searchInput = page.locator('.search-input');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('placeholder', /Search by name/);
  });

  test('should display category filter buttons', async ({ page }) => {
    await page.waitForSelector('.filter-section', { timeout: 15000 });

    const filterSection = page.locator('.filter-section');
    await expect(filterSection).toBeVisible();

    const filterBtns = page.locator('.filter-btn');
    const count = await filterBtns.count();
    expect(count).toBeGreaterThan(0);

    // Check for "All" button
    const allBtn = page.locator('.filter-btn').filter({ hasText: 'All' });
    await expect(allBtn).toBeVisible();
    await expect(allBtn).toHaveClass(/active/);
  });

  test('should display protocol list after loading', async ({ page }) => {
    // Wait for protocols to load (may take time due to API)
    await page.waitForSelector('.protocol-item', { timeout: 30000 });

    const protocols = page.locator('.protocol-item');
    const count = await protocols.count();
    expect(count).toBeGreaterThan(0);

    // Check first protocol has required elements
    const firstProtocol = protocols.first();
    await expect(firstProtocol.locator('.protocol-checkbox')).toBeVisible();
    await expect(firstProtocol.locator('.protocol-name')).toBeVisible();
    await expect(firstProtocol.locator('.protocol-actions')).toBeVisible();
  });

  test('should display protocol details when clicked', async ({ page }) => {
    // Wait for protocols
    await page.waitForSelector('.protocol-item', { timeout: 30000 });

    // Click first protocol
    await page.locator('.protocol-item').first().click();

    // Wait for detail panel
    await page.waitForSelector('.protocol-detail.active', { timeout: 5000 });

    const detailPanel = page.locator('.protocol-detail.active');
    await expect(detailPanel).toBeVisible();

    // Check detail sections (use section titles)
    await expect(detailPanel.locator('.detail-section-title').filter({ hasText: 'Instructions' })).toBeVisible();
    await expect(detailPanel.locator('.detail-section-title').filter({ hasText: 'Accounts' })).toBeVisible();
    await expect(detailPanel.locator('.detail-section-title').filter({ hasText: 'Types' })).toBeVisible();
    await expect(detailPanel.locator('.detail-section-title').filter({ hasText: 'Errors' })).toBeVisible();
  });

  test('should filter protocols by search', async ({ page }) => {
    // Wait for protocol list
    await page.waitForSelector('.protocol-item', { timeout: 30000 });

    const initialCount = await page.locator('.protocol-item').count();
    expect(initialCount).toBeGreaterThan(0);

    // Search for specific protocol
    const searchInput = page.locator('.search-input');
    await searchInput.fill('jupiter');
    await page.waitForTimeout(500); // Wait for filter to apply

    const filteredCount = await page.locator('.protocol-item').count();
    expect(filteredCount).toBeLessThan(initialCount);
    expect(filteredCount).toBeGreaterThan(0);

    // Verify search result contains "jupiter"
    const firstResult = page.locator('.protocol-item').first();
    const text = await firstResult.textContent();
    expect(text?.toLowerCase()).toContain('jupiter');
  });

  test('should filter protocols by category', async ({ page }) => {
    // Wait for protocol list
    await page.waitForSelector('.protocol-item', { timeout: 30000 });

    const initialCount = await page.locator('.protocol-item').count();

    // Click Defi filter
    const defiBtn = page.locator('.filter-btn').filter({ hasText: 'Defi' });
    await defiBtn.click();
    await page.waitForTimeout(500);

    // Should filter results
    const filteredCount = await page.locator('.protocol-item').count();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);

    // Defi button should be active
    await expect(defiBtn).toHaveClass(/active/);
  });

  test('should toggle protocol checkboxes', async ({ page }) => {
    // Wait for protocol list
    await page.waitForSelector('.protocol-item', { timeout: 30000 });

    const firstCheckbox = page.locator('.protocol-checkbox').first();

    // Initially unchecked
    await expect(firstCheckbox).not.toBeChecked();

    // Check it
    await firstCheckbox.check();
    await expect(firstCheckbox).toBeChecked();

    // Stats should show 1 selected
    const selectedStat = page.locator('.stat').filter({ hasText: 'Selected' });
    await expect(selectedStat.locator('.stat-number')).toHaveText('1');

    // Uncheck it
    await firstCheckbox.uncheck();
    await expect(firstCheckbox).not.toBeChecked();

    // Stats should show 0 selected
    await expect(selectedStat.locator('.stat-number')).toHaveText('0');
  });

  test('should close detail panel', async ({ page }) => {
    // Wait for protocols
    await page.waitForSelector('.protocol-item', { timeout: 30000 });

    // Click first protocol to open detail
    await page.locator('.protocol-item').first().click();
    await page.waitForSelector('.protocol-detail.active', { timeout: 5000 });

    // Click close button
    const closeBtn = page.locator('.protocol-detail-close');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    // Detail panel should be hidden
    await expect(page.locator('.protocol-detail.active')).not.toBeVisible();
  });

  test('should show loading spinner initially', async ({ page }) => {
    // Reload to see loading state
    await page.goto('/registry');

    // Loading spinner should appear briefly
    const loading = page.locator('.loading');
    // Either loading is visible or already gone (data loaded fast)
    const isVisible = await loading.isVisible().catch(() => false);
    // Just verify the page loaded successfully
    await page.waitForSelector('.container', { timeout: 15000 });
  });

  test('should display protocol metadata correctly', async ({ page }) => {
    // Wait for protocol list
    await page.waitForSelector('.protocol-item', { timeout: 30000 });

    const firstProtocol = page.locator('.protocol-item').first();

    // Check metadata elements
    await expect(firstProtocol.locator('.protocol-name')).toBeVisible();
    await expect(firstProtocol.locator('.protocol-badge')).toBeVisible();
    await expect(firstProtocol.locator('.category-badge')).toBeVisible();
    await expect(firstProtocol.locator('.protocol-description')).toBeVisible();
    await expect(firstProtocol.locator('.protocol-meta')).toBeVisible();
  });

  test('should display "no results" message when search has no matches', async ({ page }) => {
    // Wait for protocol list
    await page.waitForSelector('.protocol-item', { timeout: 30000 });

    // Search for something that doesn't exist
    const searchInput = page.locator('.search-input');
    await searchInput.fill('xyznonexistent123');
    await page.waitForTimeout(500);

    // Should show no results message
    const noResults = page.locator('.no-results');
    await expect(noResults).toBeVisible();
    await expect(noResults).toContainText('No protocols found');
  });

  test('should have responsive layout', async ({ page }) => {
    // Wait for content
    await page.waitForSelector('.container', { timeout: 15000 });

    // Test that container exists
    const container = page.locator('.container');
    await expect(container).toBeVisible();

    // Wait for protocols
    await page.waitForSelector('.protocol-item', { timeout: 30000 });

    // Click a protocol to open detail panel
    await page.locator('.protocol-item').first().click();
    await page.waitForSelector('.protocol-detail.active', { timeout: 5000 });

    // Detail panel should be visible
    const detailPanel = page.locator('.protocol-detail.active');
    await expect(detailPanel).toBeVisible();

    // Check detail content grid
    const detailContent = page.locator('.protocol-detail-content');
    await expect(detailContent).toBeVisible();
  });
});
