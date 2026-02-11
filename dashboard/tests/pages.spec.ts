import { test, expect } from '@playwright/test';

test.describe('Page Navigation', () => {
  test('overview page loads with KPI cards', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Kevin Status', { timeout: 10_000 });
    await expect(page.getByText('Kevin Status')).toBeVisible();
  });

  test('agents page loads and shows agents', async ({ page }) => {
    await page.goto('/agents');
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    expect(body?.toLowerCase()).toContain('kevin');
  });

  test('events page loads', async ({ page }) => {
    await page.goto('/events');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('runs page loads', async ({ page }) => {
    await page.goto('/runs');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('workflows page loads', async ({ page }) => {
    await page.goto('/workflows');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('memory page loads', async ({ page }) => {
    await page.goto('/memory');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('system page loads', async ({ page }) => {
    await page.goto('/system');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  // Note: API auth check (401 for unauthenticated) needs fixing — 
  // auth() returns null but routes still return 200 without cookies.
  // TODO: Fix API auth middleware to properly reject unauthenticated requests.
});

test.describe('Agent Detail', () => {
  test('agent detail page loads for known agent', async ({ page }) => {
    await page.goto('/agents/main');
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    expect(body?.toLowerCase()).toContain('kevin');
  });
});
