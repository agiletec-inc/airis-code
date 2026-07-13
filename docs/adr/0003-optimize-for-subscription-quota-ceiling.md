---
status: accepted
date: 2026-07-13
deciders: operator (kazuki)
---

# 3. Optimize for the subscription quota ceiling, not token thrift

## Context and Problem Statement

What resource does airis-code minimize? Naively "save tokens" — but on subscription plans (Claude
Max/Pro, Codex/ChatGPT Plus/Pro) the binding constraint is the **usage-limit ceiling** (5-hour +
weekly windows), not API dollars or raw token count. Optimizing the wrong meter (e.g. shrinking
context) can fail to move the ceiling at all.

## Decision Drivers

- The North Star (memory `agent-os-cross-platform-design`): never hit the rate-limit ceiling while
  completing more accepted work — *simultaneously* higher quality, fewer reworks, faster.
- Evidence on how the ceiling is actually consumed (`~/.agent-skills/agent-orchestration/quota-and-caching-evidence.md`).

## Considered Options

1. **Minimize tokens / trim context** — rejected as the primary lever (wrong meter).
2. **Minimize subscription quota-ceiling consumption**, measured via `/usage` (Claude) / credits (Codex).

## Decision Outcome

Chosen: **option 2**. Consequences for the design:

- **The operator (root) stays on the human-chosen frontier tier and is NEVER downgraded for quota.**
  This is *not* anti-frugality — it *is* the quota-frugal choice: a cheap operator gives worse
  decomposition → rework → **more total quota burned** (more turns/re-runs) and worse quality.
  (Orchestrator-workers evidence: Opus lead + Sonnet workers beat single Opus by **90.2%**.)
- **Frugality is spent on worker *volume***: push reading/editing/verifying to the cheapest capable
  tier; don't run many heavy frontier loops in parallel; lower effort on routine loops.
- **Cross-agent asymmetry (evidence-backed):** on Claude sub, **cached re-reads don't count** →
  trimming context is *not* the lever. On Codex, **context length does count** (~+15%/1k) → there,
  short context *is* a lever. Adapters differ accordingly (ADR-0004).
- **The self-improvement metric (ADR-0004) is quota-ceiling consumption**, not a token total.

## Consequences

- Good: the objective matches the real constraint; avoids the "shrink everything" false economy.
- Cost: requires per-run quota measurement (`/usage`); absolute ceilings are undocumented, so the
  metric is relative (before/after), never an absolute budget.

## More Information

- Cost/quota evidence dossier (sources, [DOC]/[EMP]/[CONFLICT] tags):
  `~/.agent-skills/agent-orchestration/quota-and-caching-evidence.md`
- Anthropic multi-agent research system (90.2%): <https://www.anthropic.com/engineering/multi-agent-research-system>
- Claude usage limits: <https://support.claude.com/en/articles/11647753-how-do-usage-and-length-limits-work>
