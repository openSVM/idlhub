const { chromium } = require('playwright');

async function testFinal() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  // Test root redirect
  console.log('Testing root redirect...');
  await page.goto('http://localhost:5174/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const url = page.url();
  console.log(`Root redirected to: ${url}`);

  // Take screenshot
  await page.screenshot({ path: 'screenshot-final-registry.png', fullPage: true });

  const protocolCards = await page.locator('.protocol-item').count();
  console.log(`Registry: Found ${protocolCards} protocol items`);

  // Test navigation to Protocol page
  console.log('\nTesting navigation to Protocol page...');
  await page.click('a[href="/app/"]');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'screenshot-final-protocol.png', fullPage: true });

  const navLinks = await page.locator('.nav-link').count();
  console.log(`Protocol: Found ${navLinks} nav links`);

  await browser.close();

  console.log('\nFinal screenshots saved:');
  console.log('  - screenshot-final-registry.png');
  console.log('  - screenshot-final-protocol.png');
}

testFinal().catch(console.error);
