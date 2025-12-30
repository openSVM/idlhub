import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  await page.goto('https://idlhub.com', { waitUntil: 'networkidle' });
  await page.waitForSelector('.protocols-table');

  // Screenshot first 5 rows only
  await page.evaluate(() => {
    const rows = document.querySelectorAll('.protocol-row');
    rows.forEach((row, i) => {
      if (i > 5) row.style.display = 'none';
    });
  });

  const table = await page.$('.protocols-table');
  await table.screenshot({ path: '/tmp/table-top-rows.png' });
  console.log('Top rows screenshot: /tmp/table-top-rows.png');

  // Get actual badge text
  const badgeTexts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.tx-verify-badge, .badge-available, .badge-placeholder'))
      .slice(0, 10)
      .map(b => b.textContent.trim());
  });

  console.log('\nFirst 10 badge texts:');
  badgeTexts.forEach((text, i) => console.log(`${i + 1}. "${text}"`));

  await page.waitForTimeout(30000);
  await browser.close();
})();
