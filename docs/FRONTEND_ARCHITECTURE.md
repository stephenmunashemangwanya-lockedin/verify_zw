# Frontend architecture

Stage 21 provides a React 19 + Vite + TypeScript single-page application in `frontend/`. It uses React Router for navigation, TanStack Query for server state, Axios for the single API transport, React Hook Form with Zod for validated authentication/password forms, Recharts for responsive analytics, and a small project-owned CSS component system.

## Configuration

Copy `frontend/.env.example` to `frontend/.env.local`. `VITE_API_BASE_URL` points to the backend `/api` prefix. `VITE_PUBLIC_APP_URL` is the public QR origin. Explorer and IPFS gateway values are optional; links must not be constructed when they are blank. All `VITE_*` values are public bundle data and must never contain keys, passwords, JWT secrets, Pinata credentials, or database credentials.

## Structure

- `src/api`: the central API client, request IDs, safe error normalization, timeout, and session expiry.
- `src/context`: authenticated user and session lifecycle.
- `src/routes`: authenticated and role-aware route guards.
- `src/layouts`: responsive institution workspace navigation.
- `src/pages`: public, authentication, dashboard, and management views.
- `src/components`: reusable state, badge, dialog, and server-pagination table primitives.
- `src/test`: component, integration-contract, security, and public verification tests.

## Authentication

The backend issues bearer tokens, so this frontend keeps the prototype token in `sessionStorage`, never `localStorage`. This limits persistence but remains readable by JavaScript if an XSS flaw exists. A production deployment should move to backend-supported HttpOnly, Secure, SameSite cookies. Tokens are cleared on logout and any `401`; no token is rendered or logged. UI role guards are an experience feature only—the backend remains authoritative.

GET queries may retry twice only for network/5xx failures. Mutations, including issuance and revocation, never retry automatically. Search, filtering, sorting, and pagination are sent to backend endpoints rather than applied to a downloaded full dataset.

## Commands

From the repository root: `npm run frontend:dev`, `npm run frontend:build`, `npm run frontend:test`, `npm run frontend:lint`, or `npm run frontend:preview`.

Stage 23 adds full-source Vitest coverage (`npm run test:frontend:coverage`) and
Playwright desktop, tablet, and mobile projects (`npm run test:e2e:frontend`).
Accessibility checks use axe via `npm run test:accessibility`. Install Chromium
with `npx playwright install chromium` from `frontend/`; absent browsers are
reported as an explicit skip. Failure screenshots, traces, HTML, and JUnit
reports are ignored generated artifacts and must not contain secrets.

## Route map and roles

Public routes include `/`, `/about`, `/verify`, `/verify/token/:token`, `/institutions`, `/privacy`, `/terms`, `/contact`, `/login`, and the fallback page. Authenticated routes live under `/app`. All authenticated roles receive dashboards, credential verification/listing, verification logs, and profile access. Super admins receive platform institutions, users, audit, and platform analytics. Institution admins receive institution-scoped users and audit. Issuers receive student and credential issuance workflows. Backend authorization may further restrict any request.

## Known limitations

The backend currently has no forgot-password request/consume endpoints, student update endpoint, or browser-download endpoint for generated PDF files, so the UI does not invent those contracts. Generated certificate metadata is surfaced through the existing API. Toasts use accessible inline notices in this release. Large chart dependencies produce a bundle-size advisory; route-level code splitting is a future optimization.
