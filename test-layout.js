import { chromium } from 'playwright';

(async () => {
  console.log('Checking layout on https://idlhub.com...\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000
  });

  const page = await browser.newPage();

  await page.goto('https://idlhub.com', { waitUntil: 'networkidle' });

  console.log('Page loaded. Taking screenshot...');
  await page.screenshot({ path: '/tmp/idlhub-layout.png', fullPage: true });
  console.log('Screenshot saved to /tmp/idlhub-layout.png');

  // Get viewport dimensions
  const viewport = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight
  }));

  console.log('\nViewport info:', viewport);

  // Check for common layout issues
  const layoutIssues = await page.evaluate(() => {
    const issues = [];

    // Check for horizontal scrollbar
    if (document.documentElement.scrollWidth > document.documentElement.clientWidth) {
      issues.push('Horizontal scrollbar detected - page too wide');
    }

    // Check for elements overflowing
    const allElements = document.querySelectorAll('*');
    let overflowing = 0;
    allElements.forEach(el => {
      if (el.scrollWidth > el.clientWidth + 5) {
        overflowing++;
      }
    });
    if (overflowing > 0) {
      issues.push(overflowing + ' elements overflowing their containers');
    }

    return issues;
  });

  if (layoutIssues.length > 0) {
    console.log('\nLayout Issues Found:');
    layoutIssues.forEach(issue => console.log('  - ' + issue));
  } else {
    console.log('\nNo obvious layout issues detected');
  }

  console.log('\nKeeping browser open for 30 seconds for manual inspection...');
  await page.waitForTimeout(30000);

  await browser.close();
  console.log('Done.');
})();
