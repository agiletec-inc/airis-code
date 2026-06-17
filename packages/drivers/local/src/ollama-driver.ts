/**
 * Ollama driver implementation
 */

import type {
  Capabilities,
  ChatRequest,
  ChatResponse,
  DriverConfig,
  StreamChunk,
} from "@airiscode/drivers";
import { DriverAPIError, DriverTimeoutError, ModelDriver } from "@airiscode/drivers";
import type {
  OllamaChatRequest,
  OllamaChatResponse,
  OllamaListResponse,
  OllamaTool,
} from "./types.js";

/**
 * Ollama driver configuration
 */
export interface OllamaDriverConfig extends DriverConfig {
  /** Ollama server base URL */
  baseUrl?: string;
}

/**
 * Ollama driver for local LLM inference
 *
 * Connects to Ollama server (default: http://localhost:11434)
 */
export class OllamaDriver extends ModelDriver {
  private baseUrl: string;

  constructor(config: OllamaDriverConfig = {}) {
    super(config);
    this.baseUrl = config.baseUrl || "http://localhost:11434";
  }

  async getCapabilities(): Promise<Capabilities> {
    try {
      const response = await this.fetch("/api/tags");
      const data = (await response.json()) as OllamaListResponse;

      return {
        models: data.models.map((m) => m.name),
        supportsTools: true,
        supportsStream: true,
        maxContextTokens: 128000, // Varies by model
        apiVersion: "1.0.0",
      };
    } catch (error) {
      throw new DriverAPIError(
        `Failed to get capabilities: ${error instanceof Error ? error.message : "Unknown error"}`,
        undefined,
        error,
      );
    }
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    this.validateRequest(request);

    const ollamaRequest = this.buildOllamaRequest(request, false);

    try {
      const response = await this.fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify(ollamaRequest),
      });

      const data = (await response.json()) as OllamaChatResponse;

      return this.parseOllamaResponse(data);
    } catch (error) {
      if (error instanceof DriverAPIError || error instanceof DriverTimeoutError) {
        throw error;
      }
      throw new DriverAPIError(
        `Chat request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        undefined,
        error,
      );
    }
  }

  async *chatStream(request: ChatRequest): AsyncIterable<StreamChunk> {
    this.validateRequest(request);

    const ollamaRequest = this.buildOllamaRequest(request, true);

    try {
      const response = await this.fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify(ollamaRequest),
      });

      if (!response.body) {
        throw new DriverAPIError("No response body for streaming");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim()) {
            const data = JSON.parse(line) as OllamaChatResponse;

            if (data.message?.content) {
              const delta = data.message.content;
              fullText += delta;

              yield {
                delta,
                done: false,
              };
            }

            if (data.done) {
              yield {
                done: true,
                response: this.parseOllamaResponse({
                  ...data,
                  message: { ...data.message, content: fullText },
                }),
              };
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof DriverAPIError || error instanceof DriverTimeoutError) {
        throw error;
      }
      throw new DriverAPIError(
        `Stream request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        undefined,
        error,
      );
    }
  }

  /**
   * Build Ollama request from ChatRequest
   */
  private buildOllamaRequest(request: ChatRequest, stream: boolean): OllamaChatRequest {
    const ollamaRequest: OllamaChatRequest = {
      model: this.getModelName(request),
      messages: request.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stream,
    };

    if (request.temperature !== undefined || request.maxTokens !== undefined) {
      ollamaRequest.options = {
        temperature: request.temperature,
        num_predict: request.maxTokens,
      };
    }

    if (request.tools && request.tools.length > 0) {
      ollamaRequest.tools = request.tools.map((t) => ({
        type: "function",
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }));
    }

    return ollamaRequest;
  }

  /**
   * Parse Ollama response to ChatResponse
   */
  private parseOllamaResponse(data: OllamaChatResponse): ChatResponse {
    const toolCalls = data.message.tool_calls?.map((tc, idx) => ({
      id: `call_${Date.now()}_${idx}`,
      name: tc.function.name,
      arguments: tc.function.arguments,
    }));

    return {
      text: data.message.content,
      toolCalls,
      incomplete: !data.done,
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      },
      finishReason: toolCalls ? "tool_calls" : data.done ? "stop" : "length",
    };
  }

  /**
   * Fetch wrapper with timeout
   */
  private async fetch(
    path: string,
    options?: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
    },
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: options?.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...this.config.headers,
          ...options?.headers,
        },
        body: options?.body,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new DriverAPIError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          await response.text(),
        );
      }

      return response;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new DriverTimeoutError(`Request timed out after ${this.config.timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
