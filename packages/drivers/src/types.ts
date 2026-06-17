/**
 * Type definitions for model drivers
 */

import { PolicyProfile } from "@airiscode/policies";

/**
 * Tool specification following JSON Schema format
 */
export interface ToolSpec {
  /** Tool name */
  name: string;
  /** Human-readable description */
  description: string;
  /** JSON Schema for tool parameters */
  parameters: Record<string, unknown>;
}

/**
 * Chat message role
 */
export type MessageRole = "system" | "user" | "assistant" | "tool";

/**
 * Individual chat message
 */
export interface ChatMessage {
  /** Message role */
  role: MessageRole;
  /** Message content */
  content: string;
  /** Tool name (for tool role) */
  toolName?: string;
  /** Tool call ID (for tool responses) */
  toolCallId?: string;
}

/**
 * Tool call from LLM
 */
export interface ToolCall {
  /** Unique identifier for this tool call */
  id: string;
  /** Name of the tool to invoke */
  name: string;
  /** Arguments as JSON object */
  arguments: Record<string, unknown>;
}

/**
 * Request to chat with the model
 */
export interface ChatRequest {
  /** Session identifier */
  sessionId: string;
  /** Conversation messages */
  messages: ChatMessage[];
  /** Available tools (optional) */
  tools?: ToolSpec[];
  /** Policy profile for this request */
  policy: PolicyProfile;
  /** Model-specific hints */
  modelHints?: Record<string, string>;
  /** Temperature (0.0-2.0) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Stop sequences */
  stop?: string[];
}

/**
 * Token usage statistics
 */
export interface TokenUsage {
  /** Tokens in the prompt */
  promptTokens: number;
  /** Tokens in the completion */
  completionTokens: number;
  /** Total tokens used */
  totalTokens: number;
}

/**
 * Response from chat
 */
export interface ChatResponse {
  /** Generated text */
  text: string;
  /** Tool calls requested by the model */
  toolCalls?: ToolCall[];
  /** Whether generation was incomplete (hit token limit) */
  incomplete: boolean;
  /** Token usage statistics */
  usage?: TokenUsage;
  /** Finish reason */
  finishReason?: "stop" | "length" | "tool_calls" | "content_filter";
}

/**
 * Streaming chunk from chat
 */
export interface StreamChunk {
  /** Partial text delta */
  delta?: string;
  /** Partial tool call delta */
  toolCallDelta?: Partial<ToolCall>;
  /** Whether this is the final chunk */
  done: boolean;
  /** Final response (only in last chunk) */
  response?: ChatResponse;
}

/**
 * Model capabilities
 */
export interface Capabilities {
  /** Available model identifiers */
  models: string[];
  /** Supports tool/function calling */
  supportsTools: boolean;
  /** Supports streaming responses */
  supportsStream: boolean;
  /** Maximum context window size */
  maxContextTokens?: number;
  /** API version */
  apiVersion: string;
}

/**
 * Driver configuration
 */
export interface DriverConfig {
  /** Base URL for API */
  baseUrl?: string;
  /** API key */
  apiKey?: string;
  /** Default model */
  defaultModel?: string;
  /** Request timeout (ms) */
  timeout?: number;
  /** Additional headers */
  headers?: Record<string, string>;
}
