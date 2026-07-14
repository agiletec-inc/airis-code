import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";

export const RunStatusSchema = z
  .object({
    schemaVersion: z.literal(1),
    runId: z.string().min(1),
    state: z.enum([
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
    ]),
    updatedAt: z.string().datetime(),
    issue: z.string().min(1).optional(),
    repository: z.string().min(1),
    attention: z.enum(["none", "operator", "ci", "approval"]),
  })
  .strict();

export type RunStatus = z.infer<typeof RunStatusSchema>;

export async function loadRunStatus(
  path: string,
): Promise<
  { ok: true; path: string; status: RunStatus } | { ok: false; path: string; errors: string[] }
> {
  const absolutePath = resolve(path);
  try {
    const value: unknown = JSON.parse(await readFile(absolutePath, "utf8"));
    const result = RunStatusSchema.safeParse(value);
    if (result.success) return { ok: true, path: absolutePath, status: result.data };
    return {
      ok: false,
      path: absolutePath,
      errors: result.error.issues.map(
        (issue) => `${issue.path.join(".") || "status"}: ${issue.message}`,
      ),
    };
  } catch (error) {
    return {
      ok: false,
      path: absolutePath,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}
