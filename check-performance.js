import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Testing https://idlhub.com performance...\n');

  const startTime = Date.now();

  await page.goto('https://idlhub.com', { waitUntil: 'domcontentloaded' });
  const domLoaded = Date.now() - startTime;

  await page.waitForLoadState('networkidle');
  const fullLoad = Date.now() - startTime;

  // Get performance metrics
  const metrics = await page.evaluate(() => {
    const perf = performance.getEntriesByType('navigation')[0];
    return {
      dns: perf.domainLookupEnd - perf.domainLookupStart,
      tcp: perf.connectEnd - perf.connectStart,
      ttfb: perf.responseStart - perf.requestStart,
      download: perf.responseEnd - perf.responseStart,
      domParse: perf.domContentLoadedEventEnd - perf.responseEnd,
      total: perf.loadEventEnd - perf.fetchStart
    };
  });

  // Get resource sizes
  const resources = await page.evaluate(() => {
    const entries = performance.getEntriesByType('resource');
    let totalSize = 0;
    const byType = {};

    entries.forEach(entry => {
      const size = entry.transferSize || 0;
      totalSize += size;

      const type = entry.name.split('.').pop().split('?')[0];
      byType[type] = (byType[type] || 0) + size;
    });

    return {
      total: totalSize,
      count: entries.length,
      byType: Object.entries(byType)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, size]) => ({ type, size }))
    };
  });

  console.log('⏱️  Load Times:');
  console.log(`   DOM Ready:      ${domLoaded}ms`);
  console.log(`   Full Load:      ${fullLoad}ms`);
  console.log();

  console.log('📊 Performance Breakdown:');
  console.log(`   DNS Lookup:     ${metrics.dns.toFixed(0)}ms`);
  console.log(`   TCP Connect:    ${metrics.tcp.toFixed(0)}ms`);
  console.log(`   TTFB:           ${metrics.ttfb.toFixed(0)}ms`);
  console.log(`   Download:       ${metrics.download.toFixed(0)}ms`);
  console.log(`   DOM Parse:      ${metrics.domParse.toFixed(0)}ms`);
  console.log(`   Total:          ${metrics.total.toFixed(0)}ms`);
  console.log();

  console.log('📦 Resources:');
  console.log(`   Total Size:     ${(resources.total / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Total Count:    ${resources.count} files`);
  console.log();
  console.log('   Top 5 by size:');
  resources.byType.forEach(({ type, size }) => {
    console.log(`     .${type.padEnd(6)} ${(size / 1024).toFixed(0)} KB`);
  });

  // Check for slow resources
  const slowResources = await page.evaluate(() => {
    return performance.getEntriesByType('resource')
      .filter(r => r.duration > 500)
      .map(r => ({
        url: r.name.split('/').pop(),
        duration: r.duration.toFixed(0),
        size: r.transferSize || 0
      }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5);
  });

  if (slowResources.length > 0) {
    console.log();
    console.log('🐌 Slowest resources (>500ms):');
    slowResources.forEach(r => {
      console.log(`   ${r.url}: ${r.duration}ms (${(r.size / 1024).toFixed(0)} KB)`);
    });
  }

  await browser.close();
})();
