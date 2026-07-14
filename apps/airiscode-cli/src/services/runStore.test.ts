import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { appendRunEvent, listRunEvents, rebuildRunStatus } from "./runStore.js";

const base = {
  runId: "run-1",
  repository: "example/app",
  occurredAt: "2026-07-15T00:00:00.000Z",
  attention: "none" as const,
};

describe("run store", () => {
  it("replays events and atomically emits the status contract", async () => {
    const home = await mkdtemp(join(tmpdir(), "airis-run-store-"));
    const statusPath = join(home, "status.json");
    await appendRunEvent(
      { ...base, state: "queued", idempotencyKey: "event-1" },
      { home, statusPath },
    );
    await appendRunEvent(
      {
        ...base,
        state: "claimed",
        idempotencyKey: "event-2",
        occurredAt: "2026-07-15T00:00:01.000Z",
        attention: "operator",
      },
      { home, statusPath },
    );
    const status = await rebuildRunStatus({ home, statusPath }, "run-1");
    expect(status).toMatchObject({ runId: "run-1", state: "claimed", attention: "operator" });
    expect(JSON.parse(await readFile(statusPath, "utf8"))).toMatchObject({ state: "claimed" });
  });

  it("is idempotent and rejects invalid transitions", async () => {
    const home = await mkdtemp(join(tmpdir(), "airis-run-store-"));
    const event = { ...base, state: "queued" as const, idempotencyKey: "same" };
    expect((await appendRunEvent(event, { home })).duplicate).toBe(false);
    expect((await appendRunEvent(event, { home })).duplicate).toBe(true);
    await expect(
      appendRunEvent({ ...base, state: "merged", idempotencyKey: "bad" }, { home }),
    ).rejects.toThrow("invalid transition");
  });

  it("does not replay untrusted JSON or store sensitive fields", async () => {
    const home = await mkdtemp(join(tmpdir(), "airis-run-store-"));
    await writeFile(
      join(home, "untrusted.json"),
      JSON.stringify({ prompt: "secret", token: "secret" }),
    );
    await appendRunEvent({ ...base, state: "queued", idempotencyKey: "safe" }, { home });
    const events = await listRunEvents({ home });
    expect(events).toHaveLength(1);
    expect(JSON.stringify(events)).not.toContain("secret");
    expect((await readdir(home)).some((name) => name.endsWith(".tmp"))).toBe(false);
  });
});
