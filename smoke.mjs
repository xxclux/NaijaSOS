/**
 * Temporary browser smoke test (not part of the app).
 * Uses puppeteer-core + the locally installed Chrome to load all three
 * interfaces, capture console/page errors and screenshots, then drive a full
 * dispatch -> alarm -> accept -> on scene flow.
 */
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import fs from 'node:fs';

const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const OUT = 'C:\\Users\\Hp Z820 Workstation\\AppData\\Local\\Temp\\opencode\\naijasos-shots';
const BASE = 'http://localhost:4000';
fs.mkdirSync(OUT, { recursive: true });

const issues = [];
const shot = async (page, name, fullPage = true) => {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage });
  console.log(`screenshot: ${name}.png`);
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1600,1100', '--lang=en-NG'],
  defaultViewport: { width: 1600, height: 1000, deviceScaleFactor: 1 }
});

function watch(page, label) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') issues.push(`[${label}] console: ${msg.text()}`);
  });
  page.on('pageerror', (err) => issues.push(`[${label}] pageerror: ${err.message}`));
  page.on('requestfailed', (req) => {
    const url = req.url();
    if (!url.startsWith('http://localhost')) return;
    issues.push(`[${label}] failed request: ${url} (${req.failure()?.errorText})`);
  });
}

try {
  // ---------------------------------------------------------------------
  // 1. Command centre
  // ---------------------------------------------------------------------
  const dispatch = await browser.newPage();
  watch(dispatch, 'dispatch');
  await dispatch.goto(`${BASE}/dispatch`, { waitUntil: 'networkidle2', timeout: 45000 });
  await dispatch.waitForFunction(() => document.querySelectorAll('#incidentQueue [data-incident-id], #incidentQueue button').length > 0, { timeout: 20000 });
  await new Promise((r) => setTimeout(r, 1500));

  const dispatchInfo = await dispatch.evaluate(() => ({
    title: document.title,
    kpis: ['kpiActive', 'kpiCritical', 'kpiUnack', 'kpiUnits', 'kpiResponse', 'kpiResolved'].map((id) => [id, document.getElementById(id)?.textContent.trim()]),
    queue: document.querySelectorAll('#incidentQueue [data-incident-id]').length || document.querySelectorAll('#incidentQueue > *').length,
    mapTiles: document.querySelectorAll('#dispatchMap .leaflet-tile').length,
    mapPins: document.querySelectorAll('#dispatchMap .leaflet-marker-icon').length,
    briefText: document.getElementById('detailPanel')?.innerText.slice(0, 200)
  }));
  console.log('DISPATCH', JSON.stringify(dispatchInfo, null, 2));
  await shot(dispatch, '01-dispatch');

  // Open the first incident brief and the dispatch modal if available.
  const queueFirst = await dispatch.$('#incidentQueue [data-incident-id]');
  if (queueFirst) {
    await queueFirst.click();
    await new Promise((r) => setTimeout(r, 900));
    await shot(dispatch, '02-dispatch-brief');
    const dispatchButtons = await dispatch.$$eval('#detailPanel [data-action="dispatch"], #detailPanel button', (nodes) =>
      nodes.map((n) => ({ text: n.textContent.trim().slice(0, 40), action: n.dataset.action || null })).slice(0, 15)
    );
    console.log('BRIEF BUTTONS', JSON.stringify(dispatchButtons, null, 2));
  }

  // ---------------------------------------------------------------------
  // 2. Citizen portal
  // ---------------------------------------------------------------------
  const citizen = await browser.newPage();
  watch(citizen, 'citizen');
  await citizen.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 1800));
  const citizenInfo = await citizen.evaluate(() => ({
    title: document.title,
    geoLabel: document.getElementById('geoLabel')?.textContent.trim(),
    geoCoords: document.getElementById('geoCoords')?.textContent.trim(),
    geoAddress: document.getElementById('geoAddress')?.textContent.trim(),
    sosVisible: !!document.getElementById('sosButton')?.offsetParent,
    mapTiles: document.querySelectorAll('#citizenMap .leaflet-tile').length
  }));
  console.log('CITIZEN', JSON.stringify(citizenInfo, null, 2));
  await shot(citizen, '03-citizen');

  // ---------------------------------------------------------------------
  // 3. Responder, then a live dispatch flow
  // ---------------------------------------------------------------------
  const responder = await browser.newPage();
  watch(responder, 'responder');
  await responder.setViewport({ width: 1280, height: 1000 });
  await responder.goto(`${BASE}/responder`, { waitUntil: 'networkidle2', timeout: 45000 });
  await responder.waitForFunction(() => {
    const el = document.getElementById('unitCallSign');
    return el && el.textContent.trim() && el.textContent.trim() !== 'Select unit';
  }, { timeout: 20000 });
  await new Promise((r) => setTimeout(r, 1200));

  const responderInfo = await responder.evaluate(() => ({
    title: document.title,
    callSign: document.getElementById('unitCallSign')?.textContent.trim(),
    vehicle: document.getElementById('unitVehicle')?.textContent.trim(),
    unitStatus: document.getElementById('unitStatusPill')?.textContent.trim(),
    mapTiles: document.querySelectorAll('#responderMap .leaflet-tile').length,
    directions: document.getElementById('directionsBody')?.innerText.slice(0, 160),
    telemetry: document.getElementById('telemetryBody')?.innerText.slice(0, 160),
    nearby: document.getElementById('nearbyBody')?.innerText.slice(0, 160)
  }));
  console.log('RESPONDER', JSON.stringify(responderInfo, null, 2));
  await shot(responder, '04-responder');

  const callSign = responderInfo.callSign;

  // Create an incident near the signed-on unit and dispatch it there.
  const created = await (await fetch(`${BASE}/api/incidents`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'medical',
      address: 'Smoke test junction, Victoria Island',
      landmark: 'Opposite the smoke test tower',
      lat: 6.4285,
      lng: 3.4235,
      description: 'Automated smoke test: adult collapsed, breathing difficulty.',
      reporterName: 'Smoke test',
      reporterPhone: '+234 800 000 0000',
      priority: 1,
      source: 'app',
      liveTracking: true,
      peopleAffected: 1
    })
  })).json();
  const incidentId = created.incident.id;
  console.log('CREATED INCIDENT', incidentId);

  const dispatched = await fetch(`${BASE}/api/incidents/${incidentId}/dispatch`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ responderId: callSign, dispatcher: 'Smoke test' })
  });
  console.log('DISPATCH STATUS', dispatched.status, await dispatched.text());

  await responder.waitForSelector('.alarm-overlay', { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 700));
  const alarmInfo = await responder.evaluate(() => ({
    title: document.querySelector('.alarm-card h1, .alarm-card h2, .alarm-card')?.innerText.slice(0, 200),
    buttons: [...document.querySelectorAll('[data-alarm-action]')].map((b) => b.dataset.alarmAction)
  }));
  console.log('ALARM', JSON.stringify(alarmInfo, null, 2));
  await shot(responder, '05-responder-alarm', false);

  await responder.click('[data-alarm-action="accept"]');
  await responder.waitForFunction(() => !document.querySelector('.alarm-overlay'), { timeout: 20000 });
  await new Promise((r) => setTimeout(r, 2500));
  await shot(responder, '06-responder-accepted');

  const acceptedInfo = await responder.evaluate(() => ({
    callBanner: document.getElementById('callBanner')?.innerText.slice(0, 240),
    assignment: document.getElementById('assignmentBody')?.innerText.slice(0, 300),
    nav: document.getElementById('navSummary')?.innerText.slice(0, 200),
    directions: document.getElementById('directionsBody')?.innerText.slice(0, 240),
    statusPill: document.getElementById('unitStatusPill')?.textContent.trim(),
    hasRoute: !!document.querySelector('#responderMap .leaflet-interactive'),
    progress: document.getElementById('navProgressPct')?.textContent.trim()
  }));
  console.log('ACCEPTED', JSON.stringify(acceptedInfo, null, 2));

  const onSceneButton = await responder.$('[data-action="status"][data-status="on_scene"]');
  if (onSceneButton) {
    await onSceneButton.click();
    await new Promise((r) => setTimeout(r, 1800));
    await shot(responder, '07-responder-on-scene');
    const onScene = await responder.evaluate(() => ({
      assignment: document.getElementById('assignmentBody')?.innerText.slice(0, 260),
      nav: document.getElementById('navSummary')?.innerText.slice(0, 160)
    }));
    console.log('ON SCENE', JSON.stringify(onScene, null, 2));
  } else {
    issues.push('[responder] no on-scene button after accept');
  }

  // Verify the citizen/dispatch side saw the assignment.
  const detail = await (await fetch(`${BASE}/api/incidents/${incidentId}`)).json();
  console.log('SERVER INCIDENT', JSON.stringify({
    status: detail.incident.status,
    assignments: detail.incident.assignments?.map((a) => ({ unit: a.callSign, status: a.status, progress: a.progress, eta: a.etaMinutes }))
  }, null, 2));
} catch (error) {
  console.error('SMOKE FAILED', error);
  issues.push(`fatal: ${error.message}`);
} finally {
  console.log('\nISSUES', issues.length ? JSON.stringify(issues, null, 2) : 'none');
  await browser.close();
  process.exit(issues.length ? 1 : 0);
}
