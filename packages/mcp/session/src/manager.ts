/**
 * MCP Session Manager
 * Responsibility: Manage MCP connection lifecycle and state
 */

import {
  MCPGatewayClient,
  type GatewayConfig,
  type ToolDescription,
} from '@airiscode/mcp-gateway-client';
import { LazyMCPLoader } from '@airiscode/mcp-lazy-loader';

export interface SessionConfig extends GatewayConfig {
  sessionId: string;
  autoConnect?: boolean;
}

export interface SessionState {
  connected: boolean;
  sessionId: string;
  alwaysOnTools: ToolDescription[];
  lazyTools: Map<string, ToolDescription[]>;
  startedAt?: Date;
}

export class MCPSessionManager {
  private client: MCPGatewayClient;
  private loader: LazyMCPLoader;
  private state: SessionState;
  private config: SessionConfig;

  constructor(config: SessionConfig) {
    this.config = config;
    this.client = new MCPGatewayClient(config);
    this.loader = new LazyMCPLoader({
      client: this.client,
      onToolsAdded: (serverName, tools) => {
        this.state.lazyTools.set(serverName, tools);
      },
    });

    this.state = {
      connected: false,
      sessionId: config.sessionId,
      alwaysOnTools: [],
      lazyTools: new Map(),
    };
  }

  /**
   * Initialize session and load always-on tools
   */
  async initialize(): Promise<void> {
    try {
      // Load always-on server tools
      this.state.alwaysOnTools = await this.client.getAlwaysOnTools();
      this.state.connected = true;
      this.state.startedAt = new Date();
    } catch (error) {
      throw new Error(
        `Failed to initialize MCP session: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Enable a lazy server on-demand
   */
  async enableLazyServer(
    serverName: string,
    env?: Record<string, string>
  ): Promise<ToolDescription[]> {
    if (!this.state.connected) {
      throw new Error('Session not initialized');
    }

    return await this.loader.enableServer(serverName, env);
  }

  /**
   * Disable a lazy server
   */
  async disableLazyServer(serverName: string): Promise<void> {
    await this.loader.disableServer(serverName);
    this.state.lazyTools.delete(serverName);
  }

  /**
   * Get all available tools (always-on + enabled lazy)
   */
  getAllTools(): ToolDescription[] {
    const lazyTools = Array.from(this.state.lazyTools.values()).flat();
    return [...this.state.alwaysOnTools, ...lazyTools];
  }

  /**
   * Get current session state
   */
  getState(): Readonly<SessionState> {
    return this.state;
  }

  /**
   * Invoke a tool
   */
  async invokeTool(
    serverName: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    if (!this.state.connected) {
      throw new Error('Session not initialized');
    }

    return await this.client.invokeTool(serverName, toolName, args);
  }

  /**
   * Clean up session
   */
  async cleanup(): Promise<void> {
    // Disable all lazy servers
    const enabledServers = this.loader.getEnabledServers();
    await Promise.all(
      enabledServers.map((server) => this.loader.disableServer(server))
    );

    this.state.connected = false;
    this.state.lazyTools.clear();
  }

  /**
   * Check if session is connected
   */
  isConnected(): boolean {
    return this.state.connected;
  }
}
