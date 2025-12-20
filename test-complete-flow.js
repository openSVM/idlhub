const { chromium } = require('playwright');

async function testCompleteFlow() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  console.log('Step 1: Testing Registry with metrics...');
  await page.goto('http://localhost:5174/app/registry');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000); // Wait for metrics to load

  await page.screenshot({ path: 'screenshot-registry-with-metrics.png', fullPage: true });

  const protocolsWithMetrics = await page.locator('.protocol-metrics').count();
  console.log(`  Found ${protocolsWithMetrics} protocols with metrics displayed`);

  console.log('\nStep 2: Testing "Bet on Metrics" navigation...');
  // Click first "Bet on Metrics" button
  const betButton = await page.locator('.btn-bet').first();
  if (await betButton.isVisible()) {
    await betButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'screenshot-bet-tab-with-markets.png', fullPage: true });

    const markets = await page.locator('.market-card').count();
    console.log(`  Found ${markets} auto-generated markets in Bet tab`);
  }

  console.log('\nStep 3: Testing hash routing with #bet-kamino...');
  await page.goto('http://localhost:5174/app/#bet-kamino');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'screenshot-hash-routing.png', fullPage: true });

  const activeBetTab = await page.locator('.tab-btn.active').textContent();
  console.log(`  Active tab: ${activeBetTab}`);

  await browser.close();

  console.log('\n=== Test Complete ===');
  console.log('Screenshots saved:');
  console.log('  - screenshot-registry-with-metrics.png');
  console.log('  - screenshot-bet-tab-with-markets.png');
  console.log('  - screenshot-hash-routing.png');
}

testCompleteFlow().catch(console.error);
