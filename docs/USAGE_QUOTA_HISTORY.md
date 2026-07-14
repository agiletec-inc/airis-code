# Local quota history

AIRIS Code can preserve normalized Claude quota snapshots supplied explicitly through stdin or a
file. It does not poll provider APIs or collect prompts, source code, transcripts, credentials,
cookies, tokens, or the raw provider payload.

```sh
airiscode usage snapshot --provider claude --input statusline.json --policy-version 2026.29
airiscode usage latest --json --provider claude
airiscode usage history --json --provider claude --since 2026-07-01T00:00:00Z
```

Records use schema version `1` and contain only `provider`, `capturedAt`, `source`, optional
`policyVersion`, and the `fiveHour` and `sevenDay` windows. Window percentages are **used percent**;
they are not inverted to remaining percent. Missing optional reset times remain unknown.

Each logical snapshot is one JSON file under `~/.airis/usage/`. Set `AIRIS_USAGE_HOME` to isolate
automation or use another local directory. Repeating the same provider, source, and capture time is
idempotent. History is local-only and can be removed by deleting that directory.

Quota history is measured provider data. AIRIS Code does not derive token savings, avoided work,
cost savings, or any other counterfactual ROI from these records.
