import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1600,1100', '--lang=en-NG'],
  defaultViewport: { width: 1600, height: 1000 }
});

const page = await browser.newPage();
const errors = [];
page.on('pageerror', err => errors.push(`[PAGEERROR] ${err.message}`));

try {
  console.log('1. Navigating to http://localhost:4000/login...');
  await page.goto('http://localhost:4000/login', { waitUntil: 'networkidle2', timeout: 15000 });
  
  console.log('2. Entering admin / admin123456789...');
  await page.type('#username', 'admin');
  await page.type('#password', 'admin123456789');
  
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
    page.click('#loginSubmit')
  ]);
  
  console.log('3. Logged in! Current URL:', page.url());
  await page.waitForSelector('#incidentQueue', { timeout: 15000 });
  
  const dashboardState = await page.evaluate(() => ({
    title: document.title,
    brandSub: document.getElementById('sideBrandSub')?.textContent,
    userRole: document.getElementById('userRole')?.textContent,
    hasStatesNav: !document.getElementById('navStates')?.classList.contains('hidden'),
    hasRespondersNav: !document.getElementById('navResponders')?.classList.contains('hidden'),
    hasRegistrationsNav: !document.getElementById('navRegistrations')?.classList.contains('hidden'),
    activeKPIs: document.getElementById('kpiActive')?.textContent
  }));
  
  console.log('DASHBOARD STATE:', JSON.stringify(dashboardState, null, 2));
  console.log('Errors:', errors);
} catch (e) {
  console.error('Error during test:', e.message);
} finally {
  await browser.close();
}
