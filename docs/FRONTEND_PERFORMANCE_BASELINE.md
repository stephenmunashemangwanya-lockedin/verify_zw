# Frontend performance baseline

Measured on 10 August 2026 with `npm --prefix frontend run build`, before Phase 8 implementation. These are local production-build measurements, not production network or Lighthouse results.

## Output

| Artifact | Minified | Gzip | Brotli |
|---|---:|---:|---:|
| Initial application JavaScript (`index-BLZ5ZRMi.js`) | 841,899 B | 256,171 B | 216,279 B |
| Global CSS (`index-Be_4zR7x.css`) | 13,799 B | 4,313 B | 3,728 B |

There was one JavaScript file, so total JavaScript and initial-entry JavaScript were both 841,899 bytes. Vite emitted its greater-than-500 kB chunk advisory.

The largest static asset was `public/coat-of-arms-zimbabwe.svg` at 448,046 bytes. It is an external SVG rather than a base64 payload in JavaScript, has intrinsic dimensions of 384 by 340, and preserves transparency and aspect ratio. No application font files or remote font imports were present.

## Inclusion audit

`App.tsx` eagerly imported every page module. Consequently the public entry included:

- Recharts and all dashboard chart components;
- the complete dashboard and authenticated layout;
- the monolithic management module, including institution, user, student, credential, audit-log, and verification-log pages;
- authentication forms, React Hook Form, Zod, and its resolver;
- public verification and icon code.

The single output chunk prevented route-level caching and meant Recharts and management code were present before public landing or login navigation required them. There were no wildcard utility/date imports, no PDF or QR rendering library in the browser, and Lucide used named imports. Server-side pagination was already bounded. TanStack Query used a 30-second default stale time, bounded retries for transient queries, no mutation retries, and no persistent browser cache.

No duplicate output chunks existed because no code splitting existed. Module transformation count was 2,498. Production source maps were not emitted by the existing Vite configuration.

## Phase 8 targets

- Keep landing and login behavior unchanged.
- Lazy-load dashboard, management, protected profile/password pages, and non-critical public routes.
- Keep Recharts out of public initial loading.
- Keep management code out of public and login initial loading.
- Remove the greater-than-500 kB initial application chunk without increasing Vite's warning threshold.
- Preserve the current global CSS, visual design, route paths, labels, role guards, and API behavior.
