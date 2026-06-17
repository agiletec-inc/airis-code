/**
 * Base adapter process abstract class
 */

import { ShellGuard } from "@airiscode/sandbox";
import type { AnyAdapterEvent } from "./events.js";
import type {
  AdapterMetadata,
  AdapterState,
  AdapterStatus,
  ExecuteRequest,
  ExecuteResponse,
  ShellExecutionResult,
  SpawnOptions,
} from "./types.js";

/**
 * Abstract base class for all adapter processes
 *
 * Implementations must provide:
 * - getMetadata(): Return adapter metadata
 * - spawn(): Start the adapter process
 * - execute(): Execute an action
 * - streamLogs(): Stream log output
 * - requestShell(): Request shell command execution
 * - terminate(): Stop the adapter process
 */
export abstract class AdapterProcess {
  protected guard: ShellGuard;
  protected options: SpawnOptions;
  protected state: AdapterState;
  protected eventListeners: Array<(event: AnyAdapterEvent) => void> = [];

  constructor(options: SpawnOptions) {
    this.options = options;
    this.guard = new ShellGuard(options.policy);
    this.state = {
      status: "idle",
    };
  }

  /**
   * Get adapter metadata
   */
  abstract getMetadata(): AdapterMetadata;

  /**
   * Spawn the adapter process
   */
  abstract spawn(): Promise<void>;

  /**
   * Execute an action via the adapter
   */
  abstract execute(request: ExecuteRequest): Promise<ExecuteResponse>;

  /**
   * Stream log output from the adapter
   */
  abstract streamLogs(): AsyncIterable<string>;

  /**
   * Request shell command execution
   *
   * The command will be validated by Shell Guard before execution
   */
  abstract requestShell(command: string): Promise<ShellExecutionResult>;

  /**
   * Terminate the adapter process
   */
  abstract terminate(): Promise<void>;

  /**
   * Get current adapter state
   */
  getState(): Readonly<AdapterState> {
    return { ...this.state };
  }

  /**
   * Get spawn options
   */
  getOptions(): Readonly<SpawnOptions> {
    return { ...this.options };
  }

  /**
   * Add event listener
   */
  on(listener: (event: AnyAdapterEvent) => void): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove event listener
   */
  off(listener: (event: AnyAdapterEvent) => void): void {
    this.eventListeners = this.eventListeners.filter((l) => l !== listener);
  }

  /**
   * Emit an event to all listeners
   */
  protected emit(event: AnyAdapterEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error("Error in event listener:", error);
      }
    }
  }

  /**
   * Update adapter state
   */
  protected setState(updates: Partial<AdapterState>): void {
    this.state = { ...this.state, ...updates };
  }

  /**
   * Validate execute request
   */
  protected validateExecuteRequest(request: ExecuteRequest): void {
    if (!request.action) {
      throw new Error("Action is required");
    }
    if (!request.inputJson) {
      throw new Error("Input JSON is required");
    }

    // Validate JSON
    try {
      JSON.parse(request.inputJson);
    } catch {
      throw new Error("Invalid input JSON");
    }
  }

  /**
   * Validate shell command with Shell Guard
   */
  protected validateShellCommand(command: string): {
    allowed: boolean;
    reason?: string;
  } {
    const result = this.guard.evaluate(command);
    return {
      allowed: result.allowed,
      reason: result.reason,
    };
  }
}
