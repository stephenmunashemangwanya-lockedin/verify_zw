# PRD Addendum

## 1. Product context and decision rationale

This document captures supporting context that belongs outside the main PRD, but still matters for downstream work and implementation decisions.

## 2. System shape and architecture notes

- The application is intentionally layered: routes -> controllers -> models/services -> database, IPFS, and blockchain subsystems.
- The trust model is not purely database-based; verification depends on blockchain proof and metadata integrity.
- Secrets and environment values are intentionally kept separate from the repository to avoid accidental leakage.
- The platform is designed around institutional boundaries rather than a single unrestricted user model.

## 3. Known implementation realities

- Local Docker startup depends on service ordering and configuration alignment.
- Multiple environment variants exist (.env, .env.docker, .env.staging.example), so configuration drift is a real operational risk.
- End-to-end success depends on correct blockchain network selection and provider configuration.
- Readiness and health checks are part of the product design, not just operational extras.

## 4. Decisions still to be finalized

- Final production deployment environment and provider choice
- Final institutional onboarding process and approval chain
- Whether the first rollout targets a narrow subset of institution types or a broader initial launch
- Final operational ownership model for monitoring, backups, and incident response

## 5. Risks and open trade-offs

- Strong security and governance increase operational complexity.
- Blockchain and IPFS dependence create infrastructure complexity and failure surface.
- The platform is broad enough that implementation and governance must remain carefully coordinated.

## 6. Recommended next engineering handoff

This PRD is ready to feed the following downstream documents:

- UX specification
- System architecture / solution design
- Delivery / implementation plan
- Validation and test strategy

The most important next step is operational validation in a real staging or controlled deployment environment, followed by final environment hardening and rollout planning.
