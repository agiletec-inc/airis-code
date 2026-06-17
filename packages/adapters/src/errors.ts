/**
 * Error classes for adapter processes
 */

/**
 * Base error for adapter-related issues
 */
export class AdapterError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "AdapterError";
  }
}

/**
 * Error when adapter spawn fails
 */
export class AdapterSpawnError extends AdapterError {
  constructor(
    message: string,
    public readonly adapterName: string,
  ) {
    super(message, "ADAPTER_SPAWN_ERROR");
    this.name = "AdapterSpawnError";
  }
}

/**
 * Error when adapter execution fails
 */
export class AdapterExecutionError extends AdapterError {
  constructor(
    message: string,
    public readonly action?: string,
  ) {
    super(message, "ADAPTER_EXECUTION_ERROR");
    this.name = "AdapterExecutionError";
  }
}

/**
 * Error when adapter times out
 */
export class AdapterTimeoutError extends AdapterError {
  constructor(message: string = "Adapter operation timed out") {
    super(message, "ADAPTER_TIMEOUT_ERROR");
    this.name = "AdapterTimeoutError";
  }
}

/**
 * Error when adapter process crashes
 */
export class AdapterCrashError extends AdapterError {
  constructor(
    message: string,
    public readonly exitCode?: number,
    public readonly signal?: string,
  ) {
    super(message, "ADAPTER_CRASH_ERROR");
    this.name = "AdapterCrashError";
  }
}

/**
 * Error when shell command is blocked
 */
export class ShellBlockedError extends AdapterError {
  constructor(
    message: string,
    public readonly command: string,
    public readonly reason: string,
  ) {
    super(message, "SHELL_BLOCKED_ERROR");
    this.name = "ShellBlockedError";
  }
}
