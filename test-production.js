// Test production site for TDZ error
import { chromium } from 'playwright';

(async () => {
  console.log('🌐 Opening https://idlhub.com in Playwright browser...\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Collect console messages
  const consoleMessages = [];
  const errors = [];

  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push({ type: msg.type(), text });
    console.log(`[${msg.type().toUpperCase()}] ${text}`);
  });

  page.on('pageerror', error => {
    errors.push(error.message);
    console.error('❌ PAGE ERROR:', error.message);
  });

  try {
    console.log('Navigating to https://idlhub.com...');
    await page.goto('https://idlhub.com', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('\n✅ Page loaded successfully!');

    // Wait a bit for React to initialize
    await page.waitForTimeout(3000);

    // Check for the specific TDZ error
    const hasTDZError = errors.some(err =>
      err.includes('Cannot access') && err.includes('before initialization')
    );

    const hasJeError = consoleMessages.some(msg =>
      msg.text.includes('je') && msg.text.includes('before initialization')
    );

    console.log('\n' + '='.repeat(60));
    console.log('TEST RESULTS:');
    console.log('='.repeat(60));

    if (hasTDZError || hasJeError) {
      console.log('❌ FAILED: TDZ error still present!');
      console.log('\nErrors found:');
      errors.forEach(err => console.log('  - ' + err));
    } else {
      console.log('✅ SUCCESS: No TDZ errors detected!');
      console.log('✅ Page loads without "Cannot access \'je\' before initialization"');
    }

    console.log('\nTotal console messages:', consoleMessages.length);
    console.log('Total errors:', errors.length);
    console.log('='.repeat(60));

    // Keep browser open for 10 seconds for manual inspection
    console.log('\n👀 Browser will stay open for 10 seconds for inspection...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('\n❌ Navigation failed:', error.message);
  } finally {
    await browser.close();
    console.log('\n✅ Test complete. Browser closed.');
  }
})();
