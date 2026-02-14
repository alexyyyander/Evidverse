import { test, expect } from "@playwright/test";

test("register supports keyboard flow (Tab + Enter) and stores token", async ({ page }) => {
  const email = `e2e-keyboard-${Date.now()}@example.com`;
  const password = "password123";

  await page.goto("/register?next=/discover");

  await page.locator('input[type="email"][autocomplete="email"]').click();
  await page.keyboard.type(email);
  await page.keyboard.press("Tab");

  await page.keyboard.type("Keyboard User");
  await page.keyboard.press("Tab");

  await page.locator('input[type="password"][autocomplete="new-password"]').first().click();
  await page.keyboard.type(password);
  await page.keyboard.press("Tab");

  await page.keyboard.type(password);
  await page.keyboard.press("Enter");

  await page.waitForURL((url) => url.pathname === "/discover");

  const token = await expect
    .poll(async () => page.evaluate(() => localStorage.getItem("token")), { timeout: 10_000 })
    .toBeTruthy();
  expect(String(token).length).toBeGreaterThan(0);
});
