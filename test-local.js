import { chromium } from 'playwright';

(async () => {
  console.log('Testing LOCAL dev server...\n');

  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => console.log('[' + msg.type().toUpperCase() + '] ' + msg.text()));
  page.on('pageerror', error => {
    errors.push(error);
    console.error('ERROR:', error.message);
    console.error('Stack:', error.stack);
  });

  try {
    console.log('Navigating to http://localhost:5174...');
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    if (errors.length > 0) {
      console.log('\nERRORS FOUND IN DEV MODE:');
      errors.forEach((err, i) => {
        console.log('\nError ' + (i + 1) + ':');
        console.log('Message:', err.message);
        console.log('Stack:', err.stack);
      });
    } else {
      console.log('\nNO ERRORS in development mode!');
    }

    await page.waitForTimeout(10000);
  } catch (error) {
    console.error('\nFailed:', error.message);
  } finally {
    await browser.close();
  }
})();
