/**
 * Git runner types
 */

import type { Result } from "@airiscode/types";

/**
 * Git operation types
 */
export enum GitOperation {
  STATUS = "status",
  DIFF = "diff",
  ADD = "add",
  COMMIT = "commit",
  PUSH = "push",
  PULL = "pull",
  BRANCH = "branch",
  CHECKOUT = "checkout",
  LOG = "log",
  RESET = "reset",
  STASH = "stash",
  APPLY = "apply",
}

/**
 * Git status result
 */
export interface GitStatus {
  /** Current branch */
  current: string;
  /** Modified files */
  modified: string[];
  /** Staged files */
  staged: string[];
  /** Untracked files */
  untracked: string[];
  /** Conflicted files */
  conflicted: string[];
  /** Is repository clean */
  isClean: boolean;
  /** Ahead/behind remote */
  tracking?: {
    ahead: number;
    behind: number;
  };
}

/**
 * Git diff options
 */
export interface GitDiffOptions {
  /** Files to diff */
  files?: string[];
  /** Staged changes only */
  staged?: boolean;
  /** Cached changes */
  cached?: boolean;
  /** Number of context lines */
  context?: number;
}

/**
 * Git commit options
 */
export interface GitCommitOptions {
  /** Commit message */
  message: string;
  /** Author name */
  author?: string;
  /** Author email */
  email?: string;
  /** Allow empty commit */
  allowEmpty?: boolean;
  /** Amend previous commit */
  amend?: boolean;
}

/**
 * Git commit result
 */
export interface GitCommitResult {
  /** Commit hash */
  commit: string;
  /** Summary */
  summary: {
    changes: number;
    insertions: number;
    deletions: number;
  };
}

/**
 * Git push options
 */
export interface GitPushOptions {
  /** Remote name */
  remote?: string;
  /** Branch name */
  branch?: string;
  /** Force push */
  force?: boolean;
  /** Set upstream */
  setUpstream?: boolean;
}

/**
 * Git branch info
 */
export interface GitBranch {
  /** Branch name */
  name: string;
  /** Current branch */
  current: boolean;
  /** Remote tracking */
  remote?: string;
  /** Commit hash */
  commit: string;
}

/**
 * Git log entry
 */
export interface GitLogEntry {
  /** Commit hash */
  hash: string;
  /** Commit date */
  date: Date;
  /** Commit message */
  message: string;
  /** Author name */
  author: string;
  /** Author email */
  email: string;
}

/**
 * Git apply options
 */
export interface GitApplyOptions {
  /** Patch content */
  patch: string;
  /** Check only (dry run) */
  check?: boolean;
  /** Reverse patch */
  reverse?: boolean;
  /** Whitespace handling */
  whitespace?: "nowarn" | "warn" | "fix" | "error";
}

/**
 * Git runner error
 */
export class GitRunnerError extends Error {
  constructor(
    message: string,
    public operation: GitOperation,
    public cause?: Error,
  ) {
    super(message);
    this.name = "GitRunnerError";
  }
}

/**
 * Git runner result types
 */
export type GitStatusResult = Result<GitStatus, GitRunnerError>;
export type GitDiffResult = Result<string, GitRunnerError>;
export type GitCommitResultType = Result<GitCommitResult, GitRunnerError>;
export type GitPushResult = Result<void, GitRunnerError>;
export type GitBranchResult = Result<GitBranch[], GitRunnerError>;
export type GitLogResult = Result<GitLogEntry[], GitRunnerError>;
export type GitApplyResult = Result<void, GitRunnerError>;
