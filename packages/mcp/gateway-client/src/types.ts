/**
 * AIRIS MCP Gateway API types
 * Based on airis-mcp-gateway/mcp-config.json
 */

export interface GatewayConfig {
  baseURL: string;
  apiKey?: string;
  timeout?: number;
}

export interface MCPServerConfig {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  enabled: boolean;
}

export interface ToolDescription {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ServerInfo {
  name: string;
  enabled: boolean;
  tools: ToolDescription[];
}

export interface GatewayStatus {
  version: string;
  servers: ServerInfo[];
  alwaysOn: string[];
  lazy: string[];
}

export interface EnableServerRequest {
  serverName: string;
  env?: Record<string, string>;
}

export interface EnableServerResponse {
  serverName: string;
  enabled: boolean;
  tools: ToolDescription[];
}
