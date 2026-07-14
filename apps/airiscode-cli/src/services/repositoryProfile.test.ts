import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadRepositoryProfile } from "./repositoryProfile.js";

const validProfile = `
version: 1
repository:
  provider: github
  owner: example
  name: app
  defaultBranch: main
  issueProvider: github
workflow:
  issueLabels:
    queue: airis
    active: airis:wip
    review: airis:review
    blocked: airis:blocked
  autoMerge: true
  maxConcurrent: 2
  riskPolicy: standard
  approvals: on-failure
  agents: {implement: implement, verify: verify, review: review}
commands:
  test: [pnpm, test]
  lint: [pnpm, lint]
workspace:
  strategy: worktree
privacy:
  telemetry: local
  collectSource: false
  collectPrompts: false
  collectQuota: true
  remoteConsent: false
  retentionDays: 30
`;

describe("repository profile", () => {
  it("loads and validates a versioned YAML profile", async () => {
    const root = await mkdtemp(join(tmpdir(), "airis-profile-"));
    const path = join(root, "airis.yml");
    await writeFile(path, validProfile);
    const result = await loadRepositoryProfile(path);
    expect(result).toMatchObject({ ok: true, path });
    if (result.ok) expect(result.profile.repository.defaultBranch).toBe("main");
  });

  it("rejects profiles that enable source collection", async () => {
    const root = await mkdtemp(join(tmpdir(), "airis-profile-"));
    const path = join(root, "airis.yml");
    await writeFile(path, validProfile.replace("collectSource: false", "collectSource: true"));
    const result = await loadRepositoryProfile(path);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.errors).toContain(
        "privacy.collectSource: Invalid literal value, expected false",
      );
  });

  it("rejects unknown controls and remote telemetry without consent", async () => {
    const root = await mkdtemp(join(tmpdir(), "airis-profile-"));
    const path = join(root, "airis.yml");
    await writeFile(path, `${validProfile}\nriskPolicy: unsafe\n`);
    const result = await loadRepositoryProfile(path);
    expect(result.ok).toBe(false);
  });
});
