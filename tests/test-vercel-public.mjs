import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => console.log(`[Vercel Console ${msg.type()}]:`, msg.text()));
  page.on('pageerror', err => console.log('[Vercel PageError]:', err));
  page.on('response', res => {
    if (res.status() >= 400 || res.url().includes('supabase') || res.url().includes('api')) {
      console.log(`[Vercel Network ${res.status()}]:`, res.url());
    }
  });

  console.log('Navigating directly to https://vtautocustomer.vercel.app ...');
  try {
    await page.goto('https://vtautocustomer.vercel.app', { waitUntil: 'networkidle', timeout: 15000 });
  } catch (e) {
    console.log('Navigation timeout or error:', e.message);
  }

  await page.waitForTimeout(3000);
  const skeletons = await page.locator('.animate-pulse').count();
  console.log('Skeletons on Vercel:', skeletons);
  const cars = await page.locator('a[href^="/xe/"]').count();
  console.log('Cars on Vercel:', cars);

  await browser.close();
}

main().catch(console.error);
