import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\Hp Z820 Workstation\\.gemini\\antigravity-ide\\brain\\348f19e8-e5c4-4e3e-a9b2-067c701d9a87';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1600,1100'],
  defaultViewport: { width: 1600, height: 1000 }
});

const pages = [
  { url: 'http://localhost:4000/', name: 'citizen_index' },
  { url: 'http://localhost:4000/login', name: 'login' },
  { url: 'http://localhost:4000/responder', name: 'responder' },
  { url: 'http://localhost:4000/protocol', name: 'protocol' },
  { url: 'http://localhost:4000/dispatch', name: 'dispatch' }
];

for (const p of pages) {
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(p.url, { waitUntil: 'networkidle2', timeout: 15000 });
    
    // Check for overflow or misaligned elements
    const metrics = await page.evaluate(() => {
      const docWidth = document.documentElement.offsetWidth;
      const bodyScrollWidth = document.body.scrollWidth;
      const elements = Array.from(document.querySelectorAll('*'));
      const overflowing = elements.filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.right > window.innerWidth + 5;
      }).map(el => ({
        tag: el.tagName,
        id: el.id,
        className: (el.className || '').toString().slice(0, 50),
        right: el.getBoundingClientRect().right
      })).slice(0, 10);

      // Check button alignments / styles
      const buttons = Array.from(document.querySelectorAll('button, a.btn')).map(b => ({
        text: b.innerText.trim().slice(0, 30),
        id: b.id,
        rect: {
          w: Math.round(b.getBoundingClientRect().width),
          h: Math.round(b.getBoundingClientRect().height),
          top: Math.round(b.getBoundingClientRect().top),
          left: Math.round(b.getBoundingClientRect().left)
        },
        hasZeroSize: b.getBoundingClientRect().width === 0 || b.getBoundingClientRect().height === 0,
        isOverlappingOrClipped: b.getBoundingClientRect().top < 0
      }));

      return {
        docWidth,
        bodyScrollWidth,
        hasHorizontalOverflow: bodyScrollWidth > window.innerWidth,
        overflowing,
        buttonCount: buttons.length,
        zeroSizeButtons: buttons.filter(b => b.hasZeroSize && !b.id.includes('hidden') && !b.id.startsWith('nav')),
        totalElements: elements.length
      };
    });

    const screenshotPath = path.join(ARTIFACT_DIR, `${p.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Page: ${p.name} (${p.url})`);
    console.log('Metrics:', JSON.stringify(metrics, null, 2));
    console.log('Console/Page Errors:', errors);
    console.log('Saved screenshot to:', screenshotPath);
    console.log('----------------------------------------------------');
    await page.close();
  } catch (err) {
    console.error(`Failed ${p.name}:`, err.message);
  }
}

await browser.close();
