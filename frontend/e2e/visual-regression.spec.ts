import { expect, test, type Page } from "@playwright/test";

const user = {
  id: "00000000-0000-4000-8000-000000000001",
  fullName: "Platform Administrator",
  email: "admin@example.test",
  role: "super_admin",
  institutionId: null,
  isActive: true,
  isLocked: false,
  mustChangePassword: false,
  lastLoginAt: "2026-08-10T08:00:00.000Z",
};

async function deterministicApi(page: Page) {
  await page.route("**/api/**", (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith("/auth/profile"))
      return route.fulfill({ json: { success: true, user } });
    if (pathname.includes("/dashboard/"))
      return route.fulfill({
        json: {
          success: true,
          data: {
            credentials: 842,
            students: 1246,
            institutions: 25,
            verifications: 3421,
            rows: [],
          },
        },
      });
    if (pathname.endsWith("/institutions"))
      return route.fulfill({
        json: {
          institutions: [
            {
              id: "00000000-0000-4000-8000-000000000010",
              name: "Example University",
              status: "active",
              created_at: "2026-08-01",
            },
          ],
          pagination: { totalPages: 1 },
        },
      });
    if (pathname.endsWith("/users"))
      return route.fulfill({
        json: {
          users: [{ ...user, id: "user-1" }],
          pagination: { totalPages: 1 },
        },
      });
    if (pathname.endsWith("/users/user-1"))
      return route.fulfill({ json: { user: { ...user, id: "user-1" } } });
    if (pathname.endsWith("/students"))
      return route.fulfill({
        json: {
          students: [
            {
              id: "student-1",
              full_name: "Example Student",
              student_number: "ST-001",
              programme: "Computer Science",
              status: "active",
              created_at: "2026-08-01",
            },
          ],
          pagination: { totalPages: 1 },
        },
      });
    if (pathname.endsWith("/students/student-1"))
      return route.fulfill({
        json: {
          student: {
            id: "student-1",
            full_name: "Example Student",
            student_number: "ST-001",
            programme: "Computer Science",
            email: "student@example.test",
            institution_name: "Example University",
            credential_count: 1,
          },
        },
      });
    if (pathname.endsWith("/credentials"))
      return route.fulfill({
        json: {
          credentials: [
            {
              id: "credential-1",
              qualification: "Bachelor of Science",
              status: "active",
              created_at: "2026-08-01",
            },
          ],
          pagination: { totalPages: 1 },
        },
      });
    if (pathname.endsWith("/credentials/credential-1"))
      return route.fulfill({
        json: {
          credential: {
            id: "credential-1",
            student_name: "Example Student",
            student_number: "ST-001",
            institution_name: "Example University",
            qualification: "Bachelor of Science",
            issue_date: "2026-08-01",
            status: "active",
            certificate_hash: "a".repeat(64),
            ipfs_cid: "QmDeterministicEvidence",
            blockchain_tx: "0xdeterministic",
            blockchain_network: "localhost",
          },
        },
      });
    if (pathname.endsWith("/verification-logs"))
      return route.fulfill({
        json: {
          verificationLogs: [
            {
              id: "verification-1",
              verifier_name: "Example Verifier",
              result: "VERIFIED",
              verification_time: "2026-08-10",
            },
          ],
          pagination: { totalPages: 1 },
        },
      });
    if (pathname.endsWith("/audit-logs"))
      return route.fulfill({
        json: {
          auditLogs: [
            {
              id: "audit-1",
              action: "Credential issued",
              status: "active",
              created_at: "2026-08-10",
            },
          ],
          pagination: { totalPages: 1 },
        },
      });
    return route.fulfill({ json: { success: true, data: {} } });
  });
}

async function capture(
  page: Page,
  route: string,
  heading: string | RegExp,
  snapshot: string,
  viewport = { width: 1440, height: 900 }
) {
  await page.setViewportSize(viewport);
  await page.goto(route);
  await expect(
    page.getByRole("heading", { name: heading }).first()
  ).toBeVisible();
  await expect(page).toHaveScreenshot(snapshot, {
    animations: "disabled",
    caret: "hide",
    fullPage: true,
    maxDiffPixelRatio: 0.005,
  });
}

test.describe("approved visual baselines", () => {
  test("public pages and responsive home", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop");
    await capture(
      page,
      "/",
      /Credentials Zimbabwe can trust/i,
      "home-desktop.png"
    );
    await capture(
      page,
      "/",
      /Credentials Zimbabwe can trust/i,
      "home-tablet.png",
      {
        width: 768,
        height: 1024,
      }
    );
    await capture(
      page,
      "/",
      /Credentials Zimbabwe can trust/i,
      "home-mobile.png",
      {
        width: 375,
        height: 667,
      }
    );
    await capture(page, "/login", "Welcome back", "login.png", {
      width: 1280,
      height: 720,
    });
    await capture(
      page,
      "/forgot-password",
      "Forgot password",
      "forgot-password.png"
    );
    await capture(
      page,
      "/reset-password?token=deterministic-test-token",
      "Reset password",
      "reset-password.png"
    );
    await capture(
      page,
      "/verify",
      "Check a credential",
      "public-verification.png"
    );
  });

  test("authenticated management pages", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop");
    await deterministicApi(page);
    for (const [route, heading, snapshot] of [
      ["/app", "Dashboard", "dashboard.png"],
      ["/app/institutions", "Institutions", "institutions.png"],
      ["/app/users", "Users", "users.png"],
      ["/app/users/user-1", "User details", "user-detail.png"],
      ["/app/students", "Students", "students.png"],
      ["/app/students/student-1", "Student details", "student-detail.png"],
      ["/app/credentials", "Credentials", "credentials.png"],
      [
        "/app/credentials/credential-1",
        "Credential details",
        "credential-detail.png",
      ],
      ["/app/verifications", "Verification Logs", "verification-logs.png"],
      ["/app/audit", "Audit Logs", "audit-logs.png"],
      ["/app/profile", "Your profile", "profile.png"],
    ] as const) {
      await capture(page, route, heading, snapshot);
    }
  });
});
