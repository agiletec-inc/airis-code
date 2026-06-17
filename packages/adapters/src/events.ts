/**
 * Event types emitted by adapters
 */

/**
 * Event kinds
 */
export enum AdapterEventKind {
  SPAWNED = "spawned",
  READY = "ready",
  EXECUTE_START = "execute_start",
  EXECUTE_END = "execute_end",
  SHELL_PROPOSED = "shell_proposed",
  SHELL_BLOCKED = "shell_blocked",
  SHELL_EXECUTED = "shell_executed",
  LOG = "log",
  ERROR = "error",
  TERMINATED = "terminated",
}

/**
 * Base adapter event
 */
export interface AdapterEvent {
  /** Event kind */
  kind: AdapterEventKind;
  /** Timestamp */
  timestamp: Date;
  /** Session ID */
  sessionId: string;
  /** Adapter name */
  adapterName: string;
}

/**
 * Spawned event
 */
export interface SpawnedEvent extends AdapterEvent {
  kind: AdapterEventKind.SPAWNED;
  /** Process ID */
  processId: number;
}

/**
 * Ready event
 */
export interface ReadyEvent extends AdapterEvent {
  kind: AdapterEventKind.READY;
}

/**
 * Execute start event
 */
export interface ExecuteStartEvent extends AdapterEvent {
  kind: AdapterEventKind.EXECUTE_START;
  /** Action being executed */
  action: string;
}

/**
 * Execute end event
 */
export interface ExecuteEndEvent extends AdapterEvent {
  kind: AdapterEventKind.EXECUTE_END;
  /** Action that was executed */
  action: string;
  /** Whether execution succeeded */
  success: boolean;
}

/**
 * Shell proposed event
 */
export interface ShellProposedEvent extends AdapterEvent {
  kind: AdapterEventKind.SHELL_PROPOSED;
  /** Proposed command */
  command: string;
}

/**
 * Shell blocked event
 */
export interface ShellBlockedEvent extends AdapterEvent {
  kind: AdapterEventKind.SHELL_BLOCKED;
  /** Blocked command */
  command: string;
  /** Reason for blocking */
  reason: string;
}

/**
 * Shell executed event
 */
export interface ShellExecutedEvent extends AdapterEvent {
  kind: AdapterEventKind.SHELL_EXECUTED;
  /** Executed command */
  command: string;
  /** Exit code */
  exitCode: number;
}

/**
 * Log event
 */
export interface LogEvent extends AdapterEvent {
  kind: AdapterEventKind.LOG;
  /** Log level */
  level: "debug" | "info" | "warn" | "error";
  /** Log message */
  message: string;
}

/**
 * Error event
 */
export interface ErrorEvent extends AdapterEvent {
  kind: AdapterEventKind.ERROR;
  /** Error message */
  error: string;
  /** Stack trace (if available) */
  stack?: string;
}

/**
 * Terminated event
 */
export interface TerminatedEvent extends AdapterEvent {
  kind: AdapterEventKind.TERMINATED;
  /** Exit code (if available) */
  exitCode?: number;
  /** Signal (if killed) */
  signal?: string;
}

/**
 * Union type of all adapter events
 */
export type AnyAdapterEvent =
  | SpawnedEvent
  | ReadyEvent
  | ExecuteStartEvent
  | ExecuteEndEvent
  | ShellProposedEvent
  | ShellBlockedEvent
  | ShellExecutedEvent
  | LogEvent
  | ErrorEvent
  | TerminatedEvent;
