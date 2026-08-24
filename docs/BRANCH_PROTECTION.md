# Branch protection

Protect `main` and, when used, `development`. Require pull requests, resolved conversations, current branches, and at least one independent approval. Dismiss stale approvals after new commits and block force pushes and deletion.

Require successful checks for Primary CI, both coverage jobs, contract coverage, API E2E, frontend E2E, Security/CodeQL, Compose/Docker integration, and all image build/scan matrix jobs. Require signed commits and linear history where organizational policy supports them.

Restrict bypass permission to a small release-administrator group. Do not allow Actions to approve pull requests. Fork pull requests must run with read-only tokens and no environment access. Configure `release`, `staging`, and `production` environments with required reviewers; production should prevent self-approval and restrict deployment branches/tags.
