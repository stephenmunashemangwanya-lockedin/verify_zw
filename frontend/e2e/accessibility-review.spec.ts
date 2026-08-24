import { expect, test, type Page } from "@playwright/test";

async function authenticatedFixture(page: Page) {
  await page.route("**/api/**", (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith("/auth/profile"))
      return route.fulfill({
        json: {
          success: true,
          user: {
            id: "actor",
            fullName: "Accessibility Reviewer",
            email: "reviewer@example.test",
            role: "super_admin",
            institutionId: null,
          },
        },
      });
    if (pathname.endsWith("/credentials/credential-1"))
      return route.fulfill({
        json: {
          credential: {
            id: "credential-1",
            qualification: "Example Qualification",
            status: "active",
            issue_date: "2026-08-01",
          },
        },
      });
    if (route.request().method() === "PATCH")
      return route.fulfill({
        json: { success: true, credential: { status: "revoked" } },
      });
    if (pathname.includes("/dashboard/"))
      return route.fulfill({ json: { success: true, data: { rows: [] } } });
    return route.fulfill({ json: { success: true, data: {} } });
  });
}

test("keyboard tabs, dialog trapping, Escape, and focus restoration", async ({
  page,
}) => {
  await page.goto("/verify");
  await page.getByRole("tab", { name: "hash" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Credential ID" })).toBeFocused();
  await expect(page.getByRole("tabpanel")).toHaveAccessibleName(
    "Credential ID"
  );

  await authenticatedFixture(page);
  await page.goto("/app/credentials/credential-1");
  const trigger = page.getByRole("button", { name: "Revoke credential" });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(page.getByLabel("Revocation reason")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "Confirm" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Revocation reason")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("closed mobile navigation is not focusable and Escape restores its trigger", async ({
  page,
}) => {
  await authenticatedFixture(page);
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/app");
  const menu = page.getByRole("button", { name: "Open menu" });
  await expect(menu).toBeVisible();
  await expect(page.getByRole("link", { name: "Dashboard" })).toBeHidden();
  await menu.click();
  await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
  await page.getByRole("link", { name: "Dashboard" }).focus();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("link", { name: "Dashboard" })).toBeHidden();
  await expect(menu).toBeFocused();
});

test("reflow remains usable at 200 and 400 percent equivalents", async ({
  page,
}) => {
  for (const viewport of [
    { width: 640, height: 360 },
    { width: 320, height: 568 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /Credentials Zimbabwe can trust/i })
    ).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth
      )
    ).toBe(true);
    await expect(
      page.getByRole("link", { name: "Verify a credential" })
    ).toBeVisible();
  }
});

test("reduced motion disables smooth scrolling and nonessential animation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const values = await page.evaluate(() => {
    const html = getComputedStyle(document.documentElement);
    const button = getComputedStyle(document.querySelector(".button")!);
    return {
      scrollBehavior: html.scrollBehavior,
      transitionSeconds: parseFloat(button.transitionDuration) || 0,
    };
  });
  expect(values.scrollBehavior).toBe("auto");
  expect(values.transitionSeconds).toBeLessThanOrEqual(0.001);
});

test("major public routes expose main landmarks and one primary heading", async ({
  page,
}) => {
  for (const route of [
    "/",
    "/login",
    "/forgot-password",
    "/reset-password?token=test-token",
    "/verify",
    "/about",
    "/contact",
    "/institutions",
    "/privacy",
    "/terms",
    "/forbidden",
    "/not-a-route",
  ]) {
    await page.goto(route);
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveCount(1);
  }
});
