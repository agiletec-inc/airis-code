---
status: accepted
date: 2026-07-13
deciders: operator (kazuki)
---

# 2. Enforce agent role boundaries mechanically (not by prompt convention)

## Context and Problem Statement

ADR-0001 gives each agent a single responsibility with explicit "MUST NOT" rules (e.g. the
implementer must not write its own tests; nothing merges without an APPROVE verdict). Prompt-level
"please don't" is not enforcement — a model can ignore it. How do we make the boundaries binding?

## Decision Drivers

- The core product bet (repo `CLAUDE.md`): *"hooks + skills + subagents force the agent to not
  proceed without reading."* Boundaries must be mechanical.
- The documented Agent-SDK / Codex primitives make this expressible in code, not prose.
- Gates must be **deterministic** (control-flow in code), not left to model judgement.

## Considered Options

1. **Prompt-only** ("you must not…") — rejected: not binding.
2. **Mechanical enforcement** via three documented primitives: per-role model pin + structured-output
   verdict gates + `PreToolUse` deny hooks.

## Decision Outcome

Chosen: **option 2**. Concretely:

- **Per-role model pin.** Claude: `AgentDefinition.model`. Codex: `agents.<name>.model` +
  `agents.<name>.model_reasoning_effort` (`features.multi_agent`). Reviewer runs on a *different,
  independent* model from the implementer (see ADR-0003 for tiers).
- **Structured-output gate (deterministic).** Reviewer/verifier return a JSON-schema verdict
  (`{verdict: APPROVE|REJECT, …}`); the **orchestration code** branches on it — the gate lives in
  code, so it cannot be talked around. Claude: `outputFormat` → `message.structured_output`.
- **`PreToolUse` deny hooks (the teeth).** e.g. implementer `Write` to a `*test*` path → `deny`;
  `git push`/merge before verdict = APPROVE → `deny` (`deny` wins over `allow`).

Independence rationale (ADR-0001) is backed: Anthropic's multi-judge study found independent judges
show **no meaningful in-group bias** and correlate with humans (ρ up to 0.86); grade each rubric
dimension with an *isolated* judge. Note: "a *stronger* judge is better" is **NOT documented** —
rely on *independent + capable + structured rubric*, not on model size claims.

## Consequences

- Good: "implementer can't write its own tests / no merge without review" become impossible to
  violate, not merely discouraged.
- Cost: hook + schema wiring per role; a Codex reliability caveat (see ADR-0004: #31814 family).
- Confirmation: a hook unit test must prove the denied actions actually fail (Phase 1 acceptance).

## More Information

- Claude Agent SDK — subagents / hooks / structured outputs:
  <https://code.claude.com/docs/en/agent-sdk/subagents> · <https://code.claude.com/docs/en/agent-sdk/hooks>
  · <https://code.claude.com/docs/en/agent-sdk/structured-outputs>
- Codex subagents / config: <https://learn.chatgpt.com/docs/agent-configuration/subagents> ·
  <https://learn.chatgpt.com/docs/config-file/config-reference>
- Multi-judge / LLM-as-judge: <https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents>
