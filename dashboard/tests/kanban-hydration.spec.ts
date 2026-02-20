import { test, expect } from '@playwright/test';

test.describe('Kanban Page', () => {
  test('should load without React hydration errors', async ({ page }) => {
    const errors: string[] = [];
    
    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Navigate to kanban page
    await page.goto('/tasks');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Give React time to hydrate
    await page.waitForTimeout(2000);
    
    // Check for hydration errors (React error #418)
    const hydrationErrors = errors.filter(e => 
      e.includes('418') || 
      e.includes('hydration') || 
      e.includes('Minified React error')
    );
    
    expect(hydrationErrors).toHaveLength(0);
  });
});
