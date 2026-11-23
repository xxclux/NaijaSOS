import puppeteer from 'puppeteer-core';

const chromePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';

async function test() {
  const browser = await puppeteer.launch({ executablePath: chromePath, headless: 'new', defaultViewport: { width: 1440, height: 900 } });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR STACK:', err.stack || err.message));
  await page.goto('http://localhost:4000/responder', { waitUntil: 'networkidle2' });
  await page.click('#nav-command-centre');
  await page.waitForSelector('#protocolKeyInput');
  
  await page.evaluate(() => {
    document.getElementById('protocolKeyInput').value = 'police-08:RESP-TEST123';
  });
  const val = await page.evaluate(() => document.getElementById('protocolKeyInput').value);
  console.log('Value before click:', val);
  await page.click('#btnConnectToAdmin');
  await new Promise(r => setTimeout(r, 2000));
  console.log('Feedback text:', await page.evaluate(() => document.getElementById('protocolKeyFeedback')?.textContent));
  console.log('Unit text in sidebar:', await page.evaluate(() => document.getElementById('unitCallSign')?.textContent));
  console.log('State unit:', await page.evaluate(() => window.NaijaSOSResponderState?.unit?.callSign));
  await browser.close();
}
test();
