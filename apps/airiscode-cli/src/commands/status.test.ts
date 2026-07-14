import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runStatus } from "./status.js";

describe("status command", () => {
  it("returns zero for a valid status file", async () => {
    const root = await mkdtemp(join(tmpdir(), "airis-status-command-"));
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
    expect(await runStatus(path)).toBe(0);
  });
});
