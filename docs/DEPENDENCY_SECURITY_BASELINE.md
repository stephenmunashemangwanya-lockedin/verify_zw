# Dependency security baseline

Captured on 10 August 2026 before Phase 9 dependency changes. Audits queried the official npm registry. Installed trees were enumerated with `npm ls --all`; the root contained 800 installed paths and the frontend 361.

## Audit summary

| Tree | Scope | Critical | High | Moderate | Low | Total |
|---|---|---:|---:|---:|---:|---:|
| Root | Complete | 0 | 16 | 7 | 14 | 37 |
| Root | Production only (`--omit=dev`) | 0 | 0 | 0 | 0 | 0 |
| Frontend | Complete | 0 | 0 | 0 | 0 | 0 |
| Frontend | Production only | 0 | 0 | 0 | 0 | 0 |

The root lockfile represented 193 production and 626 development dependency records. The frontend represented 83 production and 328 development records. npm's totals include optional and peer records.

## Direct dependency inventory

Root production dependencies are bcrypt 6, bcryptjs 3, cors 2, dotenv 17, ethers 6, Express 5, express-rate-limit 8, Helmet 8, jsonwebtoken 9, Morgan 1, Multer 2, PDFKit 0, pg 8, prom-client 15, QRCode 1, Swagger UI Express 5, YAML 2, and Zod 4.

Root development dependencies are Hardhat 2.29.0, Hardhat Toolbox 6.1.2, OpenZeppelin Contracts 5.4.0, c8 12, Nodemon 3, and solidity-coverage 0.8.17.

Frontend production dependencies are React/React DOM 19.2.8, React Router DOM 7.18.2, TanStack Query 5.101.4, Axios 1.19.0, React Hook Form 7.84.0, Hook Form resolvers 5.7.1, Zod 4.4.3, Recharts 3.10.1, and Lucide React 0.563.0. The remaining direct frontend packages are TypeScript, Vite/Vitest, ESLint, Testing Library, Playwright, axe, jsdom, and type/build plugins.

## Advisory classification

All 37 root findings disappear under `npm audit --omit=dev`. They enter exclusively through Hardhat Toolbox, Hardhat, solidity-coverage, their compiler/test plugins, or their transitive packages. None is installed in the production backend Docker stage, which uses `npm ci --omit=dev`. They are classified **C: development-only**, with individual build/test operations additionally classified **D/E: test/build-time only**. They can affect a developer or CI worker processing untrusted compiler, archive, HTTP, template, patch, or coverage inputs; therefore they are not called false positives. The project compiles its reviewed local Solidity sources and does not expose Hardhat as an application request handler.

| Reported package/family | Severity | Chain and reachability | Audit remediation |
|---|---|---|---|
| `hardhat`, `@nomicfoundation/hardhat-*`, `@typechain/hardhat`, `hardhat-gas-reporter` | High | Direct/transitive local-chain, compile, verify, test tooling | Hardhat 3.12 / Toolbox 7 major migration |
| `adm-zip` (GHSA-xcpc-8h2w-3j85) | High | Hardhat archive handling; no production request path | Hardhat 3.12 major migration |
| `undici` advisory family listed below | High | Hardhat verification/tooling HTTP client; backend uses its own runtime stack | Hardhat 3.12 major migration |
| `lodash` advisory family | High | Ignition core only; no production template or object-path use | compatible upstream update reported, but current Toolbox graph retains it |
| `serialize-javascript`, `mocha`, `diff` | High/moderate/low | solidity-coverage test runner only | audit proposes incompatible solidity-coverage 0.7.22 downgrade; rejected |
| `tmp`, `solc` | High/low | Solidity compiler temporary-file tooling only | upstream/toolchain change required |
| `bn.js`, `ethjs-unit`, `number-to-bn`, `web3-utils` | Moderate | legacy coverage calculation path only | audit proposes incompatible coverage downgrade |
| `uuid` | Moderate | Hardhat internal UUID use | Hardhat 3.12 major migration |
| `elliptic`, `secp256k1`, `ethereum-cryptography`, `ethereumjs-util`, `@ethersproject/*` | Low | legacy Hardhat/coverage cryptographic tooling; production uses direct ethers 6.17 | Hardhat/toolchain major migration |
| `@sentry/node`, nested `cookie` | Low | Hardhat telemetry only; not application cookies | Hardhat 3.12 major migration |

The underlying advisory IDs observed were GHSA-xcpc-8h2w-3j85, GHSA-378v-28hj-76wf, GHSA-pxg6-pf52-xh8x, GHSA-73rr-hh4g-fpgx, GHSA-848j-6mx2-7j84, GHSA-r5fr-rjxr-66jc, GHSA-f23m-r3pf-42rh, GHSA-xxjr-mmjv-4gpg, GHSA-5c6j-r48x-rmvq, GHSA-qj8w-gfj5-8c6v, GHSA-52f5-9888-hmc6, GHSA-ph9p-34f9-6g65, GHSA-w5hq-g745-h8pq, and the Undici family GHSA-g9mf-h72j-4rw9, GHSA-2mjp-6q6p-2qxm, GHSA-vrm6-8vpv-qv8q, GHSA-v9p9-hfj2-hcw8, GHSA-4992-7rv2-5pvq, GHSA-p88m-4jfj-68fv, GHSA-vxpw-j846-p89q, GHSA-g8m3-5g58-fq7m, GHSA-8xcm-r25x-g524, GHSA-m8rv-5g2x-5cg5, GHSA-v3r7-h72x-cjcm, and GHSA-35p6-xmwp-9g52.

This complete family is classified **H: requires breaking major upgrade** for remediation through supported parents. Forcing individual transitive versions was not accepted without upstream compatibility evidence.

## Priority-stack findings

- Express, jsonwebtoken, bcrypt/bcryptjs, Helmet, CORS, rate limiting, Multer, pg, PDFKit, QRCode, Axios, TanStack Query, React Hook Form, Zod, ethers 6, and React Router have no current npm advisory in their installed production graphs.
- React Router DOM is 7.18.2, compatible with React 19 and the existing guards/lazy routes. The historical frontend routing advisories are resolved.
- Direct ethers 6.17.0 is production reachable and clean. Vulnerable `@ethersproject` 5 packages belong to development tooling.
- No compatible critical/high production remediation is pending.

## Lockfile, lifecycle, images, and CI

Both lockfiles use lockfile version 3. Every registry-resolved entry has an integrity hash. No `file:` or non-official-registry resolution exists. The configured registry is `https://registry.npmjs.org/`.

Among direct installed dependencies, only bcrypt declares a lifecycle script (`node-gyp-build`), expected for its native binary. No unexpected direct lifecycle script was found.

Backend and support images use Node 24.19.0; PostgreSQL tooling uses PostgreSQL 18.0. CI selects the Node 24 line and uses `npm ci` for both lockfiles. The blockchain/test images intentionally install development tooling. GitHub Actions are version-pinned under the established Stage 27 policy, dependency review rejects newly introduced high findings, and release workflows preserve SBOM generation. No plaintext npm token or registry override was found.

Node 24.19.0 is the supported production-image build/runtime baseline. A local Node 26 installation was used only to run this audit; changing the supported major remains unnecessary for installed package compatibility.
