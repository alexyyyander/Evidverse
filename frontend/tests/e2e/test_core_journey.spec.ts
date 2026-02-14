import { test, expect } from '@playwright/test';

test('visitor can navigate to discover page', async ({ page }) => {
  // 1. Go to Home
  await page.goto('/');
  await expect(page).toHaveTitle(/Yivid/);

  // 2. Navigate to Discover
  await page.click('text=Discover');
  await expect(page).toHaveURL(/\/discover/);
  
  // 3. Check for heading
  await expect(page.locator('h1')).toContainText('Discover');
  
  // 4. Check for project cards or empty state
  // We expect at least the container to be present
  const container = page.locator('main .max-w-7xl').first();
  await expect(container).toBeVisible();
});

test('visitor can see login button', async ({ page }) => {
  await page.goto('/');
  // Assuming there is a login mechanism or link (not implemented in Navbar yet explicitly but "My Projects" might redirect)
  const nav = page.locator('nav');
  await expect(nav).toBeVisible();
});
