import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://idlhub.com', { waitUntil: 'networkidle' });
  await page.waitForSelector('.protocols-table');

  const data = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.protocol-row')).slice(0, 10);

    return rows.map((row, i) => {
      const rateCell = row.querySelector('.col-rate');
      const covCell = row.querySelector('.col-coverage');
      const nameCell = row.querySelector('.protocol-name-cell');

      return {
        name: nameCell?.textContent?.trim() || 'unknown',
        rate: {
          text: rateCell?.textContent?.trim() || '',
          html: rateCell?.innerHTML || '',
          hasSpan: !!rateCell?.querySelector('span'),
          spanText: rateCell?.querySelector('span')?.textContent || 'none'
        },
        coverage: {
          text: covCell?.textContent?.trim() || '',
          html: covCell?.innerHTML || '',
          hasSpan: !!covCell?.querySelector('span'),
          spanText: covCell?.querySelector('span')?.textContent || 'none'
        }
      };
    });
  });

  console.log('First 10 protocols - RATE and COVERAGE values:\n');
  data.forEach((d, i) => {
    console.log(`${i+1}. ${d.name}`);
    console.log(`   RATE: "${d.rate.text}" (span: ${d.rate.spanText})`);
    console.log(`   COVERAGE: "${d.coverage.text}" (span: ${d.coverage.spanText})`);
    console.log();
  });

  await browser.close();
})();
