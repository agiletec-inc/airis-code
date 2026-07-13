---
status: accepted
date: 2026-07-13
deciders: operator (kazuki)
---

# 4. Measurement-first, eval-driven self-improvement; common core + per-host adapters

## Context and Problem Statement

The core's outer loop lets the agent system improve its own skills/prompts/policies. Two risks:
(1) "self-improvement" without an objective signal is just drift (a system talks itself into
"improvements" — as a memory that "corrected" itself into a new error did); (2) Claude and Codex
differ, so a single hard-coded implementation would be wrong for one of them. How do we structure it?

## Decision Drivers

- Anthropic evaluator-optimizer: works *"best when you have measurable evaluation criteria and
  iterative refinement demonstrably improves results."* No metric → no loop.
- Eval-driven development: *"owning and iterating on evaluations should be as routine as maintaining
  unit tests"*; start from **20-50 real failures**; read the transcripts; use pass^k for reliability.
- Cross-platform reality: both hosts now support per-role model pin + reviewer-on-different-model,
  but Codex has metadata-propagation bugs (#31814 family).

## Decision Outcome

Chosen:

1. **Measurement-first, strictly sequenced** — no later phase without the earlier:
   **Phase 0** telemetry persistence → **Phase 1** roster + enforcement (ADR-0001/0002) →
   **Phase 2** eval harness (20-50 real-failure tasks; code + model + human graders; metrics =
   quota/quality/rework/speed, ADR-0003) → **Phase 3** the propose→gate→merge/auto-revert loop.
2. **Anti-Goodhart guardrails:** the human owns metric definitions and reads transcripts;
   config-change merges are PR-gated + reversible; require pass^k evidence, never one lucky run.
3. **Common core + per-host adapter.** Core (platform-agnostic): roster, gate contracts, eval
   harness, telemetry schema, metric definitions. Adapters map to each host:
   - **Claude:** `AgentDefinition.model`, `outputFormat`, deny hooks, fresh isolated subagents
     (delegation isolates cost) — reliable.
   - **Codex:** `agents.<name>.model` + `model_reasoning_effort`, guardrails; **caveat #31814**
     (`hide_spawn_agent_metadata=true` strips model/effort from spawn → pin silently ignored) —
     apply the workaround and **verify the pin at runtime** (`turn_context.model`).
4. **Build on existing airis-code Layer 1**, not the dormant Layer 2: reuse Arena (comparison
   substrate + `selectedWinner`), the existing telemetry event schema (persistence is a no-op stub →
   Phase 0), hooks, subagents. Dogfood on the Mac; **promote a change into core only after the eval
   proves it** ("いいのがあったら組み込む" — disciplined by evals, not vibes).

## Consequences

- Good: improvement is closed-loop on fresh outcomes (resists rot better than a static rule/cron);
  the two hosts share a core without pretending they're identical.
- Cost: Phase 0 telemetry is a hard prerequisite (Issue #13); Codex pin needs runtime verification or
  delegation silently regresses to the expensive operator model.

## More Information

- Building Effective Agents (evaluator-optimizer): <https://www.anthropic.com/research/building-effective-agents>
- Demystifying evals (eval-driven, graders, pass^k, read transcripts): <https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents>
- Codex #31814: <https://github.com/openai/codex/issues/31814>
- OpenAI Agents SDK + eval best practices: <https://developers.openai.com/api/docs/guides/agents> · <https://developers.openai.com/api/docs/guides/evaluation-best-practices>
- Phase 0 work item: airis-code issue #13. Full narrative: `../SELF_IMPROVEMENT_CORE.md`.
