import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse } from "yaml";
import { z } from "zod";

const commandSchema = z.array(z.string().min(1)).min(1);

export const RepositoryProfileSchema = z
  .object({
    version: z.literal(1),
    repository: z
      .object({
        provider: z.enum(["github", "gitlab"]),
        owner: z.string().min(1),
        name: z.string().min(1),
        defaultBranch: z.string().min(1),
        issueProvider: z.enum(["github", "gitlab"]),
      })
      .strict(),
    workflow: z
      .object({
        issueLabels: z
          .object({
            queue: z.string().min(1),
            active: z.string().min(1),
            review: z.string().min(1),
            blocked: z.string().min(1),
          })
          .strict(),
        autoMerge: z.boolean(),
        maxConcurrent: z.number().int().positive().max(64),
        riskPolicy: z.enum(["standard", "strict"]),
        approvals: z.enum(["never", "on-failure", "on-request"]),
        agents: z
          .object({
            implement: z.string().min(1),
            verify: z.string().min(1),
            review: z.string().min(1),
          })
          .strict(),
      })
      .strict(),
    commands: z
      .object({
        test: commandSchema.optional(),
        lint: commandSchema.optional(),
        typecheck: commandSchema.optional(),
        build: commandSchema.optional(),
      })
      .strict(),
    workspace: z
      .object({
        strategy: z.enum(["worktree", "container"]),
        root: z.string().min(1).optional(),
      })
      .strict(),
    privacy: z
      .object({
        telemetry: z.enum(["disabled", "local", "remote"]),
        collectSource: z.literal(false),
        collectPrompts: z.literal(false),
        collectQuota: z.boolean(),
        remoteEndpoint: z.string().url().optional(),
        remoteConsent: z.boolean(),
        retentionDays: z.number().int().nonnegative().max(3650),
      })
      .strict()
      .superRefine((value, context) => {
        if (value.telemetry === "remote" && (!value.remoteEndpoint || !value.remoteConsent)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "remote telemetry requires endpoint and consent",
          });
        }
      }),
  })
  .strict();

export type RepositoryProfile = z.infer<typeof RepositoryProfileSchema>;
export type RepositoryProfileResult =
  | { ok: true; path: string; profile: RepositoryProfile }
  | { ok: false; path: string; errors: string[] };

export async function loadRepositoryProfile(path: string): Promise<RepositoryProfileResult> {
  const absolutePath = resolve(path);
  let source: string;
  try {
    source = await readFile(absolutePath, "utf8");
  } catch (error) {
    return {
      ok: false,
      path: absolutePath,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
  let value: unknown;
  try {
    value = parse(source);
  } catch (error) {
    return {
      ok: false,
      path: absolutePath,
      errors: [`invalid YAML: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
  const result = RepositoryProfileSchema.safeParse(value);
  if (result.success) return { ok: true, path: absolutePath, profile: result.data };
  return {
    ok: false,
    path: absolutePath,
    errors: result.error.issues.map(
      (issue) => `${issue.path.join(".") || "profile"}: ${issue.message}`,
    ),
  };
}
