#!/usr/bin/env node
/**
 * Headless browser smoke test for MC dashboard.
 * Usage: node tools/smoke-test.mjs [--screenshot /path/to/save.png]
 * 
 * Checks:
 * 1. Homepage loads (no 500)
 * 2. Key API endpoints respond (overview, tasks/queue, projects)
 * 3. Takes a screenshot for visual verification
 * 
 * Exit 0 = all good, Exit 1 = something broke
 */

import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE = process.env.MC_URL || 'http://localhost:3100';
const args = process.argv.slice(2);
const screenshotIdx = args.indexOf('--screenshot');
const screenshotPath = screenshotIdx >= 0 ? args[screenshotIdx + 1] : null;

const errors = [];
const checks = [];

function log(ok, msg) {
  const icon = ok ? '✅' : '❌';
  console.log(`${icon} ${msg}`);
  checks.push({ ok, msg });
  if (!ok) errors.push(msg);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  // Collect console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  // 1. Check API health (no auth needed — matcher excludes /api/)
  const apiChecks = [
    { name: 'Tasks Queue API', url: '/api/tasks/queue' },
    { name: 'Projects API', url: '/api/projects' },
    { name: 'System Health API', url: '/api/system/health' },
    { name: 'Tasks Backlog API', url: '/api/tasks/backlog' },
  ];

  for (const api of apiChecks) {
    try {
      const res = await page.request.get(`${BASE}${api.url}`);
      const status = res.status();
      log(status === 200, `${api.name} → HTTP ${status}`);
    } catch (e) {
      log(false, `${api.name} → ${e.message}`);
    }
  }

  // 2. Check overview API (needs auth — expect 401 from headless, that's OK, just not 500)
  try {
    const res = await page.request.get(`${BASE}/api/overview`);
    const status = res.status();
    log(status !== 500, `Overview API → HTTP ${status} (401=ok, 500=bad)`);
  } catch (e) {
    log(false, `Overview API → ${e.message}`);
  }

  // 3. Load the login page (should always work)
  try {
    const res = await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 15000 });
    const status = res?.status() || 0;
    log(status === 200, `Login page → HTTP ${status}`);
  } catch (e) {
    log(false, `Login page → ${e.message}`);
  }

  // 4. Load homepage (will redirect to login if not authed — that's fine)
  try {
    const res = await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 15000 });
    const status = res?.status() || 0;
    // 200 or 307 redirect both acceptable
    log(status < 500, `Homepage → HTTP ${status}`);
  } catch (e) {
    log(false, `Homepage → ${e.message}`);
  }

  // 5. Check for JS console errors
  log(consoleErrors.length === 0, `Console errors: ${consoleErrors.length}${consoleErrors.length > 0 ? ' — ' + consoleErrors.slice(0, 3).join('; ') : ''}`);

  // Screenshot
  if (screenshotPath) {
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot saved: ${screenshotPath}`);
  }

  await browser.close();

  // Summary
  const passed = checks.filter(c => c.ok).length;
  const total = checks.length;
  console.log(`\n${passed}/${total} checks passed`);

  if (errors.length > 0) {
    console.error('\nFAILED:');
    errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }

  console.log('All clear! 🍌');
  process.exit(0);
}

main().catch(e => {
  console.error('Smoke test crashed:', e.message);
  process.exit(1);
});
