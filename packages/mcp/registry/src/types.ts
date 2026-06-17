/**
 * Tool registry types
 */

import type { McpToolSpec } from "@airiscode/mcp-client";

/**
 * Registry configuration
 */
export interface RegistryConfig {
  /** Enable lazy loading */
  lazyLoading?: boolean;
  /** Preload popular tools */
  preloadTools?: string[];
  /** Tool selection strategy */
  selectionStrategy?: "first-match" | "best-match" | "all";
}

/**
 * Tool match score
 */
export interface ToolMatch {
  /** Tool spec */
  tool: McpToolSpec;
  /** Match score (0-1) */
  score: number;
  /** Match reason */
  reason?: string;
}

/**
 * Tool search query
 */
export interface ToolSearchQuery {
  /** Search keywords */
  keywords?: string[];
  /** Filter by server */
  server?: string;
  /** Filter by category */
  category?: string;
  /** Minimum match score */
  minScore?: number;
}

/**
 * Tool invocation history
 */
export interface ToolInvocationRecord {
  /** Tool name */
  toolName: string;
  /** Arguments used */
  arguments: Record<string, unknown>;
  /** Result */
  result: unknown;
  /** Success flag */
  success: boolean;
  /** Execution time (ms) */
  executionTime: number;
  /** Timestamp */
  timestamp: Date;
}
