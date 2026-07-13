# airis-code Core — Outcome-Gated Self-Improvement Loop (design plan)

Status: **design plan v1** (2026-07-13). Supersedes nothing yet; sequences ahead of
`実装計画プランニング.md` for the self-improvement core specifically.
Grounded in official docs (Anthropic Agent SDK + "Building Effective Agents" + evals; OpenAI Codex
config + Agents SDK) — every load-bearing claim carries a source. Volatile specifics (model names,
config keys) are dated snapshots; re-fetch before relying (see `quota-and-caching-evidence.md`
refresh protocol).

---

## 0. What this is — and what it is NOT

**The core of airis-code = a self-improving coding-agent OS**: single-responsibility agents run a
`plan → test-gate → implement → verify → review` loop, every run is measured, and the *system itself*
(skills / prompts / policies / routing) improves only when a change is **measured to help**.

- **NOT** unbounded RSI (the model getting smarter — provider's domain). This is **bounded,
  outcome-gated improvement of the agent scaffolding**, human-owned metrics, PR-gated, reversible.
- **North star** (from memory `agent-os-cross-platform-design`): quota efficiency + higher quality +
  fewer reworks + faster — *simultaneously*. The only honest way to claim all four is to **measure
  all four** (eval-driven). A change that isn't measured to help is not an improvement, it's drift.
- **"Quota efficiency" ≠ "save tokens."** The optimized resource is the **subscription quota
  ceiling** — the 5-hour + weekly limits on Max / Plus / Pro (Claude *and* Codex) — NOT API dollars
  or raw token count. We ARE frugal; we are frugal about *the ceiling that locks you out*, which is
  the binding constraint. Two consequences (evidence: `quota-and-caching-evidence.md`): (a) on Claude
  sub, cached re-reads don't count → trimming context is NOT the lever; the levers are cheaper/fewer
  worker requests, fewer parallel heavy loops, lower effort, shorter loops; (b) on Codex, context
  length *does* count → there, trimming/short-context IS a lever. The metric in §3 is therefore
  **quota-ceiling consumption** (`/usage` on Claude, credits on Codex), not a token total.
- This session was a **manual instance of the atomic operation**: a ground-truth signal (official
  docs / `/usage`) contradicted a cached belief (a memory), and we corrected belief + doc + skills.
  RSI = automate that *trigger + gate*, cheaply.

---

## 1. First principle — single-responsibility agents (officially backed)

Anthropic, verbatim: *"When an agent is asked to handle multiple conceptual responsibilities —
generation, validation, transformation, and side-effective actions — it becomes harder to prompt,
harder to test, and more prone to subtle, non-deterministic failures."*
(<https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents>). This is
exactly the diagnosed problem ("責務が単一責務じゃなくて重複している"). Each worker is a
*first-class agent* with its own persona, system prompt, model, tools, and output contract.

**The roster — one responsibility each, nothing overlapping:**

| Role | Single responsibility | Model tier | Tools | Output contract | MUST NOT |
|---|---|---|---|---|---|
| **Operator (root)** | intent → acceptance criteria, decomposition, synthesis, final QC | **human-chosen frontier** (Claude Fable/Opus · Codex Sol) — frontier is the *quota-optimal* choice (cheap root → rework → more quota) | full | plan + brief per worker | write code; grade its own plan |
| **Test-gate** | write red-first tests from the spec | mid (Sonnet · gpt-5.4) | Read/Write tests, Bash | tests + observed RED | touch implementation; be the implementer |
| **Implementer** | make the tests pass; minimal surgical change | mid (Sonnet · Terra/gpt-5.4) | Read/Edit/Write/Bash | diff + structured report | write or edit tests; grade itself |
| **Verifier** | re-run acceptance commands, report raw exit codes | cheap (Haiku · Luna) | Read/Bash/Grep | PASS/FAIL + raw output | fix code; trust a claim it didn't run |
| **Reviewer** | cold-read the diff, judge against a rubric | **independent + capable, different model** (Opus · gpt-5.4 high) | Read/Grep/Glob (read-only) | `{verdict: APPROVE\|REJECT, per-dimension}` | see the implementer's narrative; edit code |
| **Researcher** | research + **measure** only; return facts + sources | cheap (Haiku · Luna) | WebFetch/Read/Grep | findings + URLs, "not found" honesty | write code; make decisions |
| **Telemetry** | *(not an agent)* passively record per-run metrics | — deterministic code — | — | append-only record | interpret; influence the run |

Rationale for the model split (backed): Anthropic's orchestrator-workers study — **Opus lead +
Sonnet subagents beat single-agent Opus by 90.2%** on their research eval
(<https://www.anthropic.com/engineering/multi-agent-research-system>). Operator stays frontier not
out of anti-frugality but because it **is** the quota-frugal choice: a cheap operator gives worse
decomposition → rework → **more total quota burned** (more turns, more re-runs) and worse quality.
Downgrading the root to "save" is a false economy (memory `agent-os-cross-platform-design`). Frugality
is spent where it pays: pushing worker *volume* to cheap tiers, not shrinking the brain.

**Why the implementer must not write its own tests / grade itself** ("超バカ"): the test-gate and
reviewer are *separate agents on different models*. Independence is the point — Anthropic's
multi-judge study found independent judges show no meaningful in-group bias and correlate with
humans (ρ up to 0.86) (<https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents>).
Note: "a *stronger* judge is better" is **intuition, NOT documented** — what is documented is
*independent* + *capable* + *structured rubric, one isolated judge per dimension*. Design to that.

---

## 2. Enforcement — this is real, not vibes (mapped to documented primitives)

Single-responsibility only holds if it's *enforced*. Three documented mechanisms:

1. **Per-role model pinning.**
   - Claude Agent SDK: `AgentDefinition.model` (`'opus'`/`'sonnet'`/`'haiku'`/full id) — resolves
     over inherit. <https://code.claude.com/docs/en/agent-sdk/subagents>
   - Codex: `agents.<name>.model` + `agents.<name>.model_reasoning_effort` in `~/.codex/config.toml`,
     `features.multi_agent=true` (default). Official example pins reviewer=`gpt-5.4` high /
     explorer=spark / docs=mini. <https://learn.chatgpt.com/docs/agent-configuration/subagents>
2. **Structured-output gate (deterministic, not model-driven).** Reviewer/verifier return a
   JSON-schema verdict; the **orchestration code** branches on it (`verdict === "APPROVE"` → proceed,
   else loop back). Claude: `outputFormat: {type:"json_schema"}` → `message.structured_output`
   (<https://code.claude.com/docs/en/agent-sdk/structured-outputs>). Codex: Agents SDK guardrails /
   structured output. The gate lives in *code*, so it can't be talked around by a model.
3. **Hooks enforce role boundaries (the teeth).** Claude `PreToolUse` returning
   `permissionDecision:"deny"` (deny wins over allow) — e.g. "implementer `Write` to a `*test*`
   path → deny", "`git push`/merge before review verdict APPROVE → deny".
   <https://code.claude.com/docs/en/agent-sdk/hooks>. This is what makes "implementer can't write
   its own tests" and "no merge without review" *mechanical*, matching airis-code's core bet
   ("hooks + skills + subagents force the agent to not proceed without reading").

Deterministic control flow (loops/gates/fan-out) lives in an orchestration script (Claude Dynamic
Workflows <https://code.claude.com/docs/en/workflows>, or airis-code's own `runners`), not in prose.

---

## 3. The self-improvement loop (evaluator-optimizer + eval-driven)

Anthropic's **evaluator-optimizer** pattern: one agent produces, another evaluates + feeds back in a
loop — *"works best when you have measurable evaluation criteria and iterative refinement demonstrably
improves results"* (<https://www.anthropic.com/research/building-effective-agents>). That caveat is
the whole game: **no metric → no loop, only drift.**

**Two nested loops:**

- **Inner loop (per task)** — the roster above runs `plan→test-gate→implement→verify→review`, gated.
  Telemetry records the outcome. This is essentially today's `issue-loop`/`goal-loop`, made strictly
  single-responsibility + hook-enforced.
- **Outer loop (self-improvement)** — observe telemetry across many tasks → detect a recurring
  failure/waste pattern → propose **ONE** change to a skill/prompt/policy/routing rule → **GATE** →
  merge only if measured better, else revert.

**The outer-loop gate (eval-driven, per Anthropic "Demystifying evals"):**
1. Build an **eval suite from 20-50 real failures** harvested from telemetry (not synthetic).
   *"Owning and iterating on evaluations should be as routine as maintaining unit tests."*
2. Graders (use all three): **code-based** (acceptance tests, exit codes) + **model-based**
   (LLM-judge, structured rubric, one isolated judge per dimension) + **human spot-check**.
3. Metrics (the four the North Star demands, measured before/after on held-out tasks):
   - quality/rework → review REJECT rate, reopened issues, CI-red→fix cycles, no-progress trips
   - reliability → **pass^k** (all k trials succeed), not one lucky `pass@1`
   - speed → turns-to-green, iterations per task
   - quota → `/usage` attribution delta (Claude) / credit delta (Codex)
4. **READ THE TRANSCRIPTS** (Anthropic: distinguishes real failures from broken evals).
5. Merge the proposed change **only if the metric moved the right way with enough evidence**; else
   revert automatically.

**Why this beats a scheduled diff/cron** (which the user correctly rejected as "it rots too"): a
static rule is frozen and decays; this loop **re-derives from fresh outcome signals each cycle and
keeps only measured wins** — closed-loop on reality, so it self-corrects when reality changes.

**Anti-Goodhart guardrails (non-negotiable):**
- The **human owns the metric definitions** and spot-checks transcripts (weak metric → the system
  games the metric, not the goal).
- **Config-change merges are human-gated + PR + reversible.** Never auto-apply a self-modification to
  protected config. RSI runs on the same contract-test + PR + review spine already used for code
  (memory `agent-os-cross-platform-design`: "契約テスト＋PR/review gate で暴走なしに回す").
- Small-sample noise is real — require pass^k evidence, not a single run.

---

## 4. Telemetry is the foundation (build this FIRST)

Reality (from the tree): the **event schema already exists and is rich** (`telemetry/types.ts`,
40+ events), but **`telemetry/metrics.ts` is a no-op stub** — events are emitted and **thrown away**.
So this is not "design telemetry"; it's **wire a recorder onto existing events + compute metrics**.
Everything above gates on it: **you cannot self-improve what you don't measure**, and you can't claim
"4 things improved at once" by feel.

Target per-run record (append-only, local; home: a recorder behind the existing telemetry events →
JSONL and/or mindbase). Most fields already have a source event; the gap is persistence:
```
{ run_id, task_id/issue, repo, ts,
  steps: [{ role, model, effort, turns, tokens_in/out, cache_read, wall_ms }],
  tests: { command, exit_code }[],
  review: { verdict, rubric: {dim: score} },
  outcome: { merged, reopened_later, ci_red_cycles, no_progress_trips },
  usage_delta: <from /usage if readable> }
```
This is the cheapest, highest-leverage first step. Auto-proposing skill edits is premature until the
four numbers are visible per task.

---

## 5. Cross-platform — common core + adapter (grounded, and the asymmetry has narrowed)

**Common core (platform-agnostic):** the role roster + responsibilities + gate contracts + eval
harness + telemetry schema + metric definitions. (This is `policy.md` elevated into airis-code.)

**Adapter (per host) — maps each capability to the host's documented surface:**

| Capability | Claude adapter | Codex adapter |
|---|---|---|
| per-role model pin | `AgentDefinition.model` — **reliable** | `agents.<name>.model` + `.model_reasoning_effort` |
| structured-output gate | `outputFormat` json_schema | Agents SDK structured output / guardrails |
| role-boundary enforce | `PreToolUse` deny hooks | guardrails (input/output/tool) |
| subagent context | **fresh, isolated** → delegation *isolates* cost | fork can inherit parent |
| **reliability caveat** | pins take as configured | **#31814 family**: `hide_spawn_agent_metadata=true` on Sol strips `model`/`reasoning_effort` from spawn → pin silently ignored. Workaround `hide_spawn_agent_metadata=false`; **MUST verify at runtime** (`rollout turn_context.model`) |

Docs: Codex config <https://learn.chatgpt.com/docs/config-file/config-reference>; #31814
<https://github.com/openai/codex/issues/31814>. OpenAI Agents SDK primitives (Agents/Runs/Sessions/
Guardrails/Handoffs/Tracing) + LLM-as-judge best practices
<https://developers.openai.com/api/docs/guides/agents> ·
<https://developers.openai.com/api/docs/guides/evaluation-best-practices>.

**Net:** both hosts now support single-responsibility + per-role model pin + reviewer-on-different-
model. The old "Codex delegation is structurally counterproductive" (memory) is **downgraded to** a
*pin-reliability* difference: Claude confident; Codex needs the bug workaround + runtime pin
verification. Keep separate adapters; share the core. Build Claude and Codex adapters independently,
promote to the common core only what's proven equivalent (the user's "共通化できる所だけ共通化").

---

## 6. Dogfooding on the Mac (how it actually starts)

- **Substrate already exists:** `issue-loop`/`goal-loop` already run `plan→implement→verify→review`
  against real agiletec Issues on this Mac. Add telemetry to *them* first (§4), then the outer loop
  observes that telemetry.
- **Promote-on-evidence:** run candidate skill/prompt improvements in dogfood, and only *"いいのが
  あったら組み込む"* = promote into core **after the eval suite proves it** (§3). This is the
  discipline that keeps dogfooding from becoming drift.
- **Local models where quality allows:** Ollama for cheap roles (researcher/verifier) *if measured*
  good enough; frontier cloud for operator/reviewer. Measure — don't assume a 7B local model can
  review (it probably can't; the eval will say).

---

## 7. Relationship to existing airis-code (build ON these, don't rebuild)

The active runtime (**Layer 1, `packages/airiscode-runtime`**) already ships several of the pieces —
the work is mostly *wiring + closing loops*, not greenfield.

**Existing assets to build on:**
- **Arena** (`src/agents/arena/` — ArenaManager, ArenaAgentClient, ArenaSessionResult): already runs
  **multiple agents in worktree isolation** and records per-agent stats (rounds, tokens, tool calls,
  success/fail) + a human **`selectedWinner`**. This is the natural **comparison/measurement
  substrate** — an A/B of a prompt/skill change *is* an arena run. **Gap:** the winner signal is
  currently discarded; the outer loop (§3) should consume it.
- **Telemetry schema** (`src/telemetry/types.ts`, ~1100 lines, 40+ events incl. `ToolCallEvent`
  {decision, outcome}, `ApiResponseEvent` {token counts}, `UserFeedbackEvent` {BAD/FINE/GOOD},
  `SubagentExecutionEvent`, `ArenaAgentCompletedEvent`): **the §4 schema largely already exists.**
  **Gap:** `src/telemetry/metrics.ts` is a **no-op stub** ("OpenTelemetry removed") — events are
  emitted but **never persisted**. So Phase 0 is *wire a recorder/metric backend onto the existing
  events*, NOT design a schema.
- **Hooks** (`src/hooks/`, `HookCallEvent`): the enforcement primitive for Phase 1 exists.
- **Subagents** (`src/subagents/`): the roster maps onto existing subagent machinery.
- **Unused human signal:** `UserFeedbackEvent` (rating) + Arena `selectedWinner` are recorded but
  nothing reads them to improve prompts/policies — the **cheapest first feedback source** for §3.

**Layer reconciliation:** build the loop in **Layer 1**, where runtime + telemetry + hooks + arena +
subagents already live. **Layer 2** (`super-agent`/`adapters`/`runners`/`policies`) is **dormant** per
CLAUDE.md — do NOT extend it (`packages/policies` schemas may be reusable for gate contracts). The
cross-platform **adapter** (§5, wrapping Claude Code / Codex as backends) is a *new small surface*
that `実装計画プランニング.md` roadmapped but Layer 1 hasn't implemented yet (IMPLEMENTATION_STATUS ≈46%).

**Confirmed gaps (from a read of the tree):** (1) metric persistence (metrics.ts stub); (2)
feedback→skill/prompt update (signal collected, never consumed); (3) outcome-gated branching (only a
10-iteration cap today, no success/verdict gate); (4) cross-task learned-pattern memory (home =
mindbase); (5) eval / contract-test harness for skills.

---

## 8. Phased plan (each phase = issue-spec-ready, executable acceptance criteria)

- **Phase 0 — Telemetry persistence.** Replace the `metrics.ts` no-op stub with a real recorder
  behind the **existing** telemetry events; expose the currently-discarded `UserFeedbackEvent` +
  Arena `selectedWinner`. Acceptance: a real dogfood run writes a complete per-run record; the four
  metric families are queryable. (Schema mostly exists — this is wiring, not design.)
- **Phase 1 — Single-responsibility roster + enforcement.** Define the 6 agents with pinned models,
  output contracts, and the hooks that make "implementer can't write tests" / "no merge without
  APPROVE" mechanical. Acceptance: a hook test proves the implementer's test-write is denied and an
  unreviewed merge is blocked.
- **Phase 2 — Eval harness.** 20-50 real-failure tasks from telemetry; code + model + human graders;
  metric computation (incl. pass^k). Acceptance: `run-evals` produces a scored report; a known-bad
  prompt change scores worse.
- **Phase 3 — Outer self-improvement loop.** propose → gate (contract test + eval before/after +
  independent review) → human-gated PR merge / auto-revert. Acceptance: an end-to-end cycle improves
  a metric on held-out tasks and the change lands via PR; a non-improving change is auto-reverted.

Sequence is strict: **no Phase 3 without Phase 2 without Phase 0.** Skipping to the clever loop
without measurement is the #1 way this becomes drift.

---

## 9. Honest risks & limits

- **Goodhart / metric gaming** → human owns metrics + reads transcripts.
- **Small-sample noise** → pass^k + enough eval evidence, never one run.
- **Self-modification blast radius** → PR + reversible + human gate on config changes; never
  auto-apply to protected config.
- **Codex pin reliability** (#31814 family) → workaround + runtime verification, else delegation
  regresses to the expensive operator model silently.
- **"Stronger judge = better" is unproven** → rely on *independent + capable + rubric*, which is
  documented; don't overclaim.
- **Local models too weak for judgment roles** → measure per role; likely operator/reviewer stay
  cloud.

---

## 10. Sources

- Building Effective AI Agents (patterns): <https://www.anthropic.com/research/building-effective-agents>
- Multi-agent research system (90.2%, orchestrator-workers, multi-judge): <https://www.anthropic.com/engineering/multi-agent-research-system>
- Demystifying evals (eval-driven, graders, pass^k, read transcripts): <https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents>
- Effective harnesses for long-running agents (single-responsibility): <https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents>
- Effective context engineering: <https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents>
- Writing effective tools for agents: <https://www.anthropic.com/engineering/writing-tools-for-agents>
- Claude Agent SDK — subagents / hooks / structured outputs / workflows / model-config:
  <https://code.claude.com/docs/en/agent-sdk/subagents> · <https://code.claude.com/docs/en/agent-sdk/hooks>
  · <https://code.claude.com/docs/en/agent-sdk/structured-outputs> · <https://code.claude.com/docs/en/workflows>
  · <https://code.claude.com/docs/en/model-config>
- Codex config / subagents / models: <https://learn.chatgpt.com/docs/config-file/config-reference> ·
  <https://learn.chatgpt.com/docs/agent-configuration/subagents> · <https://learn.chatgpt.com/docs/models>
- Codex metadata bug #31814 (+#15177/#16371/#20077/#26948): <https://github.com/openai/codex/issues/31814>
- OpenAI Agents SDK + eval best practices: <https://developers.openai.com/api/docs/guides/agents> ·
  <https://developers.openai.com/api/docs/guides/evaluation-best-practices>
- A Practical Guide to Building Agents (PDF): <https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf>
- Cost/quota evidence (companion): `~/.agent-skills/agent-orchestration/quota-and-caching-evidence.md`
