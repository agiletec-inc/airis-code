---
status: accepted
date: 2026-07-13
deciders: operator (kazuki)
---

# 1. Single-responsibility agent roster for the core loop

## Context and Problem Statement

airis-code's core is a `plan → test-gate → implement → verify → review` loop. Should one capable
agent do all of it, or should each step be a distinct agent? A do-everything agent with overlapping
responsibilities has been the observed pain point ("責務が単一責務じゃなくて重複している").

## Decision Drivers

- Anthropic (official): *"When an agent is asked to handle multiple conceptual responsibilities —
  generation, validation, transformation, and side-effective actions — it becomes harder to prompt,
  harder to test, and more prone to subtle, non-deterministic failures."*
- Independence is required for honest review/verification: the agent that wrote code must not grade
  its own work, and must not write its own tests.
- Context isolation and clearer output contracts.

## Considered Options

1. **Single do-everything agent** (status quo tendency).
2. **Single-responsibility roster**: one agent per step, each with its own persona, model, tools, and
   output contract; telemetry as a passive non-agent recorder.

## Decision Outcome

Chosen: **option 2 — a single-responsibility roster**:

| Role | Single responsibility | MUST NOT |
|---|---|---|
| Operator (root) | intent → acceptance criteria, decomposition, synthesis, final QC | write code; grade its own plan |
| Test-gate | write red-first tests from the spec | touch implementation |
| Implementer | make the tests pass (minimal, surgical) | write/edit tests; grade itself |
| Verifier | re-run acceptance commands, report raw exit codes | fix code; trust an unrun claim |
| Reviewer | cold-read the diff, judge against a rubric | see the implementer's narrative; edit code |
| Researcher | research + measure only; return facts + sources | write code; make decisions |
| Telemetry (not an agent) | passively record per-run metrics | interpret; influence the run |

## Consequences

- Good: each agent is easy to prompt, test, and swap; independence is structural; context isolated.
- Cost: more orchestration wiring and more (cheaper) inference calls; mitigated by ADR-0002/0003.
- Enforcement of "MUST NOT" is a separate decision → ADR-0002.

## More Information

- Anthropic, Effective harnesses for long-running agents: <https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents>
- Anthropic, Building Effective Agents: <https://www.anthropic.com/research/building-effective-agents>
- Multi-agent research system (orchestrator-workers, +90.2%): <https://www.anthropic.com/engineering/multi-agent-research-system>
- Full narrative + roster table: `../SELF_IMPROVEMENT_CORE.md`.
