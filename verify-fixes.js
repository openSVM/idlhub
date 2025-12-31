import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  console.log('Checking https://idlhub.com fixes...\n');

  await page.goto('https://idlhub.com', { waitUntil: 'networkidle' });
  await page.waitForSelector('.protocols-table');

  // Check 1: Load More button
  const loadMoreBtn = await page.$('.load-more-btn');
  console.log('✓ Load More button:', loadMoreBtn ? 'PRESENT' : 'MISSING');

  if (loadMoreBtn) {
    const btnText = await loadMoreBtn.textContent();
    console.log('  Text:', btnText);
  }

  // Check 2: Table columns
  const columns = await page.evaluate(() => {
    const headers = Array.from(document.querySelectorAll('.protocols-table th'));
    return headers.map(h => ({
      class: h.className,
      width: window.getComputedStyle(h).width
    }));
  });

  console.log('\n✓ Table columns:');
  columns.forEach(col => {
    console.log(`  ${col.class.padEnd(20)} width: ${col.width}`);
  });

  // Check 3: Action buttons
  const actionButtons = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.col-actions .icon-btn'));
    return btns.slice(0, 2).map(btn => ({
      text: btn.textContent.trim(),
      width: window.getComputedStyle(btn).width,
      height: window.getComputedStyle(btn).height,
      padding: window.getComputedStyle(btn).padding,
      border: window.getComputedStyle(btn).border,
    }));
  });

  console.log('\n✓ Action buttons (first row):');
  actionButtons.forEach((btn, i) => {
    console.log(`  Button ${i + 1} (${btn.text}):`);
    console.log(`    Size: ${btn.width} x ${btn.height}`);
    console.log(`    Padding: ${btn.padding}`);
    console.log(`    Border: ${btn.border}`);
  });

  // Screenshot first 5 rows
  await page.evaluate(() => {
    const rows = document.querySelectorAll('.protocol-row');
    rows.forEach((row, i) => {
      if (i > 5) row.style.display = 'none';
    });
  });

  const table = await page.$('.protocols-table-container');
  await table.screenshot({ path: '/tmp/idlhub-fixed.png' });
  console.log('\n✓ Screenshot saved: /tmp/idlhub-fixed.png');

  // Performance check
  const metrics = await page.evaluate(() => {
    const perf = performance.getEntriesByType('navigation')[0];
    return {
      domParse: (perf.domContentLoadedEventEnd - perf.responseEnd).toFixed(0),
      total: (perf.loadEventEnd - perf.fetchStart).toFixed(0)
    };
  });

  console.log('\n✓ Performance:');
  console.log(`  DOM Parse: ${metrics.domParse}ms`);
  console.log(`  Total: ${metrics.total}ms`);

  await page.waitForTimeout(5000);
  await browser.close();
})();
