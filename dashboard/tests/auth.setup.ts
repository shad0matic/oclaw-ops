import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '..', '.auth', 'user.json');

setup('authenticate', async ({ page }) => {
  setup.setTimeout(60_000);
  
  await page.goto('/login');
  
  await page.getByLabel(/password/i).fill(process.env.ADMIN_PASSWORD || 'gF9OMY7FKLN6W7xv');
  await page.getByRole('button', { name: /enter dashboard/i }).click();
  
  // Wait for dashboard content to appear (server action redirect may be slow)
  await page.waitForSelector('text=Overview', { timeout: 45_000 });
  
  // Save auth state
  await page.context().storageState({ path: authFile });
});
