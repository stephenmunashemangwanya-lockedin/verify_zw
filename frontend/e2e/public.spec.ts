import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith('/verify/hash/' + 'a'.repeat(64))) return route.fulfill({ json: { success:true, data:{ result:'VERIFIED' } } });
    return route.fulfill({ status:401, json:{ success:false, message:'Authentication required.' } });
  });
});

test('landing, verification, and responsive navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name:/Credentials Zimbabwe can trust/i })).toBeVisible();
  await page.getByRole('link', { name:/Verify a credential/i }).click();
  await page.getByLabel(/SHA-256/).fill('a'.repeat(64));
  await page.getByRole('button', { name:/Verify now/i }).click();
  await expect(page.getByText('Credential verified')).toBeVisible();
});

test('unauthorized workspace redirects to login', async ({ page }) => {
  await page.goto('/app');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name:'Welcome back' })).toBeVisible();
});

test('@a11y landing and login have no automatically detectable violations', async ({ page }) => {
  for (const route of ['/', '/login']) {
    await page.goto(route);
    await expect(page.locator('h1')).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
});

test('@a11y verification, dashboard, and credential views have no automatically detectable violations', async ({ page }) => {
  const credentialId = '00000000-0000-4000-8000-000000000003';
  await page.unroute('**/api/**');
  await page.route('**/api/**', route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith('/auth/profile')) return route.fulfill({ json:{ success:true, user:{ id:'00000000-0000-4000-8000-000000000001', fullName:'E2E Administrator', email:'admin@e2e.example.test', role:'super_admin', institutionId:null } } });
    if (pathname.includes('/dashboard/')) return route.fulfill({ json:{ success:true, data:{ credentials:1, verifications:1, rows:[] } } });
    if (pathname.endsWith(`/credentials/${credentialId}`)) return route.fulfill({ json:{ success:true, credential:{ id:credentialId, qualification:'Synthetic qualification', status:'active', issue_date:'2026-08-04' } } });
    return route.fulfill({ json:{ success:true } });
  });
  await page.goto('/verify');
  await expect(page.locator('h1')).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  for (const route of ['/app', `/app/credentials/${credentialId}`]) {
    await page.goto(route);
    await expect(page.getByRole('main')).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
});
