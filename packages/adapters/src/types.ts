/**
 * Type definitions for adapter processes
 */

import { PolicyProfile } from "@airiscode/policies";

/**
 * Options for spawning an adapter process
 */
export interface SpawnOptions {
  /** Name of the adapter (e.g., 'claude-code', 'codex') */
  adapterName: string;
  /** Environment variables */
  env: Record<string, string>;
  /** Policy profile to enforce */
  policy: PolicyProfile;
  /** Session identifier */
  sessionId: string;
  /** Working directory */
  workingDir: string;
  /** Additional CLI arguments */
  args?: string[];
}

/**
 * Request to execute an action via adapter
 */
export interface ExecuteRequest {
  /** Action to perform (e.g., 'implement', 'refactor', 'test') */
  action: string;
  /** JSON-serialized input data */
  inputJson: string;
}

/**
 * Response from adapter execution
 */
export interface ExecuteResponse {
  /** JSON-serialized output data */
  outputJson: string;
  /** Shell commands proposed by the adapter */
  proposedShell: string[];
}

/**
 * Result of shell command execution
 */
export interface ShellExecutionResult {
  /** Whether the command was allowed */
  allowed: boolean;
  /** Exit code (if executed) */
  exitCode?: number;
  /** Standard output */
  stdout?: string;
  /** Standard error */
  stderr?: string;
  /** Reason for blocking (if not allowed) */
  reason?: string;
}

/**
 * Adapter metadata
 */
export interface AdapterMetadata {
  /** Adapter name */
  name: string;
  /** Adapter version */
  version: string;
  /** Supported actions */
  supportedActions: string[];
  /** Whether it requires a specific CLI to be installed */
  requiresCLI?: string;
}

/**
 * Adapter status
 */
export type AdapterStatus = "idle" | "spawning" | "ready" | "busy" | "error" | "terminated";

/**
 * Adapter state information
 */
export interface AdapterState {
  /** Current status */
  status: AdapterStatus;
  /** Process ID (if spawned) */
  processId?: number;
  /** Error message (if in error state) */
  error?: string;
  /** Start time */
  startedAt?: Date;
  /** End time (if terminated) */
  terminatedAt?: Date;
}
