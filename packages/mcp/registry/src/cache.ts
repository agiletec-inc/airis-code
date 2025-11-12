/**
 * Tool Description Cache
 * Responsibility: Cache tool descriptions to minimize Gateway API calls
 */

import type { ToolDescription } from '@airiscode/mcp-gateway-client';

export class ToolDescriptionCache {
  private cache = new Map<string, ToolDescription[]>();
  private ttl: number;
  private timestamps = new Map<string, number>();

  constructor(ttlMs: number = 5 * 60 * 1000) {
    // Default 5 min TTL
    this.ttl = ttlMs;
  }

  set(serverName: string, tools: ToolDescription[]): void {
    this.cache.set(serverName, tools);
    this.timestamps.set(serverName, Date.now());
  }

  get(serverName: string): ToolDescription[] | null {
    const tools = this.cache.get(serverName);
    const timestamp = this.timestamps.get(serverName);

    if (!tools || !timestamp) {
      return null;
    }

    // Check TTL
    if (Date.now() - timestamp > this.ttl) {
      this.cache.delete(serverName);
      this.timestamps.delete(serverName);
      return null;
    }

    return tools;
  }

  clear(serverName?: string): void {
    if (serverName) {
      this.cache.delete(serverName);
      this.timestamps.delete(serverName);
    } else {
      this.cache.clear();
      this.timestamps.clear();
    }
  }

  getAllCached(): Map<string, ToolDescription[]> {
    return new Map(this.cache);
  }
}
