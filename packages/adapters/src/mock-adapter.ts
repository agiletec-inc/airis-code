/**
 * Mock adapter for testing
 */

import { AdapterProcess } from "./adapter.js";
import { AdapterEventKind } from "./events.js";
import type {
  AdapterMetadata,
  ExecuteRequest,
  ExecuteResponse,
  ShellExecutionResult,
  SpawnOptions,
} from "./types.js";

/**
 * Mock execution response
 */
export interface MockExecuteResponse {
  outputJson: string;
  proposedShell?: string[];
}

/**
 * Mock adapter configuration
 */
export interface MockAdapterConfig {
  /** Predefined responses */
  responses?: Map<string, MockExecuteResponse>;
  /** Simulate delay (ms) */
  delay?: number;
  /** Simulate spawn failure */
  failSpawn?: boolean;
  /** Simulate execution failure */
  failExecute?: boolean;
}

/**
 * Mock adapter for testing purposes
 */
export class MockAdapter extends AdapterProcess {
  private responses: Map<string, MockExecuteResponse>;
  private delay: number;
  private failSpawn: boolean;
  private failExecute: boolean;
  private logs: string[] = [];
  private mockProcessId: number;

  constructor(options: SpawnOptions, config: MockAdapterConfig = {}) {
    super(options);
    this.responses = config.responses || new Map();
    this.delay = config.delay || 0;
    this.failSpawn = config.failSpawn || false;
    this.failExecute = config.failExecute || false;
    this.mockProcessId = Math.floor(Math.random() * 10000) + 1000;
  }

  getMetadata(): AdapterMetadata {
    return {
      name: "mock-adapter",
      version: "1.0.0-mock",
      supportedActions: ["implement", "refactor", "test", "review"],
      requiresCLI: undefined,
    };
  }

  async spawn(): Promise<void> {
    if (this.failSpawn) {
      this.setState({ status: "error", error: "Mock spawn failure" });
      throw new Error("Mock spawn failure");
    }

    this.setState({ status: "spawning", startedAt: new Date() });

    if (this.delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delay));
    }

    this.setState({
      status: "ready",
      processId: this.mockProcessId,
    });

    this.emit({
      kind: AdapterEventKind.SPAWNED,
      timestamp: new Date(),
      sessionId: this.options.sessionId,
      adapterName: this.options.adapterName,
      processId: this.mockProcessId,
    });

    this.emit({
      kind: AdapterEventKind.READY,
      timestamp: new Date(),
      sessionId: this.options.sessionId,
      adapterName: this.options.adapterName,
    });
  }

  async execute(request: ExecuteRequest): Promise<ExecuteResponse> {
    this.validateExecuteRequest(request);

    if (this.failExecute) {
      this.setState({ status: "error", error: "Mock execution failure" });
      throw new Error("Mock execution failure");
    }

    this.setState({ status: "busy" });

    this.emit({
      kind: AdapterEventKind.EXECUTE_START,
      timestamp: new Date(),
      sessionId: this.options.sessionId,
      adapterName: this.options.adapterName,
      action: request.action,
    });

    if (this.delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delay));
    }

    // Get mock response for this action
    const mockResponse = this.responses.get(request.action) || {
      outputJson: JSON.stringify({ success: true, message: "Mock execution complete" }),
      proposedShell: [],
    };

    // Filter proposed shell commands through Shell Guard
    const filteredShell = (mockResponse.proposedShell || []).filter((cmd) => {
      const validation = this.validateShellCommand(cmd);
      if (!validation.allowed) {
        this.emit({
          kind: AdapterEventKind.SHELL_BLOCKED,
          timestamp: new Date(),
          sessionId: this.options.sessionId,
          adapterName: this.options.adapterName,
          command: cmd,
          reason: validation.reason || "Unknown reason",
        });
      } else {
        this.emit({
          kind: AdapterEventKind.SHELL_PROPOSED,
          timestamp: new Date(),
          sessionId: this.options.sessionId,
          adapterName: this.options.adapterName,
          command: cmd,
        });
      }
      return validation.allowed;
    });

    this.setState({ status: "ready" });

    this.emit({
      kind: AdapterEventKind.EXECUTE_END,
      timestamp: new Date(),
      sessionId: this.options.sessionId,
      adapterName: this.options.adapterName,
      action: request.action,
      success: true,
    });

    return {
      outputJson: mockResponse.outputJson,
      proposedShell: filteredShell,
    };
  }

  async *streamLogs(): AsyncIterable<string> {
    for (const log of this.logs) {
      yield log;
    }
  }

  async requestShell(command: string): Promise<ShellExecutionResult> {
    const validation = this.validateShellCommand(command);

    if (!validation.allowed) {
      this.emit({
        kind: AdapterEventKind.SHELL_BLOCKED,
        timestamp: new Date(),
        sessionId: this.options.sessionId,
        adapterName: this.options.adapterName,
        command,
        reason: validation.reason || "Unknown reason",
      });

      return {
        allowed: false,
        reason: validation.reason,
      };
    }

    // Simulate command execution
    if (this.delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delay));
    }

    this.emit({
      kind: AdapterEventKind.SHELL_EXECUTED,
      timestamp: new Date(),
      sessionId: this.options.sessionId,
      adapterName: this.options.adapterName,
      command,
      exitCode: 0,
    });

    return {
      allowed: true,
      exitCode: 0,
      stdout: `Mock execution of: ${command}`,
      stderr: "",
    };
  }

  async terminate(): Promise<void> {
    this.setState({
      status: "terminated",
      terminatedAt: new Date(),
    });

    this.emit({
      kind: AdapterEventKind.TERMINATED,
      timestamp: new Date(),
      sessionId: this.options.sessionId,
      adapterName: this.options.adapterName,
      exitCode: 0,
    });
  }

  /**
   * Set mock response for an action
   */
  setResponse(action: string, response: MockExecuteResponse): void {
    this.responses.set(action, response);
  }

  /**
   * Add a log message
   */
  addLog(message: string): void {
    this.logs.push(message);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Get recorded events (for testing)
   */
  getEmittedEvents(): AnyAdapterEvent[] {
    const events: AnyAdapterEvent[] = [];
    this.on((event) => events.push(event));
    return events;
  }
}
