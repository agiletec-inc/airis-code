# AIris OS repository profile

Each enrolled repository may provide `.airis/airis.yml`. It describes capabilities; it contains no
credentials or prompts.

```yaml
version: 1
repository:
  provider: github
  owner: example
  name: app
  defaultBranch: main
workflow:
  issueLabels: {queue: airis, active: airis:wip, review: airis:review, blocked: airis:blocked}
  autoMerge: false
  maxConcurrent: 1
commands:
  test: [pnpm, test]
  lint: [pnpm, lint]
  typecheck: [pnpm, typecheck]
  build: [pnpm, build]
workspace: {strategy: worktree}
privacy: {telemetry: local, collectSource: false, collectPrompts: false, retentionDays: 30}
```

Run `airiscode doctor --profile .airis/airis.yml --json` to validate it. Credentials belong in the
host secret manager or GitHub App installation, never in this file.
