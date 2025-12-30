import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  console.log('Opening https://idlhub.com...');
  await page.goto('https://idlhub.com', { waitUntil: 'networkidle' });

  // Wait for table to load
  await page.waitForSelector('.protocols-table', { timeout: 10000 });

  // Take screenshot of just the table area
  const table = await page.$('.protocols-table');
  if (table) {
    await table.screenshot({ path: '/tmp/table-only.png' });
    console.log('Table screenshot saved to /tmp/table-only.png');
  }

  // Get table metrics
  const metrics = await page.evaluate(() => {
    const table = document.querySelector('.protocols-table');
    const rows = document.querySelectorAll('.protocol-row');
    const badges = document.querySelectorAll('.tx-verify-badge, .badge-available, .badge-placeholder');

    const truncatedBadges = [];
    badges.forEach((badge, i) => {
      if (badge.scrollWidth > badge.clientWidth) {
        truncatedBadges.push({
          index: i,
          text: badge.textContent,
          scrollWidth: badge.scrollWidth,
          clientWidth: badge.clientWidth
        });
      }
    });

    return {
      tableWidth: table ? table.offsetWidth : 0,
      rowCount: rows.length,
      badgeCount: badges.length,
      truncatedCount: truncatedBadges.length,
      truncatedBadges: truncatedBadges.slice(0, 5)
    };
  });

  console.log('\nTable Metrics:');
  console.log('- Table width:', metrics.tableWidth + 'px');
  console.log('- Rows:', metrics.rowCount);
  console.log('- Total badges:', metrics.badgeCount);
  console.log('- Truncated badges:', metrics.truncatedCount);

  if (metrics.truncatedBadges.length > 0) {
    console.log('\nTruncated badges (first 5):');
    metrics.truncatedBadges.forEach(b => {
      console.log(`  "${b.text}" - scroll:${b.scrollWidth}px, client:${b.clientWidth}px`);
    });
  } else {
    console.log('\n✅ NO TRUNCATED BADGES!');
  }

  console.log('\nKeeping browser open for 60 seconds for inspection...');
  await page.waitForTimeout(60000);

  await browser.close();
})();
