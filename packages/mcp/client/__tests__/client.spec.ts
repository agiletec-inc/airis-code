import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { McpClient } from "../src/client.js";
import {
  McpConnectionError,
  McpInvocationError,
  McpTimeoutError,
  McpToolNotFoundError,
} from "../src/errors.js";

// Mock fetch globally
global.fetch = vi.fn();

describe("@airiscode/mcp-client - McpClient", () => {
  let client: McpClient;

  beforeEach(() => {
    client = new McpClient({
      gatewayUrl: "http://localhost:3000",
      timeout: 5000,
      enableCache: true,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("listTools", () => {
    it("should list available tools", async () => {
      const mockResponse = {
        tools: [
          { name: "mindbase_search", description: "Search MindBase" },
          { name: "mindbase_store", description: "Store in MindBase" },
          { name: "supabase_query", description: "Query Supabase" },
        ],
        total: 3,
        servers: ["mindbase", "supabase"],
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await client.listTools();

      expect(result.tools).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.servers).toContain("mindbase");
      expect(result.servers).toContain("supabase");
    });

    it("should filter by server", async () => {
      const mockResponse = {
        tools: [
          { name: "mindbase_search", description: "Search MindBase" },
          { name: "mindbase_store", description: "Store in MindBase" },
        ],
        total: 2,
        servers: ["mindbase"],
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await client.listTools("mindbase");

      expect(result.tools).toHaveLength(2);
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:3000/mcp/tools?server=mindbase",
        expect.any(Object),
      );
    });

    it("should handle connection errors", async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

      await expect(client.listTools()).rejects.toThrow(McpConnectionError);
    });
  });

  describe("getToolSpec", () => {
    it("should fetch tool specification", async () => {
      const mockSpec = {
        name: "mindbase_search",
        description: "Search MindBase for relevant information",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string" },
            limit: { type: "number" },
          },
        },
        server: "mindbase",
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSpec,
      } as Response);

      const spec = await client.getToolSpec("mindbase_search");

      expect(spec.name).toBe("mindbase_search");
      expect(spec.description).toBeDefined();
      expect(spec.inputSchema).toBeDefined();
      expect(spec.server).toBe("mindbase");
    });

    it("should cache tool specs", async () => {
      const mockSpec = {
        name: "test_tool",
        description: "Test tool",
        inputSchema: {},
        server: "test",
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSpec,
      } as Response);

      // First call - should fetch
      await client.getToolSpec("test_tool");
      expect(fetch).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      await client.getToolSpec("test_tool");
      expect(fetch).toHaveBeenCalledTimes(1); // No additional fetch
    });

    it("should bypass cache after TTL expires", async () => {
      const shortTTLClient = new McpClient({
        gatewayUrl: "http://localhost:3000",
        cacheTTL: 10, // 10ms
      });

      const mockSpec = {
        name: "test_tool",
        description: "Test tool",
        inputSchema: {},
        server: "test",
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockSpec,
      } as Response);

      // First call
      await shortTTLClient.getToolSpec("test_tool");
      expect(fetch).toHaveBeenCalledTimes(1);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 15));

      // Second call - cache expired, should fetch again
      await shortTTLClient.getToolSpec("test_tool");
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it("should throw McpToolNotFoundError for 404", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      } as Response);

      await expect(client.getToolSpec("non_existent_tool")).rejects.toThrow(McpToolNotFoundError);
    });
  });

  describe("invokeTool", () => {
    it("should invoke a tool successfully", async () => {
      const mockResult = {
        data: {
          results: [
            { content: "Result 1", score: 0.95 },
            { content: "Result 2", score: 0.87 },
          ],
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      } as Response);

      const result = await client.invokeTool({
        name: "mindbase_search",
        arguments: { query: "test query", limit: 5 },
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult.data);
      expect(result.executionTime).toBeDefined();
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it("should send correct POST request", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} }),
      } as Response);

      await client.invokeTool({
        name: "test_tool",
        arguments: { key: "value" },
      });

      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:3000/mcp/tools/test_tool/invoke",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ key: "value" }),
        }),
      );
    });

    it("should handle invocation errors", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      } as Response);

      await expect(
        client.invokeTool({
          name: "failing_tool",
          arguments: {},
        }),
      ).rejects.toThrow(McpInvocationError);
    });

    it("should throw McpToolNotFoundError for 404", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      } as Response);

      await expect(
        client.invokeTool({
          name: "non_existent_tool",
          arguments: {},
        }),
      ).rejects.toThrow(McpToolNotFoundError);
    });
  });

  describe("listServers", () => {
    it("should list available servers", async () => {
      const mockResponse = {
        servers: [
          {
            name: "mindbase",
            version: "1.0.0",
            toolCount: 5,
            status: "online",
          },
          {
            name: "supabase",
            version: "2.0.0",
            toolCount: 10,
            status: "online",
          },
        ],
        total: 2,
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await client.listServers();

      expect(result.servers).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.servers[0].name).toBe("mindbase");
    });
  });

  describe("getServerInfo", () => {
    it("should get server information", async () => {
      const mockInfo = {
        name: "mindbase",
        version: "1.0.0",
        toolCount: 5,
        status: "online" as const,
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockInfo,
      } as Response);

      const info = await client.getServerInfo("mindbase");

      expect(info.name).toBe("mindbase");
      expect(info.status).toBe("online");
      expect(info.toolCount).toBe(5);
    });
  });

  describe("cache management", () => {
    it("should clear cache", async () => {
      const mockSpec = {
        name: "test_tool",
        description: "Test",
        inputSchema: {},
        server: "test",
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockSpec,
      } as Response);

      // Fetch and cache
      await client.getToolSpec("test_tool");
      expect(fetch).toHaveBeenCalledTimes(1);

      // Clear cache
      client.clearCache();

      // Should fetch again
      await client.getToolSpec("test_tool");
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("configuration", () => {
    it("should use custom gateway URL", async () => {
      const customClient = new McpClient({
        gatewayUrl: "http://custom-gateway:8080",
      });

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tools: [], total: 0 }),
      } as Response);

      await customClient.listTools();

      expect(fetch).toHaveBeenCalledWith(
        "http://custom-gateway:8080/mcp/tools",
        expect.any(Object),
      );
    });

    it("should include API key in headers", async () => {
      const authClient = new McpClient({
        gatewayUrl: "http://localhost:3000",
        apiKey: "test-api-key",
      });

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tools: [], total: 0 }),
      } as Response);

      await authClient.listTools();

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const headers = fetchCall[1]?.headers as Record<string, string>;
      expect(headers["Authorization"]).toBe("Bearer test-api-key");
    });

    it("should update configuration", () => {
      client.updateConfig({ timeout: 10000 });
      const config = client.getConfig();
      expect(config.timeout).toBe(10000);
    });
  });

  describe("timeout handling", () => {
    it("should timeout on slow requests", async () => {
      const slowClient = new McpClient({ timeout: 100 });

      vi.mocked(fetch).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({}),
                } as Response),
              200,
            );
          }),
      );

      await expect(slowClient.listTools()).rejects.toThrow(McpTimeoutError);
    });
  });
});
