import { DEFAULT_POLICY } from "@airiscode/policies";
import { beforeEach, describe, expect, it } from "vitest";
import { MockDriver } from "../src/mock-driver.js";

describe("@airiscode/drivers - ModelDriver", () => {
  let driver: MockDriver;

  beforeEach(() => {
    driver = new MockDriver({
      responses: [
        { text: "Hello, how can I help you?" },
        {
          text: "I will call a tool",
          toolCalls: [
            {
              id: "call_123",
              name: "get_weather",
              arguments: { location: "Tokyo" },
            },
          ],
        },
      ],
    });
  });

  describe("getCapabilities", () => {
    it("should return driver capabilities", async () => {
      const capabilities = await driver.getCapabilities();

      expect(capabilities.models).toHaveLength(2);
      expect(capabilities.supportsTools).toBe(true);
      expect(capabilities.supportsStream).toBe(true);
      expect(capabilities.apiVersion).toBe("1.0.0-mock");
    });
  });

  describe("chat", () => {
    it("should perform synchronous chat", async () => {
      const response = await driver.chat({
        sessionId: "test-session",
        messages: [{ role: "user", content: "Hello" }],
        policy: DEFAULT_POLICY,
      });

      expect(response.text).toBe("Hello, how can I help you?");
      expect(response.incomplete).toBe(false);
      expect(response.usage).toBeDefined();
      expect(response.finishReason).toBe("stop");
    });

    it("should handle tool calls", async () => {
      // First call
      await driver.chat({
        sessionId: "test-session",
        messages: [{ role: "user", content: "Hello" }],
        policy: DEFAULT_POLICY,
      });

      // Second call with tool
      const response = await driver.chat({
        sessionId: "test-session",
        messages: [{ role: "user", content: "What is the weather?" }],
        policy: DEFAULT_POLICY,
      });

      expect(response.text).toBe("I will call a tool");
      expect(response.toolCalls).toHaveLength(1);
      expect(response.toolCalls![0].name).toBe("get_weather");
      expect(response.toolCalls![0].arguments).toEqual({ location: "Tokyo" });
      expect(response.finishReason).toBe("tool_calls");
    });

    it("should validate request", async () => {
      await expect(
        driver.chat({
          sessionId: "",
          messages: [{ role: "user", content: "Hello" }],
          policy: DEFAULT_POLICY,
        }),
      ).rejects.toThrow("Session ID is required");

      await expect(
        driver.chat({
          sessionId: "test-session",
          messages: [],
          policy: DEFAULT_POLICY,
        }),
      ).rejects.toThrow("Messages array cannot be empty");
    });

    it("should calculate token usage", async () => {
      const response = await driver.chat({
        sessionId: "test-session",
        messages: [
          { role: "system", content: "You are a helpful assistant" },
          { role: "user", content: "Hello" },
        ],
        policy: DEFAULT_POLICY,
      });

      expect(response.usage).toBeDefined();
      expect(response.usage!.promptTokens).toBeGreaterThan(0);
      expect(response.usage!.completionTokens).toBeGreaterThan(0);
      expect(response.usage!.totalTokens).toBe(
        response.usage!.promptTokens + response.usage!.completionTokens,
      );
    });
  });

  describe("chatStream", () => {
    it("should stream chat responses", async () => {
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

      expect(chunks.join("")).toBe("Hello, how can I help you?");
      expect(finalResponse).toBeDefined();
      expect(finalResponse!.text).toBe("Hello, how can I help you?");
    });

    it("should emit done chunk at the end", async () => {
      let doneCount = 0;

      for await (const chunk of driver.chatStream({
        sessionId: "test-session",
        messages: [{ role: "user", content: "Hi" }],
        policy: DEFAULT_POLICY,
      })) {
        if (chunk.done) {
          doneCount++;
        }
      }

      expect(doneCount).toBe(1);
    });
  });

  describe("MockDriver specific", () => {
    it("should cycle through responses", async () => {
      driver.setResponses([{ text: "Response 1" }, { text: "Response 2" }]);

      const response1 = await driver.chat({
        sessionId: "test",
        messages: [{ role: "user", content: "Test" }],
        policy: DEFAULT_POLICY,
      });

      const response2 = await driver.chat({
        sessionId: "test",
        messages: [{ role: "user", content: "Test" }],
        policy: DEFAULT_POLICY,
      });

      const response3 = await driver.chat({
        sessionId: "test",
        messages: [{ role: "user", content: "Test" }],
        policy: DEFAULT_POLICY,
      });

      expect(response1.text).toBe("Response 1");
      expect(response2.text).toBe("Response 2");
      expect(response3.text).toBe("Response 1"); // Cycles back
    });

    it("should reset response index", async () => {
      const response1 = await driver.chat({
        sessionId: "test",
        messages: [{ role: "user", content: "Test" }],
        policy: DEFAULT_POLICY,
      });

      driver.reset();

      const response2 = await driver.chat({
        sessionId: "test",
        messages: [{ role: "user", content: "Test" }],
        policy: DEFAULT_POLICY,
      });

      expect(response1.text).toBe(response2.text);
    });

    it("should add responses dynamically", async () => {
      driver.reset();
      driver.setResponses([{ text: "Initial" }]);

      const response1 = await driver.chat({
        sessionId: "test",
        messages: [{ role: "user", content: "Test" }],
        policy: DEFAULT_POLICY,
      });

      driver.addResponse({ text: "Added" });

      const response2 = await driver.chat({
        sessionId: "test",
        messages: [{ role: "user", content: "Test" }],
        policy: DEFAULT_POLICY,
      });

      expect(response1.text).toBe("Initial");
      expect(response2.text).toBe("Added");
    });
  });

  describe("configuration", () => {
    it("should get configuration", () => {
      const config = driver.getConfig();
      expect(config.timeout).toBe(120000);
    });

    it("should update configuration", () => {
      driver.updateConfig({ timeout: 60000 });
      const config = driver.getConfig();
      expect(config.timeout).toBe(60000);
    });
  });
});
