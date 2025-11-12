/**
 * AIRIS MCP Gateway Client
 * Responsibility: HTTP/SSE communication with Gateway API
 */

import { request } from 'undici';
import type {
  GatewayConfig,
  GatewayStatus,
  EnableServerRequest,
  EnableServerResponse,
  ToolDescription,
} from './types.js';

export class MCPGatewayClient {
  private baseURL: string;
  private apiKey?: string;
  private timeout: number;

  constructor(config: GatewayConfig) {
    this.baseURL = config.baseURL;
    this.apiKey = config.apiKey;
    this.timeout = config.timeout || 30000;
  }

  /**
   * Get Gateway status and available servers
   */
  async getStatus(): Promise<GatewayStatus> {
    const response = await request(`${this.baseURL}/api/v1/status`, {
      method: 'GET',
      headers: this.getHeaders(),
      headersTimeout: this.timeout,
    });

    if (response.statusCode !== 200) {
      throw new Error(`Gateway status failed: ${response.statusCode}`);
    }

    return await response.body.json() as GatewayStatus;
  }

  /**
   * Get tool descriptions for always-on servers
   */
  async getAlwaysOnTools(): Promise<ToolDescription[]> {
    const status = await this.getStatus();
    return status.servers
      .filter(s => status.alwaysOn.includes(s.name) && s.enabled)
      .flatMap(s => s.tools);
  }

  /**
   * Enable a lazy server on-demand
   */
  async enableServer(
    req: EnableServerRequest
  ): Promise<EnableServerResponse> {
    const response = await request(`${this.baseURL}/api/v1/servers/enable`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req),
      headersTimeout: this.timeout,
    });

    if (response.statusCode !== 200) {
      throw new Error(
        `Enable server ${req.serverName} failed: ${response.statusCode}`
      );
    }

    return await response.body.json() as EnableServerResponse;
  }

  /**
   * Disable a lazy server
   */
  async disableServer(serverName: string): Promise<void> {
    const response = await request(
      `${this.baseURL}/api/v1/servers/${serverName}/disable`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        headersTimeout: this.timeout,
      }
    );

    if (response.statusCode !== 200) {
      throw new Error(`Disable server ${serverName} failed: ${response.statusCode}`);
    }
  }

  /**
   * Invoke MCP tool
   */
  async invokeTool(
    serverName: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    const response = await request(`${this.baseURL}/api/v1/mcp/invoke`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        server: serverName,
        tool: toolName,
        arguments: args,
      }),
      headersTimeout: this.timeout,
    });

    if (response.statusCode !== 200) {
      throw new Error(
        `Tool invocation ${serverName}:${toolName} failed: ${response.statusCode}`
      );
    }

    return await response.body.json();
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': 'AIRIS-Code/0.1.0',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }
}
