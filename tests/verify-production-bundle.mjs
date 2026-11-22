import { chromium } from '@playwright/test';

async function testBundle() {
  console.log('Testing production bundle in headless browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });

  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });

  // Wait 2 seconds for any deferred async imports or react rendering
  await page.waitForTimeout(2000);

  const rootHtml = await page.$eval('#root', (el) => el.innerHTML);
  const title = await page.title();

  console.log('Page Title:', title);
  console.log('Root HTML length:', rootHtml.length);
  console.log('Page errors:', pageErrors);
  console.log('Console errors:', consoleErrors);

  await browser.close();

  // Verify that the fatal supabaseUrl error did NOT occur
  const fatalSupabaseError = pageErrors.concat(consoleErrors).some(
    (e) => e.includes('supabaseUrl is required') || e.includes('supabaseAnonKey is required')
  );

  if (fatalSupabaseError) {
    throw new Error('Fatal Supabase configuration error detected in bundle!');
  }

  if (rootHtml.length === 0) {
    throw new Error('White screen detected: #root is empty!');
  }

  console.log('✅ SUCCESS: Production build renders without white screen and without Supabase error!');
}

testBundle().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
