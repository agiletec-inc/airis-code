/**
 * MCP client implementation
 */

import {
  McpConnectionError,
  McpInvocationError,
  McpServerError,
  McpTimeoutError,
  McpToolNotFoundError,
} from "./errors.js";
import type {
  McpClientConfig,
  McpListServersResponse,
  McpListToolsResponse,
  McpServerInfo,
  McpToolInvocation,
  McpToolMeta,
  McpToolResult,
  McpToolSpec,
} from "./types.js";

/**
 * MCP client for communicating with AIRIS MCP Gateway
 *
 * Features:
 * - Lazy tool discovery
 * - Tool spec caching
 * - HTTP/SSE support
 * - Timeout handling
 */
export class McpClient {
  private config: Required<McpClientConfig>;
  private toolSpecCache: Map<string, McpToolSpec> = new Map();
  private cacheTimestamps: Map<string, number> = new Map();

  constructor(config: McpClientConfig = {}) {
    this.config = {
      gatewayUrl: config.gatewayUrl || "http://localhost:3000",
      timeout: config.timeout || 30000,
      apiKey: config.apiKey || "",
      headers: config.headers || {},
      enableCache: config.enableCache !== false,
      cacheTTL: config.cacheTTL || 300000, // 5 minutes
    };
  }

  /**
   * List available tools (metadata only, lazy loading)
   */
  async listTools(server?: string): Promise<McpListToolsResponse> {
    const url = new URL("/mcp/tools", this.config.gatewayUrl);
    if (server) {
      url.searchParams.set("server", server);
    }

    try {
      const response = await this.fetch(url.toString());
      const data = await response.json();

      return {
        tools: data.tools || [],
        total: data.total || data.tools?.length || 0,
        servers: data.servers || [],
      };
    } catch (error) {
      throw new McpConnectionError(
        `Failed to list tools: ${error instanceof Error ? error.message : "Unknown error"}`,
        url.toString(),
      );
    }
  }

  /**
   * Get full tool specification (with schema)
   *
   * Uses cache if enabled and valid
   */
  async getToolSpec(name: string): Promise<McpToolSpec> {
    // Check cache
    if (this.config.enableCache) {
      const cached = this.toolSpecCache.get(name);
      const timestamp = this.cacheTimestamps.get(name);

      if (cached && timestamp && Date.now() - timestamp < this.config.cacheTTL) {
        return cached;
      }
    }

    const url = `${this.config.gatewayUrl}/mcp/tools/${encodeURIComponent(name)}`;

    try {
      const response = await this.fetch(url);
      const spec = (await response.json()) as McpToolSpec;

      // Cache the spec
      if (this.config.enableCache) {
        this.toolSpecCache.set(name, spec);
        this.cacheTimestamps.set(name, Date.now());
      }

      return spec;
    } catch (error) {
      if (error instanceof McpServerError && error.statusCode === 404) {
        throw new McpToolNotFoundError(name);
      }
      throw new McpConnectionError(
        `Failed to get tool spec: ${error instanceof Error ? error.message : "Unknown error"}`,
        url,
      );
    }
  }

  /**
   * Invoke a tool
   */
  async invokeTool(invocation: McpToolInvocation): Promise<McpToolResult> {
    const url = `${this.config.gatewayUrl}/mcp/tools/${encodeURIComponent(invocation.name)}/invoke`;

    const startTime = Date.now();

    try {
      const response = await this.fetch(url, {
        method: "POST",
        body: JSON.stringify(invocation.arguments),
      });

      const result = await response.json();
      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data: result.data || result,
        executionTime,
      };
    } catch (error) {

      if (error instanceof McpServerError && error.statusCode === 404) {
        throw new McpToolNotFoundError(invocation.name);
      }

      throw new McpInvocationError(
        `Tool invocation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        invocation.name,
        error,
      );
    }
  }

  /**
   * List available MCP servers
   */
  async listServers(): Promise<McpListServersResponse> {
    const url = `${this.config.gatewayUrl}/mcp/servers`;

    try {
      const response = await this.fetch(url);
      const data = await response.json();

      return {
        servers: data.servers || [],
        total: data.total || data.servers?.length || 0,
      };
    } catch (error) {
      throw new McpConnectionError(
        `Failed to list servers: ${error instanceof Error ? error.message : "Unknown error"}`,
        url,
      );
    }
  }

  /**
   * Get server information
   */
  async getServerInfo(serverName: string): Promise<McpServerInfo> {
    const url = `${this.config.gatewayUrl}/mcp/servers/${encodeURIComponent(serverName)}`;

    try {
      const response = await this.fetch(url);
      return (await response.json()) as McpServerInfo;
    } catch (error) {
      throw new McpConnectionError(
        `Failed to get server info: ${error instanceof Error ? error.message : "Unknown error"}`,
        url,
      );
    }
  }

  /**
   * Clear tool spec cache
   */
  clearCache(): void {
    this.toolSpecCache.clear();
    this.cacheTimestamps.clear();
  }

  /**
   * Update client configuration
   */
  updateConfig(config: Partial<McpClientConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<McpClientConfig> {
    return { ...this.config };
  }

  /**
   * Fetch wrapper with timeout and error handling
   */
  private async fetch(
    url: string,
    options?: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
    },
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...this.config.headers,
        ...options?.headers,
      };

      if (this.config.apiKey) {
        headers["Authorization"] = `Bearer ${this.config.apiKey}`;
      }

      const response = await fetch(url, {
        method: options?.method || "GET",
        headers,
        body: options?.body,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new McpServerError(
          `HTTP ${response.status}: ${response.statusText}`,
          undefined,
          response.status,
        );
      }

      return response;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new McpTimeoutError(`Request timed out after ${this.config.timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
