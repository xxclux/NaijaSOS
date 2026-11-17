import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const chromePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:/Users/Hp Z820 Workstation/.gemini/antigravity/brain/44079427-f615-4ded-840a-89e9acf020b5';

async function run() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // ----------------------------------------------------
    // STEP 1: Admin Login & Key Credential Generation
    // ----------------------------------------------------
    console.log('Step 1: Admin login & Key Generation...');
    const adminPage = await browser.newPage();
    await adminPage.goto('http://localhost:4000/login', { waitUntil: 'networkidle2' });
    
    // Choose Super Admin tab on login
    await adminPage.click('button[data-role="superadmin"]');
    await adminPage.type('input[name="username"]', 'admin');
    await adminPage.type('input[name="password"]', 'admin123456789');
    await adminPage.click('#loginSubmit');
    
    // Wait for admin dashboard
    await adminPage.waitForSelector('button[data-tab="responders"]', { timeout: 10000 });
    console.log('Logged into Admin Dashboard.');
    
    // Switch to First Responders tab
    await adminPage.click('button[data-tab="responders"]');
    await new Promise(r => setTimeout(r, 1200));

    // Find the Credentials button for POLICE-08
    const credBtn = await adminPage.$('button[data-reset-unit="POLICE-08"]') || await adminPage.$('button[data-reset-unit]');
    if (!credBtn) {
      throw new Error('No Credentials button found on admin responders table');
    }
    await credBtn.click();
    console.log('Clicked Credentials button in Admin.');

    // Wait for the Key Credentials Modal
    await adminPage.waitForSelector('#inputKeyCredVal', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 800));

    // Screenshot Admin Key Credential modal
    const adminModalScreenshot = path.join(ARTIFACT_DIR, 'admin_key_credentials_modal.png');
    await adminPage.screenshot({ path: adminModalScreenshot });
    console.log('Saved screenshot:', adminModalScreenshot);

    // Read the generated Key
    const generatedKey = await adminPage.$eval('#inputKeyCredVal', el => el.value);
    console.log('Generated Key Credentials:', generatedKey);

    // ----------------------------------------------------
    // STEP 2: First Responder Dashboard & Linking Protocol
    // ----------------------------------------------------
    console.log('Step 2: First Responder Linking Protocol...');
    const respPage = await browser.newPage();
    respPage.on('console', msg => console.log('RESP CONSOLE:', msg.text()));
    respPage.on('pageerror', err => console.log('RESP PAGE ERROR:', err.message));

    await respPage.goto('http://localhost:4000/responder', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    // Open Command Centre modal
    await respPage.click('#nav-command-centre');
    await respPage.waitForSelector('#protocolKeyInput', { timeout: 8000 });
    await new Promise(r => setTimeout(r, 600));

    // Populate Key Credentials directly into the input
    await respPage.evaluate((key) => {
      const inputs = document.querySelectorAll('#protocolKeyInput, input[placeholder*="Paste Admin Key"]');
      console.log('Found inputs in DOM:', inputs.length);
      inputs.forEach(inp => {
        inp.value = key;
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }, generatedKey);
    console.log('Populated Key into input:', generatedKey);
    await new Promise(r => setTimeout(r, 600));

    // Click Connect to Admin
    await respPage.click('#btnConnectToAdmin');
    console.log('Clicked Connect to Admin');

    // Wait for handshake, linking, and auto re-opening in linked status
    await new Promise(r => setTimeout(r, 3200));

    // Capture screenshot of the successfully linked protocol modal (showing green banner & live telemetry sync)
    const linkedModalScreenshot = path.join(ARTIFACT_DIR, 'responder_linked_protocol_success.png');
    await respPage.screenshot({ path: linkedModalScreenshot });
    console.log('Saved screenshot of linked protocol modal:', linkedModalScreenshot);

    // Close the protocol modal
    await respPage.evaluate(() => {
      const closeBtn = document.querySelector('#commandCentreProtocolModal [data-close], .dialog-backdrop [data-close], [data-close]');
      if (closeBtn) closeBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // ----------------------------------------------------
    // STEP 3: Trigger Proximity SOS & Verify Incoming Call Tab
    // ----------------------------------------------------
    console.log('Step 3: Triggering proximity SOS near responder...');
    // Responder POLICE-08 is at approx lat: 6.2903, lng: 3.0207
    // Trigger Citizen SOS within 1.5 km proximity
    const sosRes = await fetch('http://localhost:4000/api/incidents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'medical',
        priority: 1,
        lat: 6.2980,
        lng: 3.0280,
        address: 'Mile 2 Bus Stop, Badagry Expressway, Lagos',
        landmark: 'Near BRT Terminal Gate 3',
        description: 'Multi-casualty road collision with injuries. Immediate medical evacuation needed.',
        reporterPhone: '08031234567',
        stateCode: 'LA'
      })
    }).then(r => r.json());

    console.log('SOS incident created:', sosRes.incident?.code || sosRes);

    // Wait for the Incoming Call Protocol Notification Tab to appear at top of map
    await respPage.waitForSelector('#callBannerMap.active', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 1200));

    // Capture screenshot of First Responder Map with Incoming Call Protocol Notification Tab
    const incomingCallScreenshot = path.join(ARTIFACT_DIR, 'responder_incoming_call_protocol.png');
    await respPage.screenshot({ path: incomingCallScreenshot });
    console.log('Saved screenshot of incoming call protocol:', incomingCallScreenshot);

    console.log('All steps completed successfully!');
  } catch (err) {
    console.error('Error during test flow:', err);
  } finally {
    await browser.close();
  }
}

run();
