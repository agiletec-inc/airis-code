import { createHash } from "node:crypto";
import { chmod, link, mkdir, readdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { z } from "zod";
import { type RunStatus, RunStatusSchema } from "./runStatus.js";

const states = [
  "queued",
  "claimed",
  "planned",
  "implementing",
  "verifying",
  "review",
  "merge_pending",
  "merged",
  "blocked",
  "failed",
  "cancelled",
] as const;
const transitions: Record<(typeof states)[number], readonly (typeof states)[number][]> = {
  queued: ["claimed", "blocked", "cancelled"],
  claimed: ["planned", "implementing", "blocked", "cancelled"],
  planned: ["implementing", "blocked", "cancelled"],
  implementing: ["verifying", "blocked", "failed", "cancelled"],
  verifying: ["review", "implementing", "blocked", "failed", "cancelled"],
  review: ["merge_pending", "implementing", "blocked", "failed", "cancelled"],
  merge_pending: ["merged", "review", "blocked", "failed", "cancelled"],
  merged: [],
  blocked: ["queued", "cancelled"],
  failed: ["queued", "cancelled"],
  cancelled: [],
};

export const RunEventSchema = z
  .object({
    schemaVersion: z.literal(1),
    eventId: z.string().min(1),
    idempotencyKey: z.string().min(1),
    runId: z.string().min(1),
    state: z.enum(states),
    occurredAt: z.string().datetime(),
    repository: z.string().min(1),
    issue: z.string().min(1).optional(),
    attention: z.enum(["none", "operator", "ci", "approval"]),
  })
  .strict();

export type RunEvent = z.infer<typeof RunEventSchema>;

export type RunStoreOptions = { home?: string; statusPath?: string };

export function defaultRunHome(): string {
  return process.env["AIRIS_RUN_HOME"] || join(homedir(), ".airis", "runs");
}

function eventHome(options: RunStoreOptions): string {
  return resolve(options.home ?? defaultRunHome());
}

function statusPath(options: RunStoreOptions): string {
  return resolve(options.statusPath ?? ".airis/status.json");
}

async function readEvents(home: string): Promise<RunEvent[]> {
  let names: string[];
  try {
    names = await readdir(home);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const events = await Promise.all(
    names
      .filter((name) => name.endsWith(".json"))
      .map(async (name) => {
        try {
          const result = RunEventSchema.safeParse(
            JSON.parse(await readFile(join(home, name), "utf8")),
          );
          return result.success ? result.data : null;
        } catch {
          return null;
        }
      }),
  );
  return events
    .filter((event): event is RunEvent => event !== null)
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
}

function eventName(idempotencyKey: string): string {
  return `${createHash("sha256").update(idempotencyKey).digest("hex")}.json`;
}

export async function listRunEvents(
  options: RunStoreOptions = {},
  runId?: string,
): Promise<RunEvent[]> {
  const events = await readEvents(eventHome(options));
  return runId ? events.filter((event) => event.runId === runId) : events;
}

export async function appendRunEvent(
  input: Omit<RunEvent, "schemaVersion" | "eventId">,
  options: RunStoreOptions = {},
): Promise<{ event: RunEvent; duplicate: boolean }> {
  const parsed = RunEventSchema.safeParse({
    ...input,
    schemaVersion: 1,
    eventId: input.idempotencyKey,
  });
  if (!parsed.success)
    throw new Error(
      parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
    );
  const event = parsed.data;
  const existing = (await listRunEvents(options)).find(
    (candidate) => candidate.idempotencyKey === event.idempotencyKey,
  );
  if (existing) {
    if (JSON.stringify(existing) !== JSON.stringify(event))
      throw new Error(`idempotency key conflict: ${event.idempotencyKey}`);
    return { event: existing, duplicate: true };
  }
  const prior = (await listRunEvents(options, event.runId)).at(-1);
  if (prior && event.occurredAt <= prior.occurredAt) {
    throw new Error(`event timestamp must advance: ${prior.occurredAt} -> ${event.occurredAt}`);
  }
  if (prior ? !transitions[prior.state].includes(event.state) : event.state !== "queued") {
    throw new Error(
      `invalid transition${prior ? `: ${prior.state} -> ${event.state}` : `: initial state must be queued, got ${event.state}`}`,
    );
  }
  const home = eventHome(options);
  await mkdir(home, { recursive: true, mode: 0o700 });
  await chmod(home, 0o700);
  const destination = join(home, eventName(event.idempotencyKey));
  const temporary = join(home, `.${eventName(event.idempotencyKey)}.${process.pid}.tmp`);
  try {
    await writeFile(temporary, `${JSON.stringify(event, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
      flag: "wx",
    });
    await link(temporary, destination);
    await unlink(temporary);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      const existing = RunEventSchema.parse(JSON.parse(await readFile(destination, "utf8")));
      if (JSON.stringify(existing) === JSON.stringify(event))
        return { event: existing, duplicate: true };
      throw new Error(`idempotency key conflict: ${event.idempotencyKey}`);
    }
    throw error;
  }
  return { event, duplicate: false };
}

export function statusFromEvents(events: RunEvent[]): RunStatus | null {
  const latest = events.at(-1);
  if (!latest) return null;
  const status = RunStatusSchema.parse({
    schemaVersion: 1,
    runId: latest.runId,
    state: latest.state,
    updatedAt: latest.occurredAt,
    issue: latest.issue,
    repository: latest.repository,
    attention: latest.attention,
  });
  return status;
}

export async function rebuildRunStatus(
  options: RunStoreOptions = {},
  runId?: string,
): Promise<RunStatus | null> {
  const status = statusFromEvents(await listRunEvents(options, runId));
  if (!status) return null;
  const destination = statusPath(options);
  await mkdir(dirname(destination), { recursive: true, mode: 0o700 });
  await chmod(dirname(destination), 0o700);
  const temporary = `${destination}.${process.pid}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(status, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
      flag: "wx",
    });
    await rename(temporary, destination);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
  return status;
}
