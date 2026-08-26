# Validation Report — Zimbabwe Skill Verification Platform

- **PRD:** `_bmad-output/planning-artifacts/prds/prd-Zimbabwe-Skill-Verification-Platform-2026-08-18/prd.md`
- **Rubric:** `.agents/skills/bmad-prd/assets/prd-validation-checklist.md`
- **Run at:** 2026-08-18T00:00:00Z
- **Grade:** Fair

## Overall verdict
This PRD is structurally strong and clearly grounded in the repo’s actual system shape. It gives a credible picture of the product’s purpose, roles, core lifecycle, and operational concerns, and it is strong enough to guide next-stage architecture or UX work. The main risk is that it reads more like a well-written status narrative than a decision-grade product brief: several choices are stated as if settled without surfacing trade-offs, and the product thesis is not sharp enough to anchor prioritization or hard scope decisions.

## Dimension verdicts
- Decision-readiness — adequate
- Substance over theater — adequate
- Strategic coherence — thin
- Done-ness clarity — adequate
- Scope honesty — good
- Downstream usability — thin
- Shape fit — strong

## Findings by severity

### Critical (0)

### High (4)
**[Decision-readiness]** — Decision trade-offs are under-exposed (§ 3, § 11, § 13)  
The PRD names goals and risks but does not state which trade-offs were chosen, what was intentionally de-scoped, or what alternatives were rejected.  
Fix: Add a short section or callout describing the key product choices, such as institutional governance over broader public self-service, blockchain proofing as a trust mechanism, and the cost of stronger security and operational complexity.

**[Strategic coherence]** — The product thesis is not explicit enough to guide prioritization (§ 3, § 6, § 14)  
The roadmap and scope read as a list of system capabilities rather than a coherent, strategic product direction.  
Fix: Add a single paragraph under Goals or Problem Statement that states the strategic thesis, the core differentiator, and the trade-off that makes this product viable.

**[Downstream usability]** — The PRD lacks a glossary and stable terminology controls (§ 1–14)  
The same concepts are not keyed in a centrally reusable way, which will create drift in downstream architecture and UX work.  
Fix: Add a short glossary and ensure the same terms are reused consistently in UX, architecture, and story artifacts.

**[Downstream usability]** — The PRD works as a narrative, but not as a clean data source for architecture or stories yet (§ 8, § 13)  
Downstream artifacts will have to reconstruct decisions from prose.  
Fix: Add a concise “system boundaries and interfaces” subsection and a more explicit acceptance-oriented structure.

### Medium (8)
**[Decision-readiness]** — Open questions are not yet shaped as real decision points (§ 12)  
Several “open questions” are more like standard rollout questions than product-critical decisions, and the assumptions are not linked strongly enough to the corresponding product bets.  
Fix: Convert the most important unresolved questions into explicit decision prompts or “NOTE FOR PM” items with owner and decision date.

**[Decision-readiness]** — The product narrative smooths over constraints without naming the real cost of the choice (§ 8, § 11)  
The PRD says the platform is secure and trustworthy, but does not say clearly that the cost is operational complexity, config discipline, and infrastructure dependence.  
Fix: Add a brief “What we are optimizing for” or “Trade-offs” subsection tied to the product thesis.

**[Substance over theater]** — Success metrics are directionally sound but not thesis-linked (§ 10)  
They measure availability and verification activity, but they do not connect strongly to the core value proposition of trust, institutional confidence, or fraud reduction.  
Fix: Tie each metric to a business outcome, such as reduction in false-positive verification, reduction in manual checks, or faster trusted issuance.

**[Strategic coherence]** — MVP logic is only implied, not explicit (§ 6, § 14)  
The PRD names out-of-scope items but does not clearly say what is essential for launch versus what is nice-to-have.  
Fix: Add a short MVP/non-goals subsection that states the first trusted launch boundary and what is excluded from the first release.

**[Strategic coherence]** — The system is broad enough that feature breadth may crowd out strategic clarity (§ 8, § 13)  
The PRD includes many functions without a clear primary ordering or value ranking.  
Fix: Rank the core value path as a small set of launch-critical capabilities and separate them from supporting capabilities.

**[Done-ness clarity]** — FRs need stronger verifiable acceptance consequences (§ 8)  
They describe capability and intent, but not the precise success conditions in a way that is directly actionable for engineering or testing.  
Fix: Add one sentence or bullet for each FR describing the observable behavior or evidence of completion.

**[Downstream usability]** — Structured IDs are not used consistently enough for downstream extraction (§ 8, § 12)  
The PRD is readable, but it lacks a clean cross-reference pattern for FR/UJ/SM-style downstream work.  
Fix: Introduce stable IDs like FR-1, UJ-1, and NFR-1 and cross-reference them where relevant.

**[Shape fit]** — The journey section is useful but not yet as strong as the system complexity deserves (§ 7)  
The journeys are good but not yet rich enough to capture the real experience of institutional onboarding, approval flows, and trust exception handling.  
Fix: Add at least one more high-value journey covering institutional onboarding or exception handling.

### Low (4)
**[Substance over theater]** — NFRs are mostly correct but generic (§ 9)  
They are valid, but they read as standard product boilerplate rather than product-specific constraints.  
Fix: Add thresholds or concrete operational expectations where possible, especially for health checks, recovery behavior, and response expectations.

**[Scope honesty]** — Assumptions exist but are not tied to a durable PM decision trail (§ 12)  
They are useful, but they do not yet function as an active index of unresolved product decisions.  
Fix: Add a compact “Assumptions and decisions pending” list with owner and decision date, or mark the most important items as [NOTE FOR PM].

**[Scope honesty]** — The PRD is honest about gaps, but the “still required for completion” list is more of a project checklist than a release boundary (§ 13)  
It will be more useful once it is tied to launch decision gates.  
Fix: Separate “must finish before launch” from “must finish before scale” items.

**[Done-ness clarity]** — The PRD leans on “safe,” “secure,” and “reliable” language without operational thresholds (§ 9, § 10)  
These are not wrong, but they are not yet measurable enough for downstream design or QA.  
Fix: Convert the most important NFRs to threshold-based requirements or acceptance bounds.

## Mechanical notes
- Glossary is absent; downstream artifacts will likely require one.
- The PRD has a clean narrative flow but no formal cross-reference ID system for downstream artifacts.
- The “assumption” markers are present but not yet tracked as an active PM decision index.
- The document is well-structured for reading, but a bit soft for direct engineering handoff.

## Reviewer files
- `review-rubric.md`
