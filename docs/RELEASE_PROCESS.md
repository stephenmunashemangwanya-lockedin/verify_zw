# Release process

1. Merge only after all protected-branch checks pass.
2. Choose an unused stable semantic version `vMAJOR.MINOR.PATCH`.
3. Confirm Stage 26 backup/restore evidence and current dependency/security results.
4. Push the signed tag. Tags and semantic-version image tags are immutable; never move or overwrite them.
5. The Docker workflow builds, scans, generates SPDX image SBOMs, and publishes backend, frontend, blockchain, and backup images to `ghcr.io/<owner>/<repository>-<component>` with full commit-SHA and version tags. `latest` is added only for stable semantic-version tags.
6. The Release workflow reruns tests, coverage, E2E, builds, npm SBOM generation, ABI export, and artifact secret scanning. It verifies all versioned GHCR images, then creates the GitHub release with commit SHA and generated notes.
7. Review the release and SBOM artifacts. Deployment remains a separate manual operation.

Manual dispatch validates an explicit semantic version but does not bypass tag immutability or environment approval. Run `npm run security:dependencies` and review [the dependency security report](DEPENDENCY_SECURITY_REPORT.md). The current 37 root development-toolchain findings remain visible and require a reviewed Hardhat major migration; the frontend and both production audit trees are clean. Critical tooling, critical/high production, and critical/high frontend findings fail the dependency gate, while Dependency Review rejects newly introduced high-severity dependencies.
