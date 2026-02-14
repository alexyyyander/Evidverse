import { test, expect } from '@playwright/test';

test('unauthenticated user visiting editor redirects to project page', async ({ page, request }) => {
  // 1. Register and Login via API
  const email = `auth-redirect-${Date.now()}@example.com`;
  const password = 'password123';

  // Register
  const regRes = await request.post('http://localhost:8000/api/v1/auth/register', {
    data: { email, password, full_name: 'Test User' },
  });
  if (!regRes.ok()) {
    console.log('Register failed:', regRes.status(), await regRes.text());
  }
  expect(regRes.ok()).toBeTruthy();

  // Login
  const loginRes = await request.post('http://localhost:8000/api/v1/auth/login', {
    form: { username: email, password },
  });
  if (!loginRes.ok()) {
    console.log('Login failed:', loginRes.status(), await loginRes.text());
  }
  expect(loginRes.ok()).toBeTruthy();
  const { access_token } = await loginRes.json();

  // 2. Create project via API
  const createRes = await request.post('http://localhost:8000/api/v1/projects/', {
    headers: { Authorization: `Bearer ${access_token}` },
    data: { name: 'Redirect Test Project ' + Date.now() }
  });
  if (!createRes.ok()) {
    console.log('Create failed:', createRes.status(), await createRes.text());
  }
  expect(createRes.ok()).toBeTruthy();
  const project = await createRes.json();
  const projectId = project.id;
  console.log('Created project:', projectId);

  // 3. Ensure we are logged out (no token in localStorage)
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.removeItem('token');
  });
  
  // 4. Visit Editor directly
  await page.goto(`/editor/${projectId}`);

  // Check for Toast first
  await expect(page.locator("div[role='status']")).toContainText('Not editable', { timeout: 10000 });

  // 5. Expect Redirect to Project Page
  await expect(page).toHaveURL(new RegExp(`/project/${projectId}`));
});
