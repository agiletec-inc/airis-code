import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadRunStatus } from "./runStatus.js";

describe("run status", () => {
  it("loads a menu-bar-safe machine-readable status", async () => {
    const root = await mkdtemp(join(tmpdir(), "airis-status-"));
    const path = join(root, "status.json");
    await writeFile(
      path,
      JSON.stringify({
        schemaVersion: 1,
        runId: "run-1",
        state: "review",
        updatedAt: "2026-07-15T00:00:00.000Z",
        repository: "example/app",
        attention: "approval",
      }),
    );
    const result = await loadRunStatus(path);
    expect(result).toMatchObject({ ok: true, path });
  });

  it("rejects unknown fields", async () => {
    const root = await mkdtemp(join(tmpdir(), "airis-status-"));
    const path = join(root, "status.json");
    await writeFile(
      path,
      JSON.stringify({
        schemaVersion: 1,
        runId: "run-1",
        state: "review",
        updatedAt: "2026-07-15T00:00:00.000Z",
        repository: "example/app",
        attention: "approval",
        prompt: "secret",
      }),
    );
    const result = await loadRunStatus(path);
    expect(result.ok).toBe(false);
  });
});
