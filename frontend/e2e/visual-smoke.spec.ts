import { test, expect } from '@playwright/test';

const shots = 'screenshots';

test('capture public visual baselines', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Captured once with explicit responsive viewports.');

  for (const [name, width, height] of [
    ['home-desktop', 1440, 1000],
    ['home-tablet', 768, 1024],
    ['home-mobile', 375, 812],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Credentials Zimbabwe can trust/i })).toBeVisible();
    await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true });
  }

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await page.screenshot({ path: `${shots}/login.png`, fullPage: true });
});

test('capture authenticated visual baselines', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Captured once on the desktop project.');
  await page.route('**/api/**', route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith('/auth/profile')) return route.fulfill({ json: { success: true, user: { id: '00000000-0000-4000-8000-000000000001', fullName: 'Platform Administrator', email: 'admin@verifyzw.example', role: 'super_admin', institutionId: null } } });
    if (pathname.includes('/dashboard/')) return route.fulfill({ json: { success: true, data: { credentials: 842, students: 1246, institutions: 25, verifications: 3421, rows: [] } } });
    if (pathname.endsWith('/institutions')) return route.fulfill({ json: { institutions: [{ id: 'inst-1', name: 'University of Zimbabwe', status: 'active', created_at: '2026-08-01' }], pagination: { totalPages: 1 } } });
    if (pathname.endsWith('/students')) return route.fulfill({ json: { students: [{ id: 'student-1', full_name: 'Tariro Moyo', status: 'active', created_at: '2026-08-01' }], pagination: { totalPages: 1 } } });
    if (pathname.endsWith('/credentials')) return route.fulfill({ json: { credentials: [{ id: 'credential-1', qualification: 'Bachelor of Science', status: 'active', created_at: '2026-08-01' }], pagination: { totalPages: 1 } } });
    if (pathname.endsWith('/audit-logs')) return route.fulfill({ json: { auditLogs: [{ id: 'audit-1', action: 'Credential issued', status: 'active', created_at: '2026-08-01' }], pagination: { totalPages: 1 } } });
    return route.fulfill({ json: { success: true, data: {} } });
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const [route, name, heading] of [
    ['/app', 'dashboard', 'Dashboard'],
    ['/app/institutions', 'institutions', 'Institutions'],
    ['/app/students', 'students', 'Students'],
    ['/app/credentials', 'credentials', 'Credentials'],
    ['/app/verify', 'verification', 'Check a credential'],
    ['/app/audit', 'audit-logs', 'Audit Logs'],
    ['/app/profile', 'profile', 'Your profile'],
  ] as const) {
    await page.goto(route);
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true });
  }
});

test('public shell has no horizontal overflow at acceptance widths', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Validated once with explicit acceptance widths.');
  for (const width of [320, 375, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Credentials Zimbabwe can trust/i })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});
