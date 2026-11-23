import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const outDir = 'screenshots/sidebar-logo-verification';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const jwtSecret = 'fa456d3ac1fb2a116fc1bc3f9346ea8f3530fcdf3a46b39c104bf20d3139a429';
const now = Math.floor(Date.now() / 1000);
const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
const payload = Buffer.from(
  JSON.stringify({
    id: '5952c302-6998-4804-8121-80a663c81fb5',
    email: 'luuviet2810@gmail.com',
    name: 'LƯU VĂN VIỆT',
    iat: now,
    exp: now + 7 * 86400,
  })
).toString('base64url');
const signature = crypto.createHmac('sha256', jwtSecret).update(`${header}.${payload}`).digest('base64url');
const adminToken = `${header}.${payload}.${signature}`;

async function run() {
  const browser = await chromium.launch();

  // 1. Desktop Admin Sidebar
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.addInitScript((token) => {
      localStorage.setItem('vtauto_auth_token', token);
    }, adminToken);
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Full screen
    await page.screenshot({ path: path.join(outDir, '1-admin-desktop-sidebar-enlarged.png') });
    console.log('✓ 1-admin-desktop-sidebar-enlarged.png');

    // Focus / clip on sidebar specifically for crystal clear comparison
    const sidebar = page.locator('aside');
    if (await sidebar.isVisible()) {
      await sidebar.screenshot({ path: path.join(outDir, '1b-desktop-sidebar-clip.png') });
      console.log('✓ 1b-desktop-sidebar-clip.png');
    }
    await context.close();
  }

  // 2. Mobile Drawer
  {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await context.newPage();
    await page.addInitScript((token) => {
      localStorage.setItem('vtauto_auth_token', token);
    }, adminToken);
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);

    // Open drawer
    const menuBtn = page.locator('button[aria-label="Mở menu"]');
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
      await page.waitForTimeout(800);
    }
    await page.screenshot({ path: path.join(outDir, '2-admin-mobile-drawer-enlarged.png') });
    console.log('✓ 2-admin-mobile-drawer-enlarged.png');
    await context.close();
  }

  // 3. Login Page (verify unaffected)
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, '3-login-unaffected.png') });
    console.log('✓ 3-login-unaffected.png');
    await context.close();
  }

  // 4. Public Web Header (verify unaffected)
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.goto('http://localhost:5173/?mode=public', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(outDir, '4-public-header-unaffected.png') });
    console.log('✓ 4-public-header-unaffected.png');
    await context.close();
  }

  await browser.close();
  console.log('\nAll verification screenshots captured successfully!');
}

run().catch((err) => {
  console.error('Screenshot run failed:', err);
  process.exit(1);
});
