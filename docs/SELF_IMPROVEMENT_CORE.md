# airis-code Core — Self-Improvement Loop (overview / index)

**This is a thin index, not a maintained design doc.** The *decisions* live in immutable
[ADRs](adr/README.md); the *work* lives in GitHub Issues; the *contracts* live in code + tests. This
page only orients and links — it deliberately does not restate the decisions (a standalone design doc
that duplicates code/ADRs/issues is exactly what goes stale).

## One-paragraph overview

airis-code's core is a self-improving coding-agent OS: **single-responsibility agents** run a
`plan → test-gate → implement → verify → review` loop; every run is **measured**; and the system
itself (skills/prompts/policies) improves only when a change is **measured to help** on an eval
suite. Not unbounded RSI — bounded, outcome-gated improvement of the scaffolding, human-owned
metrics, PR-gated and reversible. The optimized resource is the **subscription quota ceiling**
(5h/weekly on Max/Plus/Pro, Claude & Codex), not token count.

## Decisions (immutable — see ADRs)

- [ADR-0001](adr/0001-single-responsibility-agent-roster.md) — single-responsibility agent roster.
- [ADR-0002](adr/0002-enforce-role-boundaries-mechanically.md) — enforce boundaries mechanically
  (per-role model pin + structured-output gates + `PreToolUse` deny hooks).
- [ADR-0003](adr/0003-optimize-for-subscription-quota-ceiling.md) — optimize for the quota ceiling,
  not tokens; operator stays frontier (quota-optimal), frugality spent on worker volume.
- [ADR-0004](adr/0004-eval-driven-self-improvement-common-core-adapters.md) — measurement-first,
  eval-driven self-improvement; common core + Claude/Codex adapters; strict Phase 0→3 sequencing.

## Work (ephemeral — GitHub Issues, close when done)

- **Phase 0 — telemetry persistence** (the hard prerequisite): airis-code **#13**.
- Phase 1 (roster + hook enforcement) / Phase 2 (eval harness) / Phase 3 (the outer loop): to be
  filed as issues when Phase 0 lands. **No later phase without the earlier** — measurement first, or
  it is drift.

## Contracts (living — code + tests, not prose)

The roster's per-agent responsibilities and the gate schemas are expressed as code + **contract
tests** (the test is the spec; CI fails if it drifts), not as a document. Build them on the existing
Layer-1 runtime: Arena (`src/agents/arena/`), the telemetry event schema (`src/telemetry/`,
persistence stubbed → #13), hooks (`src/hooks/`), subagents (`src/subagents/`).

## Evidence

Cost/quota claims are backed by the sourced dossier
`~/.agent-skills/agent-orchestration/quota-and-caching-evidence.md` (confidence-tagged, with a
refresh protocol — re-fetch volatile numbers before relying).
