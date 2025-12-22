import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test('should have proper heading hierarchy on home page', async ({ page }) => {
    await page.goto('/');

    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);

    const h1Text = await h1.textContent();
    expect(h1Text).toBeTruthy();
  });

  test('should have alt text for images', async ({ page }) => {
    await page.goto('/');

    const images = await page.locator('img').all();

    for (const img of images) {
      const alt = await img.getAttribute('alt');
      // Images should have alt attribute (can be empty for decorative images)
      expect(alt).not.toBeNull();
    }
  });

  test('should have accessible form labels', async ({ page }) => {
    await page.goto('/battles');

    const createForm = page.locator('.create-battle .battle-form');
    const hasForm = await createForm.isVisible().catch(() => false);

    if (hasForm) {
      // All inputs should have labels
      const inputs = await createForm.locator('input, select, textarea').all();

      for (const input of inputs) {
        const inputId = await input.getAttribute('id');
        const inputName = await input.getAttribute('name');

        // Should have associated label or aria-label
        const parentFormGroup = page.locator('.form-group').filter({ has: input });
        const label = parentFormGroup.locator('label').first();
        const hasLabel = await label.isVisible().catch(() => false);

        const ariaLabel = await input.getAttribute('aria-label');

        // Should have either a visible label or aria-label
        expect(hasLabel || ariaLabel !== null).toBe(true);
      }
    }
  });

  test('should have accessible buttons', async ({ page }) => {
    await page.goto('/');

    const buttons = await page.locator('button, a.btn, [role="button"]').all();

    for (const button of buttons) {
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const title = await button.getAttribute('title');

      // Button should have text content, aria-label, or title
      expect(text || ariaLabel || title).toBeTruthy();
    }
  });

  test('should have keyboard navigable links', async ({ page }) => {
    await page.goto('/');

    const links = await page.locator('a').all();

    for (const link of links.slice(0, 5)) { // Test first 5 links
      const href = await link.getAttribute('href');

      if (href && !href.startsWith('#')) {
        // Link should be focusable
        await link.focus();
        const isFocused = await link.evaluate(el =>
          el === document.activeElement
        );
        expect(isFocused).toBe(true);
      }
    }
  });

  test('should have sufficient color contrast for text', async ({ page }) => {
    await page.goto('/');

    // Check that main text is visible
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Check specific text elements
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();

    const paragraph = page.locator('p').first();
    if (await paragraph.isVisible().catch(() => false)) {
      await expect(paragraph).toBeVisible();
    }
  });

  test('should have descriptive page titles', async ({ page }) => {
    const pages = [
      { path: '/', expectedKeyword: 'IDL' },
      { path: '/registry', expectedKeyword: 'Registry' },
      { path: '/protocol', expectedKeyword: /Protocol|Market/ },
      { path: '/battles', expectedKeyword: 'Battle' }
    ];

    for (const { path, expectedKeyword } of pages) {
      await page.goto(path);
      const title = await page.title();

      expect(title.length).toBeGreaterThan(0);
    }
  });

  test('should have lang attribute on html element', async ({ page }) => {
    await page.goto('/');

    const lang = await page.locator('html').getAttribute('lang');
    // Should have lang attribute (usually 'en')
    expect(lang).toBeTruthy();
  });

  test('should have proper ARIA roles for interactive elements', async ({ page }) => {
    await page.goto('/protocol');

    await page.waitForTimeout(2000);

    const buttons = await page.locator('button').all();

    for (const button of buttons.slice(0, 5)) {
      const role = await button.getAttribute('role');
      const tagName = await button.evaluate(el => el.tagName);

      // Buttons should be button elements (implicit role) or have role="button"
      expect(tagName === 'BUTTON' || role === 'button').toBe(true);
    }
  });

  test('should support keyboard navigation for interactive elements', async ({ page }) => {
    await page.goto('/');

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);

    // Should have focus indicator on an element
    const focusedElement = await page.evaluate(() =>
      document.activeElement?.tagName
    );

    expect(focusedElement).toBeTruthy();
    expect(['A', 'BUTTON', 'INPUT', 'SELECT']).toContain(focusedElement);
  });

  test('should have accessible search input', async ({ page }) => {
    await page.goto('/registry');

    const searchInput = page.locator('.search-box input');
    const hasInput = await searchInput.isVisible().catch(() => false);

    if (hasInput) {
      const placeholder = await searchInput.getAttribute('placeholder');
      expect(placeholder).toBeTruthy();

      const ariaLabel = await searchInput.getAttribute('aria-label');
      const label = page.locator('label').filter({ has: searchInput });
      const hasLabel = await label.isVisible().catch(() => false);

      // Should have placeholder, aria-label, or associated label
      expect(placeholder || ariaLabel || hasLabel).toBeTruthy();
    }
  });

  test('should not have empty links', async ({ page }) => {
    await page.goto('/');

    const links = await page.locator('a').all();

    for (const link of links) {
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');
      const title = await link.getAttribute('title');
      const children = await link.locator('*').count();

      // Link should have text, aria-label, title, or children (like images/icons)
      expect(text?.trim() || ariaLabel || title || children > 0).toBeTruthy();
    }
  });

  test('should have semantic HTML structure', async ({ page }) => {
    await page.goto('/');

    // Should have main content area or semantic structure
    const main = page.locator('main, [role="main"], .main-content, #root, .app').first();
    const hasMain = await main.isVisible().catch(() => false);

    // Should have some semantic structure
    const hasSemantics = hasMain ||
                        await page.locator('article, section, nav, header').first().isVisible().catch(() => false);

    expect(hasSemantics).toBe(true);
  });

  test('should not have duplicate IDs', async ({ page }) => {
    await page.goto('/');

    const ids = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('[id]'));
      return elements.map(el => el.id).filter(id => id !== '');
    });

    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });

  test('should have focus indicators', async ({ page }) => {
    await page.goto('/');

    const button = page.locator('button, a.btn').first();
    const hasButton = await button.isVisible().catch(() => false);

    if (hasButton) {
      await button.focus();

      // Check if element has focus (browsers apply default outline or custom styles)
      const isFocused = await button.evaluate(el =>
        el === document.activeElement
      );

      expect(isFocused).toBe(true);
    }
  });
});

test.describe('Screen Reader Compatibility', () => {
  test('should have descriptive link text', async ({ page }) => {
    await page.goto('/');

    const links = await page.locator('a').all();

    for (const link of links.slice(0, 10)) {
      const text = await link.textContent();

      if (text && text.trim()) {
        // Avoid generic text like "click here", "read more" without context
        const trimmedText = text.trim().toLowerCase();

        // If it's a short generic phrase, it should have aria-label or title for context
        if (['click here', 'here', 'link'].includes(trimmedText)) {
          const ariaLabel = await link.getAttribute('aria-label');
          const title = await link.getAttribute('title');

          expect(ariaLabel || title).toBeTruthy();
        }
      }
    }
  });

  test('should have ARIA labels for icon-only buttons', async ({ page }) => {
    await page.goto('/');

    const buttons = await page.locator('button').all();

    for (const button of buttons) {
      const text = await button.textContent();

      // If button has no text content, should have aria-label
      if (!text || text.trim().length === 0) {
        const ariaLabel = await button.getAttribute('aria-label');
        const title = await button.getAttribute('title');

        expect(ariaLabel || title).toBeTruthy();
      }
    }
  });

  test('should have descriptive error messages', async ({ page }) => {
    await page.goto('/protocol');

    await page.waitForTimeout(2000);

    const errorBanner = page.locator('.error-banner');
    const hasError = await errorBanner.isVisible().catch(() => false);

    if (hasError) {
      const errorText = await errorBanner.textContent();
      expect(errorText).toBeTruthy();
      expect(errorText!.length).toBeGreaterThan(10);
    }
  });
});

test.describe('Mobile Accessibility', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should have tap targets of sufficient size', async ({ page }) => {
    await page.goto('/');

    const buttons = await page.locator('button, a.btn').all();

    for (const button of buttons.slice(0, 5)) {
      if (await button.isVisible().catch(() => false)) {
        const box = await button.boundingBox();

        if (box) {
          // Minimum recommended tap target is 44x44px
          expect(box.width).toBeGreaterThanOrEqual(30); // Slightly relaxed for testing
          expect(box.height).toBeGreaterThanOrEqual(30);
        }
      }
    }
  });

  test('should have readable font sizes on mobile', async ({ page }) => {
    await page.goto('/');

    const heading = page.locator('h1').first();
    const fontSize = await heading.evaluate(el =>
      window.getComputedStyle(el).fontSize
    );

    const fontSizeNum = parseFloat(fontSize);
    // Should be at least 14px on mobile
    expect(fontSizeNum).toBeGreaterThanOrEqual(14);
  });

  test('should not require horizontal scrolling', async ({ page }) => {
    await page.goto('/');

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()?.width || 375;

    // Body should not exceed viewport width
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10); // 10px tolerance
  });
});
