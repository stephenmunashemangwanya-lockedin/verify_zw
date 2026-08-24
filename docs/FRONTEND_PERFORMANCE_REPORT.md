# Frontend performance report

Phase 8 measurements were produced locally with the Vite production build on 10 August 2026. They describe build artifacts, not production latency or Lighthouse scores. The untouched baseline is recorded in [FRONTEND_PERFORMANCE_BASELINE.md](FRONTEND_PERFORMANCE_BASELINE.md).

## Before and after

| Measure | Baseline | Phase 8 | Change |
|---|---:|---:|---:|
| Initial JavaScript, minified | 841,899 B | 324,306 B | 61.48% reduction |
| Initial JavaScript, gzip | 256,171 B | 106,242 B | 58.53% reduction |
| Initial JavaScript, Brotli | 216,279 B | approximately 92,423 B | 57.27% reduction |
| Global CSS, minified | 13,799 B | 13,799 B | unchanged |
| Largest initial JS chunk | 841,899 B | 324,306 B | below 500 kB budget |

The baseline emitted one 841.9 kB application chunk and Vite's large-chunk advisory. The final build emits no chunk above 500 kB and produces no advisory. Total JavaScript is approximately unchanged because code splitting changes delivery and caching rather than removing functionality.

## Final chunk map

| Chunk | Minified | Gzip | Loaded when needed |
|---|---:|---:|---|
| Initial entry | 324,306 B | 106,242 B | Every route |
| Dashboard | 386,888 B | 112,470 B | Authenticated dashboard only |
| Authentication forms | 97,080 B | 29,070 B | Login/recovery/password routes |
| Management | 21,918 B | 5,872 B | Institution, user, student, credential, verification-log, audit-log, profile routes |
| Query helper | 8,822 B | 3,207 B | Shared by lazy authenticated data routes |
| Authenticated layout | 3,510 B | 1,510 B | Authenticated workspace only |

Hashed filenames vary between builds. The production manifest provides the authoritative mapping.

## Strategy

`App.tsx` uses `React.lazy` for the authenticated layout, dashboard, authentication forms, profile, creation/detail screens, and management lists. Existing paths, guard nesting, role lists, navigation labels, API calls, markup, and page ordering are unchanged. A single lightweight Suspense fallback uses the existing loading component, and a route-level error boundary prevents failed chunk requests from producing a blank page.

Recharts is now reachable only through the lazy dashboard module. It is absent from the public initial route and remains the largest dependency group in the 386.9 kB dashboard chunk. Charts and their data meaning were not changed.

The existing `Management.tsx` remains one cohesive lazy domain chunk. Its final output is only 21.9 kB, and physically separating every exported page would create additional requests and require a higher-risk business-logic rewrite without meaningful initial-load benefit. It is excluded from public, login, and dashboard initial loading.

Public landing, information, and verification functionality remain in the critical entry because the public module is small and verification is a primary workflow. Authentication libraries were moved out with the lazy authentication chunk.

## Runtime, queries, and tables

Existing TanStack Query policy was retained: a 30-second default stale time, bounded transient query retries, no mutation retries, and no persistent authenticated cache. No duplicate refetch loop was found. Lookup and list endpoints remain server-paginated and bounded. No large client-side filtering, sorting, hidden table rendering, or proven render hotspot justified memoization or virtualization.

## Assets and fonts

The 448,046-byte Coat of Arms remains an external transparent SVG, so it is cacheable and is never embedded into JavaScript. Replacing or lossy-compressing this detailed approved national artwork was not justified. Intrinsic `width` and `height` were added to its existing image elements to reserve aspect-ratio space and reduce layout shift; CSS continues to control visible size. There are no bundled or remotely downloaded application fonts, excessive font weights, or font preloads.

## Source maps and budgets

Production source maps are explicitly disabled. If monitoring later requires maps, they should be generated in a controlled release job and uploaded privately, never served with public assets.

Run `npm --prefix frontend run build` followed by `npm --prefix frontend run performance:budget`. The budget check fails when:

- the initial JavaScript entry exceeds 500,000 bytes;
- dashboard/Recharts or management no longer has a separate lazy chunk; or
- a public production source map is emitted.

The budget does not increase Vite's warning threshold and does not hide warnings.

## Limitations

No Lighthouse dependency was installed solely for this phase, so no localhost Lighthouse score is claimed. The public entry still contains the primary public verification workflow. The detailed Coat of Arms dominates static asset bytes but remains independently cacheable. The dashboard chunk remains the largest final chunk because Recharts is retained as required, but it is lazy and below the 500 kB threshold.
