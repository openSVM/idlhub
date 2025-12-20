const { chromium } = require('playwright');

async function testNavigation() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  // Test Registry Page
  console.log('Testing Registry page...');
  await page.goto('http://localhost:5174/app/pages/registry.html');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000); // Wait for API data

  await page.screenshot({ path: 'screenshot-registry.png', fullPage: true });

  // Check if protocols loaded
  const protocolCards = await page.locator('.protocol-card').count();
  console.log(`Registry: Found ${protocolCards} protocol cards`);

  // Test Protocol Page
  console.log('Testing Protocol page...');
  await page.goto('http://localhost:5174/app/');
  await page.waitForLoadState('networkidle');

  await page.screenshot({ path: 'screenshot-protocol.png', fullPage: true });

  // Check navigation links
  const navLinks = await page.locator('.nav-link').count();
  console.log(`Protocol: Found ${navLinks} navigation links`);

  await browser.close();

  console.log('\nScreenshots saved:');
  console.log('  - screenshot-registry.png');
  console.log('  - screenshot-protocol.png');
}

testNavigation().catch(console.error);
