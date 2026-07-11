/**
 * Mock driver for testing
 */

import { ModelDriver } from "./driver.js";
import type {
  Capabilities,
  ChatRequest,
  ChatResponse,
  DriverConfig,
  StreamChunk,
} from "./types.js";

/**
 * Mock responses for testing
 */
export interface MockResponse {
  text: string;
  toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }>;
}

/**
 * Mock driver configuration
 */
export interface MockDriverConfig extends DriverConfig {
  /** Predefined responses */
  responses?: MockResponse[];
  /** Current response index */
  responseIndex?: number;
  /** Simulate delay (ms) */
  delay?: number;
}

/**
 * Mock driver for testing purposes
 */
export class MockDriver extends ModelDriver {
  private responses: MockResponse[];
  private currentIndex: number;
  private delay: number;

  constructor(config: MockDriverConfig = {}) {
    super(config);
    this.responses = config.responses || [{ text: "Mock response 1" }, { text: "Mock response 2" }];
    this.currentIndex = config.responseIndex || 0;
    this.delay = config.delay || 0;
  }

  async getCapabilities(): Promise<Capabilities> {
    return {
      models: ["mock-model-1", "mock-model-2"],
      supportsTools: true,
      supportsStream: true,
      maxContextTokens: 128000,
      apiVersion: "1.0.0-mock",
    };
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    this.validateRequest(request);

    if (this.delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delay));
    }

    const mockResponse = this.responses[this.currentIndex % this.responses.length];
    this.currentIndex++;

    const toolCalls = mockResponse.toolCalls?.map((tc) => ({
      id: tc.id,
      name: tc.name,
      arguments: tc.arguments,
    }));

    return {
      text: mockResponse.text,
      toolCalls,
      incomplete: false,
      usage: {
        promptTokens: request.messages.reduce((sum, m) => sum + m.content.length, 0),
        completionTokens: mockResponse.text.length,
        totalTokens:
          request.messages.reduce((sum, m) => sum + m.content.length, 0) + mockResponse.text.length,
      },
      finishReason: toolCalls ? "tool_calls" : "stop",
    };
  }

  async *chatStream(request: ChatRequest): AsyncIterable<StreamChunk> {
    this.validateRequest(request);

    const mockResponse = this.responses[this.currentIndex % this.responses.length];
    this.currentIndex++;

    // Simulate streaming by yielding character by character
    const text = mockResponse.text;
    for (let i = 0; i < text.length; i++) {
      if (this.delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, this.delay / text.length));
      }

      yield {
        delta: text[i],
        done: false,
      };
    }

    // Final chunk with complete response
    yield {
      done: true,
      response: {
        text: mockResponse.text,
        toolCalls: mockResponse.toolCalls?.map((tc) => ({
          id: tc.id,
          name: tc.name,
          arguments: tc.arguments,
        })),
        incomplete: false,
        usage: {
          promptTokens: request.messages.reduce((sum, m) => sum + m.content.length, 0),
          completionTokens: mockResponse.text.length,
          totalTokens:
            request.messages.reduce((sum, m) => sum + m.content.length, 0) +
            mockResponse.text.length,
        },
        finishReason: "stop",
      },
    };
  }

  /**
   * Set predefined responses
   */
  setResponses(responses: MockResponse[]): void {
    this.responses = responses;
    this.currentIndex = 0;
  }

  /**
   * Add a response to the queue
   */
  addResponse(response: MockResponse): void {
    this.responses.push(response);
  }

  /**
   * Reset response index
   */
  reset(): void {
    this.currentIndex = 0;
  }
}
