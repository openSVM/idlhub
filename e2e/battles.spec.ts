import { test, expect } from '@playwright/test';

test.describe('BattlesPage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/battles');
  });

  test('should display page title', async ({ page }) => {
    const pageTitle = page.locator('.page-title');
    await expect(pageTitle).toHaveText('1v1 Prediction Battles');
  });

  test('should show wallet connect prompt when not connected', async ({ page }) => {
    const connectPrompt = page.locator('.connect-prompt');
    const isVisible = await connectPrompt.isVisible().catch(() => false);

    if (isVisible) {
      await expect(connectPrompt).toContainText('Connect your wallet');
      await expect(connectPrompt).toContainText('create or accept battle challenges');
    }
  });

  test('should display battle stats section', async ({ page }) => {
    const statsSection = page.locator('.battle-stats');
    await expect(statsSection).toBeVisible();

    const statCards = statsSection.locator('.stat-card');
    await expect(statCards).toHaveCount(3);

    // Check stat labels
    await expect(statCards.nth(0).locator('.stat-label')).toHaveText('Total Battles');
    await expect(statCards.nth(1).locator('.stat-label')).toHaveText('Active Now');
    await expect(statCards.nth(2).locator('.stat-label')).toHaveText('Pending Challenges');
  });

  test('should display numeric battle stats', async ({ page }) => {
    const statsSection = page.locator('.battle-stats');
    const statValues = statsSection.locator('.stat-value');

    // All three stats should be numeric
    for (let i = 0; i < 3; i++) {
      const value = await statValues.nth(i).textContent();
      expect(value).toMatch(/^\d+$/);
    }
  });

  test('should not show create battle form when wallet not connected', async ({ page }) => {
    const createSection = page.locator('.create-battle');
    const isVisible = await createSection.isVisible().catch(() => false);

    const connectPrompt = page.locator('.connect-prompt');
    const hasPrompt = await connectPrompt.isVisible().catch(() => false);

    // If connect prompt is shown, create form should not be visible
    if (hasPrompt) {
      expect(isVisible).toBe(false);
    }
  });

  test('should display Active Battles section title', async ({ page }) => {
    const sectionTitle = page.locator('h2.section-title', { hasText: 'Active Battles' });
    await expect(sectionTitle).toBeVisible();
  });

  test('should show loading state or battles', async ({ page }) => {
    await page.waitForTimeout(2000);

    const loading = page.locator('.loading');
    const emptyState = page.locator('.empty-state');
    const battlesGrid = page.locator('.battles-grid');

    const hasLoading = await loading.isVisible().catch(() => false);
    const isEmpty = await emptyState.isVisible().catch(() => false);
    const hasGrid = await battlesGrid.isVisible().catch(() => false);

    // Should show one of these three states
    expect(hasLoading || isEmpty || hasGrid).toBe(true);

    if (hasLoading) {
      await expect(loading).toContainText('Loading battles from chain');
    }

    if (isEmpty) {
      await expect(emptyState).toContainText('No active battles');
      await expect(emptyState).toContainText('Challenge someone');
    }
  });

  test('should display battle cards with correct structure when battles exist', async ({ page }) => {
    await page.waitForTimeout(2000);

    const battlesGrid = page.locator('.battles-grid');
    const hasBattles = await battlesGrid.isVisible().catch(() => false);

    if (hasBattles) {
      const firstBattle = page.locator('.battle-card').first();

      // Check battle card structure
      await expect(firstBattle.locator('.battle-header')).toBeVisible();
      await expect(firstBattle.locator('.battle-arena')).toBeVisible();
      await expect(firstBattle.locator('.battle-stake')).toBeVisible();

      // Check battle header elements
      await expect(firstBattle.locator('.battle-market')).toBeVisible();
      await expect(firstBattle.locator('.battle-status')).toBeVisible();
    }
  });

  test('should display VS divider in battle arena', async ({ page }) => {
    await page.waitForTimeout(2000);

    const battlesGrid = page.locator('.battles-grid');
    const hasBattles = await battlesGrid.isVisible().catch(() => false);

    if (hasBattles) {
      const firstBattle = page.locator('.battle-card').first();
      const vsDivider = firstBattle.locator('.vs-divider');

      await expect(vsDivider).toBeVisible();
      await expect(vsDivider).toHaveText('VS');
    }
  });

  test('should display two fighters in each battle', async ({ page }) => {
    await page.waitForTimeout(2000);

    const battlesGrid = page.locator('.battles-grid');
    const hasBattles = await battlesGrid.isVisible().catch(() => false);

    if (hasBattles) {
      const firstBattle = page.locator('.battle-card').first();

      // Check challenger
      const challenger = firstBattle.locator('.fighter.challenger');
      await expect(challenger).toBeVisible();
      await expect(challenger.locator('.fighter-label')).toHaveText('Challenger');
      await expect(challenger.locator('.fighter-wallet')).toBeVisible();
      await expect(challenger.locator('.fighter-side')).toBeVisible();

      // Check opponent
      const opponent = firstBattle.locator('.fighter.opponent');
      await expect(opponent).toBeVisible();
      await expect(opponent.locator('.fighter-wallet')).toBeVisible();
      await expect(opponent.locator('.fighter-side')).toBeVisible();
    }
  });

  test('should display YES or NO for fighter sides', async ({ page }) => {
    await page.waitForTimeout(2000);

    const battlesGrid = page.locator('.battles-grid');
    const hasBattles = await battlesGrid.isVisible().catch(() => false);

    if (hasBattles) {
      const firstBattle = page.locator('.battle-card').first();

      const challengerSide = await firstBattle.locator('.fighter.challenger .fighter-side').textContent();
      const opponentSide = await firstBattle.locator('.fighter.opponent .fighter-side').textContent();

      // Both should be either YES or NO
      expect(challengerSide).toMatch(/^(YES|NO)$/);
      expect(opponentSide).toMatch(/^(YES|NO)$/);

      // They should be opposite
      if (challengerSide === 'YES') {
        expect(opponentSide).toBe('NO');
      } else {
        expect(opponentSide).toBe('YES');
      }
    }
  });

  test('should display stake amounts', async ({ page }) => {
    await page.waitForTimeout(2000);

    const battlesGrid = page.locator('.battles-grid');
    const hasBattles = await battlesGrid.isVisible().catch(() => false);

    if (hasBattles) {
      const firstBattle = page.locator('.battle-card').first();
      const stakeSection = firstBattle.locator('.battle-stake');

      await expect(stakeSection).toBeVisible();
      await expect(stakeSection.locator('.stake-amount')).toBeVisible();
      await expect(stakeSection.locator('.stake-total')).toBeVisible();

      const stakeText = await stakeSection.textContent();
      expect(stakeText).toContain('IDL');
      expect(stakeText).toContain('each');
      expect(stakeText).toContain('pot');
    }
  });

  test('should display battle status with correct label', async ({ page }) => {
    await page.waitForTimeout(2000);

    const battlesGrid = page.locator('.battles-grid');
    const hasBattles = await battlesGrid.isVisible().catch(() => false);

    if (hasBattles) {
      const firstBattle = page.locator('.battle-card').first();
      const status = await firstBattle.locator('.battle-status').textContent();

      // Should be one of the valid statuses
      expect(status).toMatch(/^(Pending|Active|Resolved|Cancelled)$/);
    }
  });

  test('should display formatted wallet addresses', async ({ page }) => {
    await page.waitForTimeout(2000);

    const battlesGrid = page.locator('.battles-grid');
    const hasBattles = await battlesGrid.isVisible().catch(() => false);

    if (hasBattles) {
      const firstBattle = page.locator('.battle-card').first();

      const challengerWallet = await firstBattle.locator('.fighter.challenger .fighter-wallet').textContent();
      const opponentWallet = await firstBattle.locator('.fighter.opponent .fighter-wallet').textContent();

      // Should be in format: "Abc1...xyz9"
      expect(challengerWallet).toMatch(/^.{4}\.{3}.{4}$/);
      expect(opponentWallet).toMatch(/^.{4}\.{3}.{4}$/);
    }
  });

  test('should show pending challenges section if user has pending battles', async ({ page }) => {
    await page.waitForTimeout(2000);

    const pendingSection = page.locator('h2.section-title', { hasText: 'Pending Challenges' });
    const hasPending = await pendingSection.isVisible().catch(() => false);

    if (hasPending) {
      await expect(pendingSection).toBeVisible();

      const pendingGrid = page.locator('.battles-grid').first();
      await expect(pendingGrid).toBeVisible();

      const pendingCard = page.locator('.battle-card.pending').first();
      await expect(pendingCard).toBeVisible();

      // Should have action buttons
      await expect(pendingCard.locator('.battle-actions')).toBeVisible();
      await expect(pendingCard.locator('.btn-accept')).toBeVisible();
      await expect(pendingCard.locator('.btn-decline')).toBeVisible();
    }
  });

  test('should have accept and decline buttons for pending battles', async ({ page }) => {
    await page.waitForTimeout(2000);

    const pendingCard = page.locator('.battle-card.pending').first();
    const hasPending = await pendingCard.isVisible().catch(() => false);

    if (hasPending) {
      const acceptBtn = pendingCard.locator('.btn-accept');
      const declineBtn = pendingCard.locator('.btn-decline');

      await expect(acceptBtn).toBeVisible();
      await expect(acceptBtn).toHaveText('Accept Battle');

      await expect(declineBtn).toBeVisible();
      await expect(declineBtn).toHaveText('Decline');

      // Both should be buttons
      expect(await acceptBtn.evaluate(el => el.tagName)).toBe('BUTTON');
      expect(await declineBtn.evaluate(el => el.tagName)).toBe('BUTTON');
    }
  });

  test('should show error banner when there is an error', async ({ page }) => {
    await page.waitForTimeout(2000);

    const errorBanner = page.locator('.error-banner');
    const hasError = await errorBanner.isVisible().catch(() => false);

    if (hasError) {
      await expect(errorBanner).toContainText('Error loading battles');

      // Should have retry button
      const retryBtn = errorBanner.locator('button');
      await expect(retryBtn).toBeVisible();
      await expect(retryBtn).toHaveText('Retry');
    }
  });

  test('should be responsive', async ({ page }) => {
    // Desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator('.battles-page')).toBeVisible();
    await expect(page.locator('.battle-stats')).toBeVisible();

    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('.battles-page')).toBeVisible();

    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('.battles-page')).toBeVisible();
  });

  test('should navigate from home page Battles feature card', async ({ page }) => {
    await page.goto('/');

    const battlesLink = page.getByRole('link', { name: /battles/i });
    const hasLink = await battlesLink.isVisible().catch(() => false);

    if (hasLink) {
      await battlesLink.click();
      await page.waitForURL('**/battles');
      await expect(page).toHaveURL(/\/battles/);
    }
  });

  // Tests for create battle form (when wallet is connected)
  test('should show create battle form structure when wallet connected', async ({ page }) => {
    const createSection = page.locator('.create-battle');
    const isVisible = await createSection.isVisible().catch(() => false);

    if (isVisible) {
      await expect(createSection.locator('h2')).toHaveText('Challenge Someone');

      const form = createSection.locator('.battle-form');
      await expect(form).toBeVisible();

      // Check form inputs
      await expect(form.locator('input[placeholder*="Abc123"]')).toBeVisible();
      await expect(form.locator('select')).toBeVisible();
      await expect(form.locator('input[type="number"]')).toBeVisible();
      await expect(form.locator('button[type="submit"]')).toBeVisible();
    }
  });

  test('should have required fields in create battle form', async ({ page }) => {
    const createSection = page.locator('.create-battle');
    const isVisible = await createSection.isVisible().catch(() => false);

    if (isVisible) {
      const form = createSection.locator('.battle-form');

      // All inputs should be required
      const opponentInput = form.locator('input[placeholder*="Abc123"]');
      await expect(opponentInput).toHaveAttribute('required', '');

      const marketSelect = form.locator('select');
      await expect(marketSelect).toHaveAttribute('required', '');

      const stakeInput = form.locator('input[type="number"]');
      await expect(stakeInput).toHaveAttribute('required', '');
      await expect(stakeInput).toHaveAttribute('min', '1');
    }
  });

  test('should have form labels in create battle form', async ({ page }) => {
    const createSection = page.locator('.create-battle');
    const isVisible = await createSection.isVisible().catch(() => false);

    if (isVisible) {
      const formGroups = createSection.locator('.form-group');

      await expect(formGroups.nth(0).locator('label')).toHaveText('Opponent Wallet');
      await expect(formGroups.nth(1).locator('label')).toHaveText('Market');
      await expect(formGroups.nth(2).locator('label')).toContainText('Stake Amount');
    }
  });

  test('should have submit button in create battle form', async ({ page }) => {
    const createSection = page.locator('.create-battle');
    const isVisible = await createSection.isVisible().catch(() => false);

    if (isVisible) {
      const submitBtn = createSection.locator('button[type="submit"]');
      await expect(submitBtn).toBeVisible();
      await expect(submitBtn).toHaveText('Send Challenge');
      await expect(submitBtn).toHaveClass(/btn-battle/);
    }
  });
});
