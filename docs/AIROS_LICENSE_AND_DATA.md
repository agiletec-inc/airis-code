# AIris OS licensing and data boundary

The AIRIS Code core is MIT. `claude-code-terminal-ux` and `cmd-ime` are MIT and can be reused with
their notices preserved and upstream provenance checked. `airis-keeper` is Elastic License 2.0; its
implementation must not be copied into an MIT core or offered as a competing managed service
without a separate licensing decision. Keep it separate, use a clean-room interface, or obtain
permission.

Every release needs a dependency/attribution report covering direct imports, vendored files,
generated artifacts, packages, and runtime services. The license allowlist is a release gate.
The repository keeps the initial component matrix in `docs/AIROS_LICENSE_MATRIX.json`; release
automation must fail if a component marked `coreImport: false` is imported by the OSS core.

Default collection is local-only operational metadata. Source code, prompts, transcripts,
credentials, cookies, and provider payloads are excluded unless a customer explicitly enables a
separately documented feature. Company knowledge ingestion must provide consent, source allowlists,
PII redaction, provenance, retention, deletion/export, tenant isolation, and an audit log.
