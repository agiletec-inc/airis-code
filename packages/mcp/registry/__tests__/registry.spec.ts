import { McpClient } from "@airiscode/mcp-client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToolRegistry } from "../src/registry.js";

// Mock MCP Client
vi.mock("@airiscode/mcp-client", () => ({
  McpClient: vi.fn(() => ({
    listTools: vi.fn(),
    getToolSpec: vi.fn(),
    invokeTool: vi.fn(),
  })),
}));

describe("@airiscode/mcp-registry - ToolRegistry", () => {
  let registry: ToolRegistry;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      listTools: vi.fn(),
      getToolSpec: vi.fn(),
      invokeTool: vi.fn(),
    };

    registry = new ToolRegistry(mockClient, {
      lazyLoading: true,
      preloadTools: [],
    });
  });

  describe("initialize", () => {
    it("should fetch available tools", async () => {
      mockClient.listTools.mockResolvedValueOnce({
        tools: [
          { name: "mindbase_search" },
          { name: "mindbase_store" },
          { name: "supabase_query" },
        ],
        total: 3,
      });

      await registry.initialize();

      const tools = registry.getAvailableTools();
      expect(tools).toHaveLength(3);
      expect(tools).toContain("mindbase_search");
      expect(tools).toContain("mindbase_store");
      expect(tools).toContain("supabase_query");
    });

    it("should preload specified tools", async () => {
      const preloadRegistry = new ToolRegistry(mockClient, {
        preloadTools: ["mindbase_search", "supabase_query"],
      });

      mockClient.listTools.mockResolvedValueOnce({
        tools: [
          { name: "mindbase_search" },
          { name: "mindbase_store" },
          { name: "supabase_query" },
        ],
        total: 3,
      });

      mockClient.getToolSpec.mockResolvedValue({
        name: "test_tool",
        description: "Test tool",
        inputSchema: {},
        server: "test",
      });

      await preloadRegistry.initialize();

      expect(mockClient.getToolSpec).toHaveBeenCalledWith("mindbase_search");
      expect(mockClient.getToolSpec).toHaveBeenCalledWith("supabase_query");
      expect(mockClient.getToolSpec).toHaveBeenCalledTimes(2);
    });
  });

  describe("hasTool", () => {
    beforeEach(async () => {
      mockClient.listTools.mockResolvedValueOnce({
        tools: [{ name: "mindbase_search" }, { name: "mindbase_store" }],
        total: 2,
      });
      await registry.initialize();
    });

    it("should return true for available tools", () => {
      expect(registry.hasTool("mindbase_search")).toBe(true);
      expect(registry.hasTool("mindbase_store")).toBe(true);
    });

    it("should return false for unavailable tools", () => {
      expect(registry.hasTool("non_existent_tool")).toBe(false);
    });
  });

  describe("resolveToolSpec", () => {
    beforeEach(async () => {
      mockClient.listTools.mockResolvedValueOnce({
        tools: [{ name: "test_tool" }],
        total: 1,
      });
      await registry.initialize();
    });

    it("should fetch and cache tool spec", async () => {
      const mockSpec = {
        name: "test_tool",
        description: "Test tool",
        inputSchema: { type: "object" },
        server: "test",
      };

      mockClient.getToolSpec.mockResolvedValueOnce(mockSpec);

      // First call
      const spec1 = await registry.resolveToolSpec("test_tool");
      expect(spec1).toEqual(mockSpec);
      expect(mockClient.getToolSpec).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const spec2 = await registry.resolveToolSpec("test_tool");
      expect(spec2).toEqual(mockSpec);
      expect(mockClient.getToolSpec).toHaveBeenCalledTimes(1); // No additional call
    });
  });

  describe("searchTools", () => {
    beforeEach(async () => {
      mockClient.listTools.mockResolvedValueOnce({
        tools: [
          { name: "mindbase_search" },
          { name: "mindbase_store" },
          { name: "supabase_query" },
          { name: "context7_fetch" },
        ],
        total: 4,
      });

      mockClient.getToolSpec.mockImplementation(async (name: string) => ({
        name,
        description:
          name === "mindbase_search"
            ? "Search MindBase for information"
            : name === "mindbase_store"
              ? "Store data in MindBase"
              : name === "supabase_query"
                ? "Query Supabase database"
                : "Fetch context from Context7",
        inputSchema: {},
        server: name.startsWith("mindbase")
          ? "mindbase"
          : name.startsWith("supabase")
            ? "supabase"
            : "context7",
      }));

      await registry.initialize();
    });

    it("should find tools by keyword", async () => {
      const matches = await registry.searchTools({
        keywords: ["search"],
      });

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].tool.name).toBe("mindbase_search");
      expect(matches[0].score).toBeGreaterThan(0);
    });

    it("should filter by server", async () => {
      const matches = await registry.searchTools({
        server: "mindbase",
      });

      expect(matches).toHaveLength(2);
      expect(matches.every((m) => m.tool.server === "mindbase")).toBe(true);
    });

    it("should apply minimum score filter", async () => {
      const matches = await registry.searchTools({
        keywords: ["database"],
        minScore: 0.4,
      });

      expect(matches.every((m) => m.score >= 0.4)).toBe(true);
    });

    it("should sort by score descending", async () => {
      const matches = await registry.searchTools({
        keywords: ["mindbase"],
      });

      for (let i = 1; i < matches.length; i++) {
        expect(matches[i - 1].score).toBeGreaterThanOrEqual(matches[i].score);
      }
    });

    it("should return all tools when no keywords", async () => {
      const matches = await registry.searchTools({});

      expect(matches).toHaveLength(4);
      expect(matches.every((m) => m.score === 1.0)).toBe(true);
    });
  });

  describe("invokeTool", () => {
    beforeEach(async () => {
      mockClient.listTools.mockResolvedValueOnce({
        tools: [{ name: "test_tool" }],
        total: 1,
      });
      await registry.initialize();
    });

    it("should invoke tool and track history", async () => {
      const mockResult = {
        success: true,
        data: { result: "success" },
        executionTime: 100,
      };

      mockClient.invokeTool.mockResolvedValueOnce(mockResult);

      const result = await registry.invokeTool({
        name: "test_tool",
        arguments: { key: "value" },
      });

      expect(result).toEqual(mockResult);

      const history = registry.getInvocationHistory("test_tool");
      expect(history).toHaveLength(1);
      expect(history[0].toolName).toBe("test_tool");
      expect(history[0].success).toBe(true);
      expect(history[0].arguments).toEqual({ key: "value" });
    });

    it("should track failed invocations", async () => {
      const error = new Error("Invocation failed");
      mockClient.invokeTool.mockRejectedValueOnce(error);

      await expect(
        registry.invokeTool({
          name: "test_tool",
          arguments: {},
        }),
      ).rejects.toThrow("Invocation failed");

      const history = registry.getInvocationHistory("test_tool");
      expect(history).toHaveLength(1);
      expect(history[0].success).toBe(false);
    });
  });

  describe("getToolStats", () => {
    beforeEach(async () => {
      mockClient.listTools.mockResolvedValueOnce({
        tools: [{ name: "test_tool" }],
        total: 1,
      });
      await registry.initialize();
    });

    it("should calculate tool statistics", async () => {
      mockClient.invokeTool.mockResolvedValue({
        success: true,
        data: {},
        executionTime: 100,
      });

      // Successful invocations
      await registry.invokeTool({ name: "test_tool", arguments: {} });
      await registry.invokeTool({ name: "test_tool", arguments: {} });

      // Failed invocation
      mockClient.invokeTool.mockRejectedValueOnce(new Error("Failed"));
      await registry.invokeTool({ name: "test_tool", arguments: {} }).catch(() => {});

      const stats = registry.getToolStats("test_tool");

      expect(stats.invocations).toBe(3);
      expect(stats.successes).toBe(2);
      expect(stats.failures).toBe(1);
      expect(stats.avgExecutionTime).toBeGreaterThan(0);
    });

    it("should return zero stats for unused tool", () => {
      const stats = registry.getToolStats("unused_tool");

      expect(stats.invocations).toBe(0);
      expect(stats.successes).toBe(0);
      expect(stats.failures).toBe(0);
      expect(stats.avgExecutionTime).toBe(0);
    });
  });

  describe("clearHistory", () => {
    beforeEach(async () => {
      mockClient.listTools.mockResolvedValueOnce({
        tools: [{ name: "test_tool" }],
        total: 1,
      });
      await registry.initialize();

      mockClient.invokeTool.mockResolvedValue({
        success: true,
        data: {},
        executionTime: 100,
      });
    });

    it("should clear invocation history", async () => {
      await registry.invokeTool({ name: "test_tool", arguments: {} });
      expect(registry.getInvocationHistory()).toHaveLength(1);

      registry.clearHistory();
      expect(registry.getInvocationHistory()).toHaveLength(0);
    });
  });

  describe("reload", () => {
    it("should reload available tools", async () => {
      mockClient.listTools.mockResolvedValueOnce({
        tools: [{ name: "tool1" }],
        total: 1,
      });

      await registry.initialize();
      expect(registry.getAvailableTools()).toHaveLength(1);

      mockClient.listTools.mockResolvedValueOnce({
        tools: [{ name: "tool1" }, { name: "tool2" }],
        total: 2,
      });

      await registry.reload();
      expect(registry.getAvailableTools()).toHaveLength(2);
    });
  });
});
