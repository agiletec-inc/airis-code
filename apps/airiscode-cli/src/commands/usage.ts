import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Readable } from "node:stream";
import type { Argv, CommandModule } from "yargs";

type UsageWindow = {
  usedPercent: number;
  resetsAt?: string;
};

export type UsageSnapshot = {
  schemaVersion: 1;
  provider: "claude";
  capturedAt: string;
  source: "claude-statusline";
  policyVersion?: string;
  windows: {
    fiveHour: UsageWindow;
    sevenDay: UsageWindow;
  };
};

type UsageCommandDependencies = {
  stdin?: Readable;
  stdout?: (line: string) => void;
};

const RFC3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export function defaultUsageHome(): string {
  return join(homedir(), ".airis", "usage");
}

function usageHome(): string {
  return process.env["AIRIS_USAGE_HOME"] || defaultUsageHome();
}

function timestamp(value: unknown, field: string): string {
  if (typeof value !== "string" || !RFC3339.test(value) || Number.isNaN(Date.parse(value))) {
    throw new Error(`${field} must be a valid RFC3339 timestamp`);
  }
  return new Date(value).toISOString();
}

function percent(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`${field} percent must be a number in the range 0..100`);
  }
  return value;
}

function normalizeWindow(value: unknown, field: string): UsageWindow {
  if (!value || typeof value !== "object") throw new Error(`${field} quota window is required`);
  const input = value as Record<string, unknown>;
  const result: UsageWindow = { usedPercent: percent(input["used_percentage"], field) };
  if (input["resets_at"] !== undefined)
    result.resetsAt = timestamp(input["resets_at"], `${field}.resets_at`);
  return result;
}

function normalizeClaude(input: unknown, policyVersion?: string): UsageSnapshot {
  if (!input || typeof input !== "object")
    throw new Error("Claude statusline JSON must be an object");
  const payload = input as Record<string, unknown>;
  const limits = payload["rate_limits"];
  if (!limits || typeof limits !== "object") throw new Error("rate_limits is required");
  const rateLimits = limits as Record<string, unknown>;
  const snapshot: UsageSnapshot = {
    schemaVersion: 1,
    provider: "claude",
    capturedAt: timestamp(payload["captured_at"], "captured_at"),
    source: "claude-statusline",
    windows: {
      fiveHour: normalizeWindow(rateLimits["five_hour"], "rate_limits.five_hour"),
      sevenDay: normalizeWindow(rateLimits["seven_day"], "rate_limits.seven_day"),
    },
  };
  if (policyVersion !== undefined) snapshot.policyVersion = policyVersion;
  return snapshot;
}

async function readStream(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream)
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

async function loadSnapshots(): Promise<UsageSnapshot[]> {
  let names: string[];
  try {
    names = await readdir(usageHome());
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const records = await Promise.all(
    names
      .filter((name) => name.endsWith(".json"))
      .map(
        async (name) =>
          JSON.parse(await readFile(join(usageHome(), name), "utf8")) as UsageSnapshot,
      ),
  );
  return records.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
}

async function persist(snapshot: UsageSnapshot): Promise<void> {
  const home = usageHome();
  await mkdir(home, { recursive: true, mode: 0o700 });
  const identity = `${snapshot.provider}\0${snapshot.source}\0${snapshot.capturedAt}`;
  const name = `${createHash("sha256").update(identity).digest("hex")}.json`;
  const destination = join(home, name);
  try {
    await readFile(destination);
    return;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const temporary = join(home, `.${name}.${process.pid}.${Date.now()}.tmp`);
  await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
    flag: "wx",
  });
  await rename(temporary, destination);
}

export function usageCommand(dependencies: UsageCommandDependencies = {}): CommandModule {
  const stdin = dependencies.stdin ?? process.stdin;
  const output = dependencies.stdout ?? ((line: string) => process.stdout.write(`${line}\n`));
  const print = (value: unknown) => output(JSON.stringify(value));

  const snapshot: CommandModule = {
    command: "snapshot",
    describe: "Record a normalized provider quota snapshot",
    builder: (yargs: Argv) =>
      yargs
        .option("provider", {
          type: "string",
          demandOption: true,
          choices: ["claude", "codex", "gemini"],
        })
        .option("input", {
          type: "string",
          describe: "Read the provider payload from this file instead of stdin",
        })
        .option("policy-version", {
          type: "string",
          describe: "Policy version active at capture time",
        }),
    handler: async (argv) => {
      if (argv["provider"] !== "claude")
        throw new Error(
          `Provider ${String(argv["provider"])} is unsupported: source adapter not implemented`,
        );
      const text = argv["input"]
        ? await readFile(String(argv["input"]), "utf8")
        : await readStream(stdin);
      let payload: unknown;
      try {
        payload = JSON.parse(text);
      } catch (error) {
        throw new Error(
          `Invalid JSON input: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      const record = normalizeClaude(payload, argv["policyVersion"] as string | undefined);
      await persist(record);
      print(record);
    },
  };

  const queryBuilder = (yargs: Argv) =>
    yargs
      .option("json", {
        type: "boolean",
        demandOption: true,
        describe: "Print machine-readable JSON",
      })
      .option("provider", { type: "string", choices: ["claude"] });

  const latest: CommandModule = {
    command: "latest",
    describe: "Return the newest quota snapshot",
    builder: queryBuilder,
    handler: async (argv) => {
      const records = (await loadSnapshots()).filter(
        (record) => !argv["provider"] || record.provider === argv["provider"],
      );
      print(records.at(-1) ?? null);
    },
  };

  const history: CommandModule = {
    command: "history",
    describe: "Return quota snapshot history in capture order",
    builder: (yargs: Argv) =>
      queryBuilder(yargs).option("since", {
        type: "string",
        describe: "Include snapshots at or after this RFC3339 timestamp",
      }),
    handler: async (argv) => {
      const since = argv["since"] === undefined ? undefined : timestamp(argv["since"], "--since");
      const records = (await loadSnapshots()).filter(
        (record) =>
          (!argv["provider"] || record.provider === argv["provider"]) &&
          (!since || record.capturedAt >= since),
      );
      print(records);
    },
  };

  return {
    command: "usage",
    describe: "Record and query local provider quota history",
    builder: (yargs: Argv) =>
      yargs.command(snapshot).command(latest).command(history).demandCommand(1),
    handler: () => {
      // demandCommand ensures a concrete operation handled above is always selected.
    },
  };
}
