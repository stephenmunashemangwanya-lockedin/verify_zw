import { describe, expect, it } from "vitest";
import appSource from "../App?raw";
import apiSource from "../api/client?raw";
import managementSource from "../pages/Management?raw";
import styles from "../styles.css?raw";

const compactApp = appSource.replace(/\s+/g, " ");
const compactManagement = managementSource.replace(/\s+/g, " ");

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
  ])("defines route %s", (route) => {
    const path = route
      .replace("/app/", "")
      .replace("/app", "/app");

    expect(compactApp).toContain(
      `path="${path}"`
    );
  });

  it("uses exact credential issuance route", () => {
    expect(compactManagement).toMatch(
      /["']\/credentials\/issue["']/
    );
  });

  it("uses multipart FormData for issuance", () => {
    expect(compactManagement).toMatch(
      /new\s+FormData\(\s*form\s*\)/
    );
  });

  it("uses an allowed role selector instead of a raw role input", () => {
    expect(compactManagement).toMatch(
      /<select\b(?=[^>]*\bname=["']role["'])(?=[^>]*\brequired\b)[^>]*>/
    );

    expect(compactManagement).not.toMatch(
      /<input\b[^>]*\bname=["']role["'][^>]*>/
    );

    expect(compactManagement).toMatch(
      /const\s+roles\s*=[\s\S]*?["']issuer["'][\s\S]*?["']verifier["']/
    );
  });

  it("shows institution selection only to super administrators", () => {
    expect(compactManagement).toMatch(
      /user\?\.role\s*===\s*["']super_admin["']/
    );

    expect(compactManagement).toMatch(
      /<select\b[^>]*\bname=["']institutionId["'][^>]*>/
    );
  });

  it("fixes institution administrators to their backend-enforced institution", () => {
    expect(compactManagement).toMatch(
      /kind\s*===\s*["']users["'][\s\S]{0,250}?user\?\.role\s*===\s*["']institution_admin["']/
    );

    expect(compactManagement).toMatch(
      /delete\s+body\s*\.\s*institutionId/
    );
  });

  it("surfaces backend provisioning denial through a controlled error notice", () => {
    expect(compactManagement).toMatch(
      /setError\([\s\S]{0,150}?e\.message[\s\S]{0,150}?Unable to create record\.[\s\S]{0,100}?\)/
    );

    expect(compactManagement).toContain(
      "notice error"
    );
  });

  it("configures safe public environment variables only", () => {
    expect(apiSource).toContain(
      "VITE_API_BASE_URL"
    );

    expect(apiSource).not.toMatch(
      /PRIVATE_KEY|JWT_SECRET|DB_PASSWORD|PINATA_JWT/
    );
  });

  it("provides responsive mobile breakpoints", () => {
    expect(styles).toMatch(
      /@media\s*\(max-width:\s*540px\)/
    );
  });

  it("provides visible focus styling", () => {
    expect(styles).toContain(
      ":focus-visible"
    );
  });
});