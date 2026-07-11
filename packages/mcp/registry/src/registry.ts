/**
 * Tool registry implementation
 */

import { McpClient, McpToolInvocation, McpToolResult, McpToolSpec } from "@airiscode/mcp-client";
import type { RegistryConfig, ToolInvocationRecord, ToolMatch, ToolSearchQuery } from "./types.js";

/**
 * Tool registry for managing MCP tools
 *
 * Features:
 * - Lazy loading of tool specs
 * - Caching and preloading
 * - Tool search and matching
 * - Invocation history tracking
 */
export class ToolRegistry {
  private config: Required<RegistryConfig>;
  private availableTools: string[] = [];
  private toolSpecs: Map<string, McpToolSpec> = new Map();
  private invocationHistory: ToolInvocationRecord[] = [];

  constructor(
    private mcpClient: McpClient,
    config: RegistryConfig = {},
  ) {
    this.config = {
      lazyLoading: config.lazyLoading !== false,
      preloadTools: config.preloadTools || [],
      selectionStrategy: config.selectionStrategy || "best-match",
    };
  }

  /**
   * Initialize registry - fetch available tools list
   */
  async initialize(): Promise<void> {
    const response = await this.mcpClient.listTools();
    this.availableTools = response.tools.map((t) => t.name);

    // Preload specified tools
    if (this.config.preloadTools.length > 0) {
      await Promise.all(this.config.preloadTools.map((name) => this.resolveToolSpec(name)));
    }
  }

  /**
   * Get list of available tool names
   */
  getAvailableTools(): string[] {
    return [...this.availableTools];
  }

  /**
   * Check if a tool is available
   */
  hasTool(name: string): boolean {
    return this.availableTools.includes(name);
  }

  /**
   * Resolve tool specification (with caching)
   */
  async resolveToolSpec(name: string): Promise<McpToolSpec> {
    // Check local cache first
    if (this.toolSpecs.has(name)) {
      return this.toolSpecs.get(name)!;
    }

    // Fetch from MCP client (which has its own cache)
    const spec = await this.mcpClient.getToolSpec(name);

    // Store in local cache
    this.toolSpecs.set(name, spec);

    return spec;
  }

  /**
   * Search for tools matching query
   */
  async searchTools(query: ToolSearchQuery): Promise<ToolMatch[]> {
    const matches: ToolMatch[] = [];

    for (const toolName of this.availableTools) {
      // Filter by server if specified
      const spec = await this.resolveToolSpec(toolName);

      if (query.server && spec.server !== query.server) {
        continue;
      }

      // Calculate match score
      const score = this.calculateMatchScore(spec, query);

      if (query.minScore && score < query.minScore) {
        continue;
      }

      matches.push({
        tool: spec,
        score,
        reason: this.generateMatchReason(spec, query),
      });
    }

    // Sort by score (descending)
    matches.sort((a, b) => b.score - a.score);

    return matches;
  }

  /**
   * Invoke a tool and track history
   */
  async invokeTool(invocation: McpToolInvocation): Promise<McpToolResult> {
    const startTime = Date.now();

    try {
      const result = await this.mcpClient.invokeTool(invocation);

      // Record successful invocation
      this.invocationHistory.push({
        toolName: invocation.name,
        arguments: invocation.arguments,
        result: result.data,
        success: result.success,
        executionTime: result.executionTime || Date.now() - startTime,
        timestamp: new Date(),
      });

      return result;
    } catch (error) {
      // Record failed invocation
      this.invocationHistory.push({
        toolName: invocation.name,
        arguments: invocation.arguments,
        result: error,
        success: false,
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
      });

      throw error;
    }
  }

  /**
   * Get invocation history
   */
  getInvocationHistory(toolName?: string): ToolInvocationRecord[] {
    if (toolName) {
      return this.invocationHistory.filter((r) => r.toolName === toolName);
    }
    return [...this.invocationHistory];
  }

  /**
   * Clear invocation history
   */
  clearHistory(): void {
    this.invocationHistory = [];
  }

  /**
   * Get tool usage statistics
   */
  getToolStats(toolName: string): {
    invocations: number;
    successes: number;
    failures: number;
    avgExecutionTime: number;
  } {
    const records = this.getInvocationHistory(toolName);

    if (records.length === 0) {
      return { invocations: 0, successes: 0, failures: 0, avgExecutionTime: 0 };
    }

    const successes = records.filter((r) => r.success).length;
    const avgExecutionTime = records.reduce((sum, r) => sum + r.executionTime, 0) / records.length;

    return {
      invocations: records.length,
      successes,
      failures: records.length - successes,
      avgExecutionTime,
    };
  }

  /**
   * Reload available tools
   */
  async reload(): Promise<void> {
    this.availableTools = [];
    this.toolSpecs.clear();
    await this.initialize();
  }

  /**
   * Calculate match score for a tool
   */
  private calculateMatchScore(spec: McpToolSpec, query: ToolSearchQuery): number {
    if (!query.keywords || query.keywords.length === 0) {
      return 1.0; // All tools match if no keywords
    }

    let score = 0;
    const text = `${spec.name} ${spec.description}`.toLowerCase();

    for (const keyword of query.keywords) {
      const lowerKeyword = keyword.toLowerCase();

      // Exact name match
      if (spec.name.toLowerCase() === lowerKeyword) {
        score += 1.0;
      }
      // Name contains keyword
      else if (spec.name.toLowerCase().includes(lowerKeyword)) {
        score += 0.7;
      }
      // Description contains keyword
      else if (spec.description.toLowerCase().includes(lowerKeyword)) {
        score += 0.5;
      }
      // Fuzzy match
      else if (text.includes(lowerKeyword)) {
        score += 0.3;
      }
    }

    // Normalize by keyword count
    return Math.min(score / query.keywords.length, 1.0);
  }

  /**
   * Generate match reason
   */
  private generateMatchReason(spec: McpToolSpec, query: ToolSearchQuery): string {
    const reasons: string[] = [];

    if (query.keywords) {
      for (const keyword of query.keywords) {
        const lowerKeyword = keyword.toLowerCase();

        if (spec.name.toLowerCase().includes(lowerKeyword)) {
          reasons.push(`name contains "${keyword}"`);
        } else if (spec.description.toLowerCase().includes(lowerKeyword)) {
          reasons.push(`description contains "${keyword}"`);
        }
      }
    }

    if (query.server && spec.server === query.server) {
      reasons.push(`from server "${query.server}"`);
    }

    return reasons.length > 0 ? reasons.join(", ") : "default match";
  }
}
