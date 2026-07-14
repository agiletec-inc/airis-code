import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
import yargs from "yargs/yargs";
import { defaultUsageHome, usageCommand } from "./usage.js";

const fixturePath = join(process.cwd(), "src/commands/__fixtures__/claude-statusline.json");

type RunResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

async function runUsage(
  args: string[],
  options: { home: string; stdin?: string },
): Promise<RunResult> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const stdin = new PassThrough();
  if (options.stdin !== undefined) {
    stdin.end(options.stdin);
  } else {
    stdin.end();
  }

  let exitCode = 0;
  const parser = yargs(args)
    .scriptName("airiscode")
    .exitProcess(false)
    .fail((message, error) => {
      throw error ?? new Error(message);
    })
    .command(usageCommand({ stdin, stdout: (line) => stdout.push(line) }))
    .strict();

  vi.stubEnv("AIRIS_USAGE_HOME", options.home);
  try {
    await parser.parseAsync();
  } catch (error) {
    exitCode = 1;
    stderr.push(error instanceof Error ? error.message : String(error));
  }

  return { exitCode, stdout: stdout.join("\n"), stderr: stderr.join("\n") };
}

async function filesUnder(root: string): Promise<string[]> {
  try {
    const entries = await readdir(root, { recursive: true, withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => join(entry.parentPath, entry.name));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function storedText(root: string): Promise<string> {
  const files = await filesUnder(root);
  return (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("usage quota collector acceptance contract", () => {
  it("ignores malformed files instead of emitting arbitrary local JSON", async () => {
    const home = await mkdtemp(join(tmpdir(), "airis-usage-untrusted-"));
    await writeFile(
      join(home, "untrusted.json"),
      JSON.stringify({ prompt: "secret", token: "secret" }),
    );
    const result = await runUsage(["usage", "history", "--json"], { home });
    expect(result.exitCode, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual([]);
    expect(result.stdout).not.toContain("secret");
  });

  it("AC-1 ingests Claude statusline input from a file and stdin", async () => {
    for (const inputMode of ["file", "stdin"] as const) {
      const home = await mkdtemp(join(tmpdir(), `airis-usage-${inputMode}-`));
      const fixture = await readFile(fixturePath, "utf8");
      const args = ["usage", "snapshot", "--provider", "claude"];
      if (inputMode === "file") args.push("--input", fixturePath);

      const result = await runUsage(args, {
        home,
        stdin: inputMode === "stdin" ? fixture : undefined,
      });

      expect(result, result.stderr).toMatchObject({ exitCode: 0 });
      expect(JSON.parse(result.stdout)).toEqual({
        schemaVersion: 1,
        provider: "claude",
        capturedAt: "2026-07-12T01:02:03.000Z",
        source: "claude-statusline",
        windows: {
          fiveHour: {
            usedPercent: 37.5,
            resetsAt: "2026-07-12T05:00:00.000Z",
          },
          sevenDay: {
            usedPercent: 61,
            resetsAt: "2026-07-19T00:00:00.000Z",
          },
        },
      });
      expect(await filesUnder(home)).toHaveLength(1);
    }
  });

  it("AC-2 persists only the normalized schema allowlist", async () => {
    const home = await mkdtemp(join(tmpdir(), "airis-usage-allowlist-"));
    const result = await runUsage(
      [
        "usage",
        "snapshot",
        "--provider",
        "claude",
        "--input",
        fixturePath,
        "--policy-version",
        "2026.29",
      ],
      { home },
    );
    expect(result.exitCode, result.stderr).toBe(0);

    const files = await filesUnder(home);
    expect(files).toHaveLength(1);
    const record = JSON.parse(await readFile(files[0], "utf8"));
    expect(Object.keys(record).sort()).toEqual([
      "capturedAt",
      "policyVersion",
      "provider",
      "schemaVersion",
      "source",
      "windows",
    ]);
    expect(record.policyVersion).toBe("2026.29");
    const persisted = await storedText(home);
    for (const forbidden of [
      "FORBIDDEN_PROMPT_VALUE",
      "FORBIDDEN_ACCESS_TOKEN",
      "FORBIDDEN_COOKIE_VALUE",
      "FORBIDDEN_UNKNOWN_VALUE",
      '"prompt"',
      '"credentials"',
      '"cookies"',
      '"unknown_provider_field"',
    ]) {
      expect(persisted).not.toContain(forbidden);
    }
  });

  it("AC-3 is idempotent for provider, source, and capture timestamp", async () => {
    const home = await mkdtemp(join(tmpdir(), "airis-usage-idempotent-"));
    const snapshot = ["usage", "snapshot", "--provider", "claude", "--input", fixturePath];
    expect((await runUsage(snapshot, { home })).exitCode).toBe(0);
    expect((await runUsage(snapshot, { home })).exitCode).toBe(0);

    const history = await runUsage(["usage", "history", "--json"], { home });
    expect(history.exitCode, history.stderr).toBe(0);
    expect(JSON.parse(history.stdout)).toHaveLength(1);
    expect(await filesUnder(home)).toHaveLength(1);
  });

  it.each([
    ["malformed JSON", "{not-json", "claude", /json/i],
    [
      "out-of-range percentage",
      JSON.stringify({
        captured_at: "2026-07-12T01:02:03.000Z",
        rate_limits: {
          five_hour: { used_percentage: 101 },
          seven_day: { used_percentage: 1 },
        },
      }),
      "claude",
      /percent|range/i,
    ],
    [
      "missing capture timestamp",
      JSON.stringify({
        rate_limits: {
          five_hour: { used_percentage: 1 },
          seven_day: { used_percentage: 1 },
        },
      }),
      "claude",
      /captur|timestamp/i,
    ],
    ["unsupported Codex adapter", "{}", "codex", /unsupported|not implemented/i],
    ["unsupported Gemini adapter", "{}", "gemini", /unsupported|not implemented/i],
  ])("AC-4 rejects %s without writing", async (_name, input, provider, message) => {
    const home = await mkdtemp(join(tmpdir(), "airis-usage-invalid-"));
    const before = await filesUnder(home);
    const result = await runUsage(["usage", "snapshot", "--provider", provider], {
      home,
      stdin: input,
    });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(message);
    expect(await filesUnder(home)).toEqual(before);
  });

  it("AC-5 returns newest matching snapshot and explicit null for empty history", async () => {
    const home = await mkdtemp(join(tmpdir(), "airis-usage-latest-"));
    for (const capturedAt of ["2026-07-12T03:00:00.000Z", "2026-07-12T02:00:00.000Z"]) {
      const payload = JSON.parse(await readFile(fixturePath, "utf8"));
      payload.captured_at = capturedAt;
      await runUsage(["usage", "snapshot", "--provider", "claude"], {
        home,
        stdin: JSON.stringify(payload),
      });
    }
    const latest = await runUsage(["usage", "latest", "--json", "--provider", "claude"], {
      home,
    });
    expect(JSON.parse(latest.stdout).capturedAt).toBe("2026-07-12T03:00:00.000Z");

    const emptyHome = await mkdtemp(join(tmpdir(), "airis-usage-empty-"));
    const empty = await runUsage(["usage", "latest", "--json"], { home: emptyHome });
    expect(empty.exitCode, empty.stderr).toBe(0);
    expect(JSON.parse(empty.stdout)).toBeNull();
  });

  it("AC-6 orders history ascending and applies provider and since filters", async () => {
    const home = await mkdtemp(join(tmpdir(), "airis-usage-history-"));
    for (const capturedAt of [
      "2026-07-12T03:00:00.000Z",
      "2026-07-12T01:00:00.000Z",
      "2026-07-12T02:00:00.000Z",
    ]) {
      const payload = JSON.parse(await readFile(fixturePath, "utf8"));
      payload.captured_at = capturedAt;
      expect(
        (
          await runUsage(["usage", "snapshot", "--provider", "claude"], {
            home,
            stdin: JSON.stringify(payload),
          })
        ).exitCode,
      ).toBe(0);
    }

    const result = await runUsage(
      ["usage", "history", "--json", "--provider", "claude", "--since", "2026-07-12T02:00:00.000Z"],
      { home },
    );
    expect(
      JSON.parse(result.stdout).map((entry: { capturedAt: string }) => entry.capturedAt),
    ).toEqual(["2026-07-12T02:00:00.000Z", "2026-07-12T03:00:00.000Z"]);
  });

  it("AC-7 isolates override homes and defaults to ~/.airis/usage", async () => {
    expect(defaultUsageHome()).toBe(join(homedir(), ".airis", "usage"));
    const first = await mkdtemp(join(tmpdir(), "airis-usage-first-"));
    const second = await mkdtemp(join(tmpdir(), "airis-usage-second-"));
    expect(
      (
        await runUsage(["usage", "snapshot", "--provider", "claude", "--input", fixturePath], {
          home: first,
        })
      ).exitCode,
    ).toBe(0);
    expect(await filesUnder(first)).toHaveLength(1);
    expect(await filesUnder(second)).toHaveLength(0);
    const emptySecond = await runUsage(["usage", "history", "--json"], { home: second });
    expect(JSON.parse(emptySecond.stdout)).toEqual([]);
    expect(await filesUnder(first)).toHaveLength(1);
  });

  it("AC-4 rejects invalid --since without changing storage", async () => {
    const home = await mkdtemp(join(tmpdir(), "airis-usage-since-"));
    const sentinel = join(home, "sentinel");
    await writeFile(sentinel, "unchanged");
    const result = await runUsage(["usage", "history", "--json", "--since", "yesterday"], {
      home,
    });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/since|RFC3339/i);
    expect(await readFile(sentinel, "utf8")).toBe("unchanged");
  });
});
