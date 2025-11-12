/**
 * Lazy MCP Server Loader
 * Responsibility: On-demand server enabling and tool description loading
 */

import { MCPGatewayClient, type ToolDescription } from '@airiscode/mcp-gateway-client';

export interface LoaderConfig {
  client: MCPGatewayClient;
  onToolsAdded?: (serverName: string, tools: ToolDescription[]) => void;
}

export class LazyMCPLoader {
  private client: MCPGatewayClient;
  private enabledServers = new Set<string>();
  private onToolsAdded?: (serverName: string, tools: ToolDescription[]) => void;

  constructor(config: LoaderConfig) {
    this.client = config.client;
    this.onToolsAdded = config.onToolsAdded;
  }

  /**
   * Enable a lazy server and get its tool descriptions
   */
  async enableServer(
    serverName: string,
    env?: Record<string, string>
  ): Promise<ToolDescription[]> {
    if (this.enabledServers.has(serverName)) {
      // Already enabled, skip
      return [];
    }

    const response = await this.client.enableServer({
      serverName,
      env,
    });

    if (response.enabled) {
      this.enabledServers.add(serverName);

      if (this.onToolsAdded) {
        this.onToolsAdded(serverName, response.tools);
      }

      return response.tools;
    }

    return [];
  }

  /**
   * Disable a lazy server
   */
  async disableServer(serverName: string): Promise<void> {
    if (!this.enabledServers.has(serverName)) {
      return;
    }

    await this.client.disableServer(serverName);
    this.enabledServers.delete(serverName);
  }

  /**
   * Check if a server is currently enabled
   */
  isEnabled(serverName: string): boolean {
    return this.enabledServers.has(serverName);
  }

  /**
   * Get list of enabled servers
   */
  getEnabledServers(): string[] {
    return Array.from(this.enabledServers);
  }
}
