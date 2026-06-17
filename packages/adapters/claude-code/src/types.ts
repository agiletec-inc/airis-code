/**
 * Claude Code specific types
 */

/**
 * Claude Code message types
 */
export type ClaudeCodeMessageType =
  | "task"
  | "response"
  | "tool_use"
  | "tool_result"
  | "error"
  | "status";

/**
 * Claude Code message
 */
export interface ClaudeCodeMessage {
  type: ClaudeCodeMessageType;
  content?: string;
  data?: unknown;
}

/**
 * Claude Code task request
 */
export interface ClaudeCodeTask {
  prompt: string;
  context?: string[];
  workingDir?: string;
}

/**
 * Claude Code response
 */
export interface ClaudeCodeResponse {
  success: boolean;
  message?: string;
  diff?: string;
  shellCommands?: string[];
  error?: string;
}

/**
 * Claude Code status
 */
export interface ClaudeCodeStatus {
  status: "idle" | "thinking" | "working" | "done" | "error";
  currentTask?: string;
  progress?: number;
}
