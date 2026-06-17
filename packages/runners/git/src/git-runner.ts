/**
 * Git runner implementation
 */

import { err, ok } from "@airiscode/types";
import { LogResult, SimpleGit, StatusResult, simpleGit } from "simple-git";
import type {
  GitApplyOptions,
  GitApplyResult,
  GitBranch,
  GitBranchResult,
  GitCommitOptions,
  GitCommitResult,
  GitCommitResultType,
  GitDiffOptions,
  GitDiffResult,
  GitLogEntry,
  GitLogResult,
  GitOperation,
  GitPushOptions,
  GitPushResult,
  GitRunnerError,
  GitStatus,
  GitStatusResult,
} from "./types.js";
import { GitRunnerError as GitError } from "./types.js";

/**
 * Git operations runner
 *
 * Features:
 * - Status and diff operations
 * - Commit, push, pull operations
 * - Branch management
 * - Patch application
 * - Error handling with typed results
 */
export class GitRunner {
  private git: SimpleGit;

  constructor(private workingDir: string) {
    this.git = simpleGit({
      baseDir: workingDir,
      binary: "git",
      maxConcurrentProcesses: 6,
    });
  }

  /**
   * Get repository status
   */
  async status(): Promise<GitStatusResult> {
    try {
      const status: StatusResult = await this.git.status();

      const result: GitStatus = {
        current: status.current || "",
        modified: status.modified,
        staged: status.staged,
        untracked: status.not_added,
        conflicted: status.conflicted,
        isClean: status.isClean(),
        tracking: status.tracking
          ? {
              ahead: status.ahead,
              behind: status.behind,
            }
          : undefined,
      };

      return ok(result);
    } catch (error) {
      return err(
        new GitError(
          "Failed to get git status",
          GitOperation.STATUS,
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  /**
   * Get diff
   */
  async diff(options: GitDiffOptions = {}): Promise<GitDiffResult> {
    try {
      const args: string[] = [];

      if (options.staged || options.cached) {
        args.push("--cached");
      }

      if (options.context !== undefined) {
        args.push(`-U${options.context}`);
      }

      if (options.files && options.files.length > 0) {
        args.push("--", ...options.files);
      }

      const diff = await this.git.diff(args);
      return ok(diff);
    } catch (error) {
      return err(
        new GitError(
          "Failed to get git diff",
          GitOperation.DIFF,
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  /**
   * Add files to staging area
   */
  async add(files: string[]): Promise<Result<void, GitRunnerError>> {
    try {
      await this.git.add(files);
      return ok(undefined);
    } catch (error) {
      return err(
        new GitError(
          "Failed to add files",
          GitOperation.ADD,
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  /**
   * Create commit
   */
  async commit(options: GitCommitOptions): Promise<GitCommitResultType> {
    try {
      const commitArgs: string[] = [];

      if (options.allowEmpty) {
        commitArgs.push("--allow-empty");
      }

      if (options.amend) {
        commitArgs.push("--amend");
      }

      if (options.author) {
        const authorStr = options.email ? `${options.author} <${options.email}>` : options.author;
        commitArgs.push("--author", authorStr);
      }

      commitArgs.push("-m", options.message);

      const result = await this.git.commit(options.message, undefined, commitArgs);

      const commitResult: GitCommitResult = {
        commit: result.commit || "",
        summary: {
          changes: result.summary.changes,
          insertions: result.summary.insertions,
          deletions: result.summary.deletions,
        },
      };

      return ok(commitResult);
    } catch (error) {
      return err(
        new GitError(
          "Failed to create commit",
          GitOperation.COMMIT,
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  /**
   * Push commits
   */
  async push(options: GitPushOptions = {}): Promise<GitPushResult> {
    try {
      const remote = options.remote || "origin";
      const branch = options.branch;

      const pushArgs: string[] = [remote];

      if (branch) {
        pushArgs.push(branch);
      }

      if (options.force) {
        pushArgs.push("--force");
      }

      if (options.setUpstream) {
        pushArgs.push("--set-upstream");
      }

      await this.git.push(pushArgs);
      return ok(undefined);
    } catch (error) {
      return err(
        new GitError(
          "Failed to push commits",
          GitOperation.PUSH,
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  /**
   * Pull changes
   */
  async pull(remote: string = "origin", branch?: string): Promise<Result<void, GitRunnerError>> {
    try {
      await this.git.pull(remote, branch);
      return ok(undefined);
    } catch (error) {
      return err(
        new GitError(
          "Failed to pull changes",
          GitOperation.PULL,
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  /**
   * List branches
   */
  async listBranches(): Promise<GitBranchResult> {
    try {
      const result = await this.git.branch(["-a", "-v"]);

      const branches: GitBranch[] = Object.entries(result.branches).map(([name, branch]) => ({
        name,
        current: branch.current,
        remote: branch.label,
        commit: branch.commit,
      }));

      return ok(branches);
    } catch (error) {
      return err(
        new GitError(
          "Failed to list branches",
          GitOperation.BRANCH,
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  /**
   * Create branch
   */
  async createBranch(name: string, startPoint?: string): Promise<Result<void, GitRunnerError>> {
    try {
      if (startPoint) {
        await this.git.checkoutBranch(name, startPoint);
      } else {
        await this.git.checkoutLocalBranch(name);
      }
      return ok(undefined);
    } catch (error) {
      return err(
        new GitError(
          "Failed to create branch",
          GitOperation.BRANCH,
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  /**
   * Checkout branch
   */
  async checkout(branch: string): Promise<Result<void, GitRunnerError>> {
    try {
      await this.git.checkout(branch);
      return ok(undefined);
    } catch (error) {
      return err(
        new GitError(
          "Failed to checkout branch",
          GitOperation.CHECKOUT,
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  /**
   * Get commit log
   */
  async log(maxCount: number = 10): Promise<GitLogResult> {
    try {
      const result: LogResult = await this.git.log({ maxCount });

      const entries: GitLogEntry[] = result.all.map((commit) => ({
        hash: commit.hash,
        date: new Date(commit.date),
        message: commit.message,
        author: commit.author_name,
        email: commit.author_email,
      }));

      return ok(entries);
    } catch (error) {
      return err(
        new GitError(
          "Failed to get commit log",
          GitOperation.LOG,
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  /**
   * Apply patch
   */
  async applyPatch(options: GitApplyOptions): Promise<GitApplyResult> {
    try {
      const args: string[] = [];

      if (options.check) {
        args.push("--check");
      }

      if (options.reverse) {
        args.push("--reverse");
      }

      if (options.whitespace) {
        args.push(`--whitespace=${options.whitespace}`);
      }

      // Write patch to temporary file
      const { writeFileSync, unlinkSync } = await import("fs");
      const { join } = await import("path");
      const tmpFile = join(this.workingDir, ".git-patch-tmp");

      try {
        writeFileSync(tmpFile, options.patch);
        await this.git.raw(["apply", ...args, tmpFile]);
        return ok(undefined);
      } finally {
        try {
          unlinkSync(tmpFile);
        } catch {
          // Ignore cleanup errors
        }
      }
    } catch (error) {
      return err(
        new GitError(
          "Failed to apply patch",
          GitOperation.APPLY,
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  /**
   * Reset changes
   */
  async reset(
    mode: "soft" | "mixed" | "hard" = "mixed",
    ref: string = "HEAD",
  ): Promise<Result<void, GitRunnerError>> {
    try {
      await this.git.reset([`--${mode}`, ref]);
      return ok(undefined);
    } catch (error) {
      return err(
        new GitError(
          "Failed to reset changes",
          GitOperation.RESET,
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  /**
   * Stash changes
   */
  async stash(message?: string): Promise<Result<void, GitRunnerError>> {
    try {
      if (message) {
        await this.git.stash(["push", "-m", message]);
      } else {
        await this.git.stash();
      }
      return ok(undefined);
    } catch (error) {
      return err(
        new GitError(
          "Failed to stash changes",
          GitOperation.STASH,
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  /**
   * Apply stash
   */
  async stashPop(): Promise<Result<void, GitRunnerError>> {
    try {
      await this.git.stash(["pop"]);
      return ok(undefined);
    } catch (error) {
      return err(
        new GitError(
          "Failed to pop stash",
          GitOperation.STASH,
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }
}
