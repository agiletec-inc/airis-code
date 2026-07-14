# AIris OS product specification

AIris OS is a policy-controlled engineering agent system. It turns an eligible work item into an
isolated workspace, implementation, independently observed verification, cold review, and an
auditable pull request. GitHub is the first host, not the core contract.

The CLI is the primary interface. A macOS menu-bar client is an optional thin observer/control
surface: it shows queue/run/approval state and quota snapshots, but never owns workflow state or
silently executes privileged actions. This reuses the proven AIRIS Code quota history and the
standalone statusline/tab-title UX without making desktop UI a dependency.

## Architecture

```text
Control plane: runs, leases, policy, approvals, audit, cost
        |
Execution plane: agent role -> isolated worktree/container -> checks -> artifacts
        |
Repository adapter: SCM, issue provider, commands, branch rules, repo profile
        |
CLI / optional menu bar: operator surfaces
```

The first slice is `.airis/airis.yml` validation via `airiscode doctor`. Durable transitions are
`queued -> claimed -> planned -> implementing -> verifying -> review -> merge_pending -> merged`;
blocked/failed/cancelled require explicit operator action. Pending CI is not a failure.

No production deployment is performed by the coding loop. Source code and prompts are not collected
by default. Auto-merge is opt-in and still requires green required checks plus current-SHA review.

Company knowledge ingestion is a separate opt-in product. It requires customer consent, a source
allowlist, purpose, retention, deletion/export, PII handling, provenance, and an ingestion log.
“Paste a snippet and silently scrape the company” is not an acceptable default.

## Roadmap

1. Profile validation and `doctor` (this slice).
2. Local durable run/event store and menu-bar-readable status.
3. GitHub App/webhook adapter and server-side leases.
4. Optional macOS menu-bar observer.
5. Hosted multi-tenant control plane, billing, retention, and audit export.
