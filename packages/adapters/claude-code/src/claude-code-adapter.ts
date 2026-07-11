/**
 * Claude Code adapter implementation
 */

import type {
  AdapterMetadata,
  ExecuteRequest,
  ExecuteResponse,
  ShellExecutionResult,
  SpawnOptions,
} from "@airiscode/adapters";
import {
  AdapterCrashError,
  AdapterEventKind,
  AdapterExecutionError,
  AdapterProcess,
  AdapterSpawnError,
} from "@airiscode/adapters";
import { ChildProcess, spawn } from "child_process";
import type { ClaudeCodeResponse, ClaudeCodeTask } from "./types.js";

/**
 * Claude Code adapter
 *
 * Spawns `claude` CLI as a child process and communicates via JSON over STDIO
 */
export class ClaudeCodeAdapter extends AdapterProcess {
  private process?: ChildProcess;
  private responseBuffer: string = "";
  private pendingResolvers: Map<
    string,
    { resolve: (value: ClaudeCodeResponse) => void; reject: (error: Error) => void }
  > = new Map();

  constructor(options: SpawnOptions) {
    super(options);
  }

  getMetadata(): AdapterMetadata {
    return {
      name: "claude-code",
      version: "1.0.0",
      supportedActions: ["implement", "refactor", "test", "review", "explain"],
      requiresCLI: "claude",
    };
  }

  async spawn(): Promise<void> {
    this.setState({ status: "spawning", startedAt: new Date() });

    try {
      // Spawn Claude Code CLI in JSON mode
      this.process = spawn("claude", ["--json"], {
        cwd: this.options.workingDir,
        env: {
          ...process.env,
          ...this.options.env,
          CLAUDE_CODE_SESSION_ID: this.options.sessionId,
        },
        stdio: ["pipe", "pipe", "pipe"],
      });

      // Handle process events
      this.process.on("error", (error) => {
        this.setState({ status: "error", error: error.message });
        throw new AdapterSpawnError(`Failed to spawn claude: ${error.message}`, "claude-code");
      });

      this.process.on("exit", (code, signal) => {
        this.setState({ status: "terminated", terminatedAt: new Date() });

        this.emit({
          kind: AdapterEventKind.TERMINATED,
          timestamp: new Date(),
          sessionId: this.options.sessionId,
          adapterName: this.options.adapterName,
          exitCode: code || undefined,
          signal: signal || undefined,
        });

        if (code !== 0 && code !== null) {
          throw new AdapterCrashError(
            `Claude process exited with code ${code}`,
            code,
            signal || undefined,
          );
        }
      });

      // Setup STDOUT handler
      if (this.process.stdout) {
        this.process.stdout.on("data", (chunk) => {
          this.responseBuffer += chunk.toString();
          this.processResponseBuffer();
        });
      }

      // Setup STDERR handler
      if (this.process.stderr) {
        this.process.stderr.on("data", (chunk) => {
          const message = chunk.toString();
          this.emit({
            kind: AdapterEventKind.LOG,
            timestamp: new Date(),
            sessionId: this.options.sessionId,
            adapterName: this.options.adapterName,
            level: "error",
            message,
          });
        });
      }

      this.setState({
        status: "ready",
        processId: this.process.pid,
      });

      this.emit({
        kind: AdapterEventKind.SPAWNED,
        timestamp: new Date(),
        sessionId: this.options.sessionId,
        adapterName: this.options.adapterName,
        processId: this.process.pid!,
      });

      this.emit({
        kind: AdapterEventKind.READY,
        timestamp: new Date(),
        sessionId: this.options.sessionId,
        adapterName: this.options.adapterName,
      });
    } catch (error) {
      this.setState({
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async execute(request: ExecuteRequest): Promise<ExecuteResponse> {
    this.validateExecuteRequest(request);

    if (!this.process || !this.process.stdin) {
      throw new AdapterExecutionError("Adapter not spawned", request.action);
    }

    this.setState({ status: "busy" });

    this.emit({
      kind: AdapterEventKind.EXECUTE_START,
      timestamp: new Date(),
      sessionId: this.options.sessionId,
      adapterName: this.options.adapterName,
      action: request.action,
    });

    try {
      const input = JSON.parse(request.inputJson) as ClaudeCodeTask;

      // Send task to Claude Code
      const taskMessage = JSON.stringify({
        type: "task",
        action: request.action,
        prompt: input.prompt,
        context: input.context,
        workingDir: input.workingDir || this.options.workingDir,
      });

      const responsePromise = this.waitForResponse(request.action);
      this.process.stdin.write(taskMessage + "\n");

      const claudeResponse = await responsePromise;

      // Filter shell commands through Shell Guard
      const proposedShell = claudeResponse.shellCommands || [];
      const filteredShell = proposedShell.filter((cmd) => {
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
        success: claudeResponse.success,
      });

      return {
        outputJson: JSON.stringify(claudeResponse),
        proposedShell: filteredShell,
      };
    } catch (error) {
      this.setState({
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });

      this.emit({
        kind: AdapterEventKind.ERROR,
        timestamp: new Date(),
        sessionId: this.options.sessionId,
        adapterName: this.options.adapterName,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw new AdapterExecutionError(
        `Execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        request.action,
      );
    }
  }

  // biome-ignore lint/correctness/useYield: placeholder async generator yields nothing until process.stdout streaming is implemented
  async *streamLogs(): AsyncIterable<string> {
    // In real implementation, would stream from process.stdout
    // For now, just yield empty
    return;
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

    // Execute shell command using Node's child_process
    return new Promise((resolve) => {
      const child = spawn("sh", ["-c", command], {
        cwd: this.options.workingDir,
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      child.stdout?.on("data", (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr?.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      child.on("exit", (code) => {
        this.emit({
          kind: AdapterEventKind.SHELL_EXECUTED,
          timestamp: new Date(),
          sessionId: this.options.sessionId,
          adapterName: this.options.adapterName,
          command,
          exitCode: code || 0,
        });

        resolve({
          allowed: true,
          exitCode: code || 0,
          stdout,
          stderr,
        });
      });
    });
  }

  async terminate(): Promise<void> {
    if (this.process) {
      this.process.kill("SIGTERM");

      // Wait for process to exit
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          if (this.process && !this.process.killed) {
            this.process.kill("SIGKILL");
          }
          resolve();
        }, 5000);

        this.process?.on("exit", () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }

    this.setState({ status: "terminated", terminatedAt: new Date() });
  }

  /**
   * Wait for response from Claude Code process
   */
  private waitForResponse(action: string): Promise<ClaudeCodeResponse> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingResolvers.delete(action);
        reject(new Error(`Response timeout for action: ${action}`));
      }, 60000); // 60 second timeout

      this.pendingResolvers.set(action, {
        resolve: (value) => {
          clearTimeout(timeoutId);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
      });
    });
  }

  /**
   * Process response buffer for complete JSON messages
   */
  private processResponseBuffer(): void {
    const lines = this.responseBuffer.split("\n");
    this.responseBuffer = lines.pop() || "";

    for (const line of lines) {
      if (line.trim()) {
        try {
          const message = JSON.parse(line);

          // Match response to pending action
          // This is simplified - real implementation would need message correlation
          if (message.type === "response" && this.pendingResolvers.size > 0) {
            const [action, resolver] = Array.from(this.pendingResolvers.entries())[0];
            this.pendingResolvers.delete(action);
            resolver.resolve(message.data as ClaudeCodeResponse);
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
  }
}
