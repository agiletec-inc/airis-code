/**
 * MCP protocol types
 */

/**
 * MCP tool metadata (lazy-loaded)
 */
export interface McpToolMeta {
  /** Tool name */
  name: string;
  /** Brief description (optional, loaded lazily) */
  description?: string;
  /** Server providing this tool */
  server?: string;
}

/**
 * Full MCP tool specification
 */
export interface McpToolSpec {
  /** Tool name */
  name: string;
  /** Detailed description */
  description: string;
  /** JSON Schema for parameters */
  inputSchema: Record<string, unknown>;
  /** JSON Schema for output (optional) */
  outputSchema?: Record<string, unknown>;
  /** Server providing this tool */
  server?: string;
}

/**
 * MCP tool invocation request
 */
export interface McpToolInvocation {
  /** Tool name */
  name: string;
  /** Tool arguments */
  arguments: Record<string, unknown>;
}

/**
 * MCP tool invocation result
 */
export interface McpToolResult {
  /** Whether invocation succeeded */
  success: boolean;
  /** Result data */
  data?: unknown;
  /** Error message (if failed) */
  error?: string;
  /** Execution time (ms) */
  executionTime?: number;
}

/**
 * MCP server information
 */
export interface McpServerInfo {
  /** Server name */
  name: string;
  /** Server version */
  version: string;
  /** Available tools count */
  toolCount: number;
  /** Server status */
  status: "online" | "offline" | "error";
}

/**
 * MCP client configuration
 */
export interface McpClientConfig {
  /** Gateway base URL */
  gatewayUrl?: string;
  /** Request timeout (ms) */
  timeout?: number;
  /** API key (if required) */
  apiKey?: string;
  /** Additional headers */
  headers?: Record<string, string>;
  /** Enable caching */
  enableCache?: boolean;
  /** Cache TTL (ms) */
  cacheTTL?: number;
}

/**
 * MCP list tools response
 */
export interface McpListToolsResponse {
  /** Available tools */
  tools: McpToolMeta[];
  /** Total count */
  total: number;
  /** Available servers */
  servers?: string[];
}

/**
 * MCP server list response
 */
export interface McpListServersResponse {
  /** Available servers */
  servers: McpServerInfo[];
  /** Total count */
  total: number;
}
