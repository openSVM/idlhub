const { chromium } = require('playwright');

async function testUnifiedHeader() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  // Test Registry Page
  console.log('Testing Registry page header...');
  await page.goto('http://localhost:5174/app/registry');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'screenshot-unified-registry.png', fullPage: true });

  const registryTitle = await page.locator('h1').first().textContent();
  const registryStats = await page.locator('.stat').count();
  const registryTheme = await page.locator('.theme-btn').count();
  console.log(`Registry - Title: "${registryTitle}"`);
  console.log(`Registry - Stats: ${registryStats} stats`);
  console.log(`Registry - Theme: ${registryTheme} theme button`);

  // Test Protocol Page
  console.log('\nTesting Protocol page header...');
  await page.goto('http://localhost:5174/app/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'screenshot-unified-protocol.png', fullPage: true });

  const protocolTitle = await page.locator('h1').first().textContent();
  const protocolStats = await page.locator('.stat').count();
  const protocolTheme = await page.locator('.theme-btn').count();
  console.log(`Protocol - Title: "${protocolTitle}"`);
  console.log(`Protocol - Stats: ${protocolStats} stats`);
  console.log(`Protocol - Theme: ${protocolTheme} theme button`);

  // Verify consistency
  console.log('\n--- Header Consistency Check ---');
  console.log(`Titles match: ${registryTitle === protocolTitle ? 'YES ✓' : 'NO ✗'}`);
  console.log(`Stats count match: ${registryStats === protocolStats ? 'YES ✓' : 'NO ✗'}`);
  console.log(`Theme buttons match: ${registryTheme === protocolTheme ? 'YES ✓' : 'NO ✗'}`);

  await browser.close();

  console.log('\nScreenshots saved:');
  console.log('  - screenshot-unified-registry.png');
  console.log('  - screenshot-unified-protocol.png');
}

testUnifiedHeader().catch(console.error);
