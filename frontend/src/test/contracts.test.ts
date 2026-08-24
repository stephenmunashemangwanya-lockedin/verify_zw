import { describe, expect, it } from "vitest";
import appSource from "../App?raw";
import apiSource from "../api/client?raw";
import managementSource from "../pages/Management?raw";
import styles from "../styles.css?raw";

describe("Stage 21 route and integration contracts", () => {
  it.each([
    "/verify",
    "/login",
    "/app",
    "/app/institutions",
    "/app/users",
    "/app/students",
    "/app/credentials",
    "/app/verifications",
    "/app/audit",
    "/app/profile",
  ])("defines route %s", (route) =>
    expect(appSource).toContain(
      `path="${route.replace("/app/", "").replace("/app", "/app")}"`
    )
  );
  it("uses exact credential issuance route", () =>
    expect(managementSource).toMatch(/["']\/credentials\/issue["']/));
  it("uses multipart FormData for issuance", () =>
    expect(managementSource).toContain("new FormData(form)"));
  it("uses an allowed role selector instead of a raw role input", () => {
    expect(managementSource).toContain('<select required name="role">');
    expect(managementSource).toContain("['issuer','verifier']");
  });
  it("shows institution selection only to super administrators", () => {
    expect(managementSource).toMatch(
      /user\?\.role\s*===\s*["']super_admin["']/
    );
    expect(managementSource).toMatch(/<select\s+name=["']institutionId["']/);
  });
  it("fixes institution administrators to their backend-enforced institution", () => {
    expect(managementSource).toContain(
      "Institution is fixed to your institution."
    );
    expect(managementSource).toContain("delete body.institutionId");
  });
  it("surfaces backend provisioning denial through a controlled error notice", () => {
    expect(managementSource).toMatch(
      /setError\(e\.message\s*\|\|\s*["']Unable to create record\.["']\)/
    );
    expect(managementSource).toContain("notice error");
  });
  it("configures safe public environment variables only", () => {
    expect(apiSource).toContain("VITE_API_BASE_URL");
    expect(apiSource).not.toMatch(
      /PRIVATE_KEY|JWT_SECRET|DB_PASSWORD|PINATA_JWT/
    );
  });
  it("provides responsive mobile breakpoints", () =>
    expect(styles).toMatch(/@media\s*\(max-width:\s*540px\)/));
  it("provides visible focus styling", () =>
    expect(styles).toContain(":focus-visible"));
});
