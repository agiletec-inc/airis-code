import { DriverAPIError, DriverTimeoutError } from "@airiscode/drivers";
import { DEFAULT_POLICY } from "@airiscode/policies";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OllamaDriver } from "../src/ollama-driver.js";

// Mock fetch globally
global.fetch = vi.fn();

describe("@airiscode/drivers-local - OllamaDriver", () => {
  let driver: OllamaDriver;

  beforeEach(() => {
    driver = new OllamaDriver({
      baseUrl: "http://localhost:11434",
      timeout: 5000,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getCapabilities", () => {
    it("should fetch available models", async () => {
      const mockResponse = {
        models: [
          {
            name: "qwen2.5-coder:7b",
            modified_at: "2024-01-01T00:00:00Z",
            size: 4661211808,
            digest: "abc123",
          },
          {
            name: "llama3.1:8b",
            modified_at: "2024-01-01T00:00:00Z",
            size: 4661211808,
            digest: "def456",
          },
        ],
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const capabilities = await driver.getCapabilities();

      expect(capabilities.models).toHaveLength(2);
      expect(capabilities.models).toContain("qwen2.5-coder:7b");
      expect(capabilities.models).toContain("llama3.1:8b");
      expect(capabilities.supportsTools).toBe(true);
      expect(capabilities.supportsStream).toBe(true);
    });

    it("should handle API errors", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: async () => "Server error",
      } as Response);

      await expect(driver.getCapabilities()).rejects.toThrow(DriverAPIError);
    });
  });

  describe("chat", () => {
    it("should perform synchronous chat", async () => {
      const mockResponse = {
        model: "qwen2.5-coder:7b",
        created_at: "2024-01-01T00:00:00Z",
        message: {
          role: "assistant",
          content: "Hello! How can I help you today?",
        },
        done: true,
        prompt_eval_count: 10,
        eval_count: 8,
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const response = await driver.chat({
        sessionId: "test-session",
        messages: [{ role: "user", content: "Hello" }],
        policy: DEFAULT_POLICY,
      });

      expect(response.text).toBe("Hello! How can I help you today?");
      expect(response.incomplete).toBe(false);
      expect(response.finishReason).toBe("stop");
      expect(response.usage?.promptTokens).toBe(10);
      expect(response.usage?.completionTokens).toBe(8);
    });

    it("should handle tool calls", async () => {
      const mockResponse = {
        model: "qwen2.5-coder:7b",
        created_at: "2024-01-01T00:00:00Z",
        message: {
          role: "assistant",
          content: "I will check the weather for you.",
          tool_calls: [
            {
              function: {
                name: "get_weather",
                arguments: { location: "Tokyo", unit: "celsius" },
              },
            },
          ],
        },
        done: true,
        prompt_eval_count: 15,
        eval_count: 5,
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const response = await driver.chat({
        sessionId: "test-session",
        messages: [{ role: "user", content: "What is the weather in Tokyo?" }],
        tools: [
          {
            name: "get_weather",
            description: "Get weather information",
            parameters: {
              type: "object",
              properties: {
                location: { type: "string" },
                unit: { type: "string", enum: ["celsius", "fahrenheit"] },
              },
            },
          },
        ],
        policy: DEFAULT_POLICY,
      });

      expect(response.text).toBe("I will check the weather for you.");
      expect(response.toolCalls).toHaveLength(1);
      expect(response.toolCalls![0].name).toBe("get_weather");
      expect(response.toolCalls![0].arguments).toEqual({
        location: "Tokyo",
        unit: "celsius",
      });
      expect(response.finishReason).toBe("tool_calls");
    });

    it("should include temperature and maxTokens in options", async () => {
      const mockResponse = {
        model: "qwen2.5-coder:7b",
        created_at: "2024-01-01T00:00:00Z",
        message: { role: "assistant", content: "Response" },
        done: true,
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await driver.chat({
        sessionId: "test-session",
        messages: [{ role: "user", content: "Test" }],
        policy: DEFAULT_POLICY,
        temperature: 0.7,
        maxTokens: 100,
      });

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1]?.body as string);

      expect(requestBody.options.temperature).toBe(0.7);
      expect(requestBody.options.num_predict).toBe(100);
    });

    it("should handle timeout", async () => {
      vi.mocked(fetch).mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error("AbortError")), 100);
          }),
      );

      const timeoutDriver = new OllamaDriver({ timeout: 50 });

      await expect(
        timeoutDriver.chat({
          sessionId: "test",
          messages: [{ role: "user", content: "Test" }],
          policy: DEFAULT_POLICY,
        }),
      ).rejects.toThrow();
    });
  });

  describe("chatStream", () => {
    it("should stream chat responses", async () => {
      const mockStreamData = [
        {
          model: "qwen2.5-coder:7b",
          created_at: "2024-01-01T00:00:00Z",
          message: { role: "assistant", content: "Hello" },
          done: false,
        },
        {
          model: "qwen2.5-coder:7b",
          created_at: "2024-01-01T00:00:00Z",
          message: { role: "assistant", content: ", how" },
          done: false,
        },
        {
          model: "qwen2.5-coder:7b",
          created_at: "2024-01-01T00:00:00Z",
          message: { role: "assistant", content: " are you?" },
          done: true,
          prompt_eval_count: 5,
          eval_count: 10,
        },
      ];

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          for (const data of mockStreamData) {
            controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
          }
          controller.close();
        },
      });

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        body: stream,
      } as Response);

      const chunks: string[] = [];
      let finalResponse;

      for await (const chunk of driver.chatStream({
        sessionId: "test-session",
        messages: [{ role: "user", content: "Hello" }],
        policy: DEFAULT_POLICY,
      })) {
        if (chunk.delta) {
          chunks.push(chunk.delta);
        }
        if (chunk.done && chunk.response) {
          finalResponse = chunk.response;
        }
      }

      expect(chunks.join("")).toBe("Hello, how are you?");
      expect(finalResponse).toBeDefined();
      expect(finalResponse!.text).toBe("Hello, how are you?");
      expect(finalResponse!.usage?.promptTokens).toBe(5);
      expect(finalResponse!.usage?.completionTokens).toBe(10);
    });

    it("should handle streaming errors", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        body: null,
      } as Response);

      const streamIterator = driver.chatStream({
        sessionId: "test",
        messages: [{ role: "user", content: "Test" }],
        policy: DEFAULT_POLICY,
      });

      await expect(streamIterator.next()).rejects.toThrow(DriverAPIError);
    });
  });

  describe("request validation", () => {
    it("should validate session ID", async () => {
      await expect(
        driver.chat({
          sessionId: "",
          messages: [{ role: "user", content: "Test" }],
          policy: DEFAULT_POLICY,
        }),
      ).rejects.toThrow("Session ID is required");
    });

    it("should validate messages array", async () => {
      await expect(
        driver.chat({
          sessionId: "test",
          messages: [],
          policy: DEFAULT_POLICY,
        }),
      ).rejects.toThrow("Messages array cannot be empty");
    });

    it("should validate temperature range", async () => {
      await expect(
        driver.chat({
          sessionId: "test",
          messages: [{ role: "user", content: "Test" }],
          policy: DEFAULT_POLICY,
          temperature: 3.0, // Invalid: > 2
        }),
      ).rejects.toThrow("Temperature must be between 0 and 2");
    });
  });

  describe("configuration", () => {
    it("should use custom base URL", async () => {
      const customDriver = new OllamaDriver({
        baseUrl: "http://custom-server:8080",
      });

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [] }),
      } as Response);

      await customDriver.getCapabilities();

      expect(fetch).toHaveBeenCalledWith("http://custom-server:8080/api/tags", expect.any(Object));
    });

    it("should use default model from config", () => {
      const driverWithDefault = new OllamaDriver({
        defaultModel: "llama3.1:8b",
      });

      const config = driverWithDefault.getConfig();
      expect(config.defaultModel).toBe("llama3.1:8b");
    });
  });
});
