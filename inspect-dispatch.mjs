import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\Hp Z820 Workstation\\.gemini\\antigravity-ide\\brain\\348f19e8-e5c4-4e3e-a9b2-067c701d9a87';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1600,1100'],
  defaultViewport: { width: 1600, height: 1000 }
});

const page = await browser.newPage();
try {
  await page.goto('http://localhost:4000/login', { waitUntil: 'networkidle2' });
  await page.type('#username', 'admin');
  await page.type('#password', 'admin123456789');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
    page.click('#loginSubmit')
  ]);

  console.log('Logged in, URL is:', page.url());
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'dispatch_logged_in.png'), fullPage: true });
  console.log('Saved dispatch_logged_in.png');

  // Let's also check if there are database/registrations/etc tabs
  const navItems = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.nav-item, button[data-nav]')).map(b => ({
      id: b.id,
      text: b.innerText.trim(),
      dataNav: b.getAttribute('data-nav'),
      hidden: b.classList.contains('hidden') || b.offsetParent === null
    }));
  });
  console.log('Nav items in dispatch:', navItems);

} catch (err) {
  console.error('Error:', err);
} finally {
  await browser.close();
}
