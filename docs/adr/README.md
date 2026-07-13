# Architecture Decision Records (ADR)

Decision log for airis-code. Format: [MADR](https://adr.github.io/madr/) v4.0.0. Stored in source
control (docs-as-code) per the [ThoughtWorks "Lightweight ADR"](https://www.thoughtworks.com/radar/techniques/lightweight-architecture-decision-records)
practice.

**Convention: ADRs are immutable.** Do NOT edit an accepted ADR. To change a decision, add a new ADR
that supersedes it and set the old one's `status:` to `superseded by NNNN`. This is what keeps the
log from going stale — it is a dated record of *why*, not a doc to maintain.
(See <https://github.com/thomvaill/log4brains>: *"An ADR is immutable — only its status can change —
thanks to this, your documentation is never out-of-date."*)

## Index

| # | Decision | Status |
|---|---|---|
| [0001](0001-single-responsibility-agent-roster.md) | Single-responsibility agent roster for the core loop | accepted |
| [0002](0002-enforce-role-boundaries-mechanically.md) | Enforce role boundaries mechanically (model pin + gates + hooks) | accepted |
| [0003](0003-optimize-for-subscription-quota-ceiling.md) | Optimize for the subscription quota ceiling, not token thrift | accepted |
| [0004](0004-eval-driven-self-improvement-common-core-adapters.md) | Measurement-first eval-driven self-improvement; common core + adapters | accepted |

Overview narrative: [`../SELF_IMPROVEMENT_CORE.md`](../SELF_IMPROVEMENT_CORE.md).
Work items live in GitHub Issues (Phase 0 = #13), not here.
