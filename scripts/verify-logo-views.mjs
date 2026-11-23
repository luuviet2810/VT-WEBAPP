import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const outDir = 'screenshots/logo-verification';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 1. Generate valid JWT for admin user (luuviet2810@gmail.com) with native crypto
const jwtSecret = 'fa456d3ac1fb2a116fc1bc3f9346ea8f3530fcdf3a46b39c104bf20d3139a429';
const now = Math.floor(Date.now() / 1000);
const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
const payload = Buffer.from(
  JSON.stringify({
    id: '5952c302-6998-4804-8121-80a663c81fb5',
    email: 'luuviet2810@gmail.com',
    name: 'Lưu Việt',
    iat: now,
    exp: now + 7 * 86400,
  })
).toString('base64url');
const signature = crypto.createHmac('sha256', jwtSecret).update(`${header}.${payload}`).digest('base64url');
const adminToken = `${header}.${payload}.${signature}`;

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext();

  console.log('Testing and capturing screenshots...');

  // 1. Admin Desktop (1280x900)
  {
    const page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.addInitScript((token) => {
      localStorage.setItem('vtauto_auth_token', token);
    }, adminToken);
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(outDir, '1-admin-desktop.png') });
    console.log('✓ 1-admin-desktop.png');
    await page.close();
  }

  // 2. Admin Mobile (375x812) with drawer open
  {
    const page = await context.newPage();
    await page.setViewportSize({ width: 375, height: 812 });
    await page.addInitScript((token) => {
      localStorage.setItem('vtauto_auth_token', token);
    }, adminToken);
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    // Click burger menu to open drawer
    const menuBtn = page.locator('button[aria-label="Mở menu"]');
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
      await page.waitForTimeout(600);
    }
    await page.screenshot({ path: path.join(outDir, '2-admin-mobile.png') });
    console.log('✓ 2-admin-mobile.png');
    await page.close();
  }

  // 3. Public Web Desktop (1280x900)
  {
    const page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await page.goto('http://localhost:5173/?mode=public', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(outDir, '3-public-desktop.png') });
    console.log('✓ 3-public-desktop.png');
    await page.close();
  }

  // 4. Public Web Mobile (375x812)
  {
    const page = await context.newPage();
    await page.setViewportSize({ width: 375, height: 812 });
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await page.goto('http://localhost:5173/?mode=public', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(outDir, '4-public-mobile.png') });
    console.log('✓ 4-public-mobile.png');
    await page.close();
  }

  // 5. Login Page (1280x900)
  {
    const page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, '5-login.png') });
    console.log('✓ 5-login.png');
    await page.close();
  }

  // 6. Pre-Web Preview (1280x900)
  {
    const page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.addInitScript((token) => {
      localStorage.setItem('vtauto_auth_token', token);
    }, adminToken);
    await page.goto('http://localhost:5173/pre-web', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(outDir, '6-preweb-preview.png') });
    console.log('✓ 6-preweb-preview.png');
    await page.close();
  }

  // 7. Public Vehicle Detail (1280x900)
  {
    const page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('http://localhost:5173/?mode=public', { waitUntil: 'networkidle' });
    const card = page.locator('div[class*="cursor-pointer"], a[href*="/vehicles/"]').first();
    if (await card.isVisible()) {
      await card.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(outDir, '7-vehicle-detail.png') });
      console.log('✓ 7-vehicle-detail.png');
    }
    await page.close();
  }

  await browser.close();
  console.log('\nAll 6 screenshots captured successfully!');
}

run().catch((err) => {
  console.error('Screenshot verification failed:', err);
  process.exit(1);
});
