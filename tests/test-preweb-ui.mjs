import { chromium } from 'playwright';
import jwt from '../gara-bot-server/node_modules/jsonwebtoken/index.js';
import dotenv from 'dotenv';
import fs from 'fs';

const parsed = dotenv.parse(fs.readFileSync('gara-bot-server/.env'));
const token = jwt.sign(
  { id: '5952c302-6998-4804-8121-80a663c81fb5', email: 'luuviet2810@gmail.com', name: 'LƯU VĂN VIỆT', role: 'admin' },
  parsed.JWT_SECRET,
  { algorithm: 'HS256', expiresIn: '2h' }
);

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript((tok) => { localStorage.setItem('vtauto_auth_token', tok); }, token);
  const page = await context.newPage();

  const failedImages = [];
  page.on('response', (response) => {
    if (response.request().resourceType() === 'image' && response.status() >= 400) {
      failedImages.push({ url: response.url(), status: response.status() });
    }
  });

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  console.log('--- Navigating to http://localhost:5173/pre-web ---');
  await page.goto('http://localhost:5173/pre-web');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Check 27 vehicles in Pre-Web
  const vehicleRows = page.locator('div[aria-label="Kéo để sắp xếp thứ tự trên website"]');
  const count = await vehicleRows.count();
  console.log('Visible vehicles count in list:', count);

  // Check all images in the vehicle rows
  const allRowImgs = await page.locator('section:has-text("Quản lý xe trên website") img').evaluateAll((imgs) => {
    return imgs.map(img => ({
      src: img.src,
      complete: img.complete,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
    }));
  });
  console.log('Total vehicle cover images in Pre-Web:', allRowImgs.length);
  const brokenCount = allRowImgs.filter(i => i.naturalWidth === 0).length;
  console.log('Broken images count (naturalWidth == 0):', brokenCount);
  console.log('First 5 image sources:');
  allRowImgs.slice(0, 5).forEach((img, idx) => console.log(`#${idx+1}: naturalWidth=${img.naturalWidth} | src=${img.src.substring(0, 80)}...`));

  // Check iframe Preview Website
  console.log('\n--- Checking Preview Website iframe ---');
  const iframeLocator = page.locator('iframe[title*="Preview website"]');
  const iframeCount = await iframeLocator.count();
  console.log('Iframe count:', iframeCount);
  const iframeSrc = await iframeLocator.first().getAttribute('src');
  console.log('Iframe src:', iframeSrc);

  // Let's inspect the iframe content
  const frame = page.frameLocator('iframe[title*="Preview website"]').first();
  const skeletonCount = await frame.locator('.animate-pulse').count();
  console.log('Skeleton count inside iframe:', skeletonCount);
  const carCardsCount = await frame.locator('a[href^="/xe/"]').count();
  console.log('Car cards count inside iframe:', carCardsCount);

  console.log('\nConsole errors count:', consoleErrors.length);
  consoleErrors.slice(0, 5).forEach(e => console.log('  [Console Error]:', e));

  console.log('\nFailed images count in network:', failedImages.length);
  failedImages.slice(0, 5).forEach(f => console.log(`  [HTTP ${f.status}]:`, f.url.substring(0, 80)));

  await page.screenshot({ path: 'tests/screenshots/debug_preweb_page.png', fullPage: true });
  await browser.close();
}

main().catch(console.error);
