/**
 * CLI types
 */

import type { PolicyProfile } from '@airiscode/policies';

/**
 * CLI configuration
 */
export interface CLIConfig {
  /** Default driver */
  defaultDriver: string;
  /** Default adapter */
  defaultAdapter: string;
  /** Default policy profile */
  defaultPolicy: PolicyProfile;
  /** MCP Gateway URL */
  mcpGatewayUrl?: string;
  /** Session storage directory */
  sessionDir: string;
  /** Enable telemetry */
  telemetry: boolean;
}

/**
 * Session info
 */
export interface SessionInfo {
  /** Session ID */
  id: string;
  /** Session name */
  name?: string;
  /** Working directory */
  workingDir: string;
  /** Driver used */
  driver: string;
  /** Adapter used */
  adapter: string;
  /** Policy profile */
  policy: PolicyProfile;
  /** Created timestamp */
  createdAt: Date;
  /** Last active timestamp */
  lastActiveAt: Date;
  /** Session status */
  status: 'active' | 'paused' | 'completed' | 'failed';
  /** Task count */
  taskCount: number;
}

/**
 * Task log entry
 */
export interface TaskLogEntry {
  /** Timestamp */
  timestamp: Date;
  /** Log level */
  level: 'info' | 'warn' | 'error' | 'debug';
  /** Source */
  source: 'driver' | 'adapter' | 'runner' | 'system';
  /** Message */
  message: string;
  /** Additional data */
  data?: Record<string, unknown>;
}

/**
 * Code command options
 */
export interface CodeCommandOptions {
  /** Driver to use */
  driver?: string;
  /** Adapter to use */
  adapter?: string;
  /** Policy profile */
  policy?: 'restricted' | 'sandboxed' | 'untrusted';
  /** Working directory */
  cwd?: string;
  /** Session name */
  session?: string;
  /** JSON output mode */
  json?: boolean;
  /** Verbose output */
  verbose?: boolean;
}

/**
 * Config command options
 */
export interface ConfigCommandOptions {
  /** Get config value */
  get?: string;
  /** Set config value */
  set?: string;
  /** List all config */
  list?: boolean;
  /** Reset to defaults */
  reset?: boolean;
}

/**
 * Session command options
 */
export interface SessionCommandOptions {
  /** List sessions */
  list?: boolean;
  /** Show session details */
  show?: string;
  /** Resume session */
  resume?: string;
  /** Delete session */
  delete?: string;
  /** Clean old sessions */
  clean?: boolean;
}
