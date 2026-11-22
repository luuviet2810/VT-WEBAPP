import { chromium } from 'playwright';
import fs from 'fs';
import dotenv from 'dotenv';
import jwt from '../gara-bot-server/node_modules/jsonwebtoken/index.js';

const parsed = dotenv.parse(fs.readFileSync('gara-bot-server/.env'));
const token = jwt.sign(
  { id: '5952c302-6998-4804-8121-80a663c81fb5', email: 'luuviet2810@gmail.com', name: 'LƯU VĂN VIỆT', role: 'admin' },
  parsed.JWT_SECRET,
  { algorithm: 'HS256', expiresIn: '2h' }
);

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await context.addInitScript((tok) => { localStorage.setItem('vtauto_auth_token', tok); }, token);
  const page = await context.newPage();
  await page.goto('http://localhost:5173/xe/74cd5ba2-3c93-4148-9748-c3de2a10afa5');
  await page.waitForLoadState('networkidle');
  await page.locator('button:has-text("Ảnh")').first().click();
  await page.waitForTimeout(2000);

  const websiteSection = page.locator('div:has(h3:has-text("Ảnh trên website"))').first();
  const cards = websiteSection.locator('.grid > div');
  const count = await cards.count();
  console.log('Cards count in website section:', count);

  for (let i = 0; i < count; i++) {
    const card = cards.nth(i);
    const text = await card.innerText();
    const imgCount = await card.locator('img').count();
    const imgSrc = imgCount > 0 ? await card.locator('img').getAttribute('src') : 'NO_IMG';
    const className = await card.getAttribute('class');
    console.log(`[#${i+1}] Img count: ${imgCount} | Class: ${className?.substring(0, 45)} | Src: ${imgSrc?.substring(0, 70)}... | Text: ${text.replace(/\n/g, ' ')}`);
  }

  // Also check other sections
  const sections = await page.locator('h3').allInnerTexts();
  console.log('\nSections on page:', sections);

  for (const s of sections) {
    const sec = page.locator(`div:has(h3:has-text("${s}"))`).first();
    const cCount = await sec.locator('.grid > div').count();
    console.log(`Section "${s}": ${cCount} cards`);
  }

  await browser.close();
}

main().catch(console.error);
