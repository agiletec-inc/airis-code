/**
 * Ollama Model Driver
 *
 * Implements ModelDriver interface for local Ollama inference.
 * Supports tool calling via Ollama's function calling API.
 */

import type {
  Capabilities,
  ChatMessage,
  ChatRequest,
  ChatResponse,
  DriverConfig,
  StreamChunk,
  ToolCall,
  ToolSpec,
} from "@airiscode/drivers";
import { ModelDriver } from "@airiscode/drivers";

export interface OllamaConfig extends DriverConfig {
  baseUrl?: string;
  defaultModel?: string;
}

interface OllamaMessage {
  role: string;
  content: string;
}

interface OllamaTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface OllamaToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

interface OllamaResponse {
  message: {
    content: string;
    tool_calls?: OllamaToolCall[];
  };
  done?: boolean;
  prompt_eval_count?: number;
  eval_count?: number;
}

export class OllamaDriver extends ModelDriver {
  private baseUrl: string;

  constructor(config: OllamaConfig = {}) {
    super({
      timeout: 120000,
      defaultModel: "llama3.1:8b",
      ...config,
    });
    this.baseUrl = config.baseUrl || "http://localhost:11434";
  }

  async getCapabilities(): Promise<Capabilities> {
    try {
      // Check Ollama availability
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`Ollama not available: ${response.status}`);
      }

      const data: any = await response.json();
      const models = data.models.map((m: any) => m.name);

      return {
        models,
        supportsTools: true, // Ollama supports function calling
        supportsStream: true,
        maxContextTokens: 8192, // Varies by model
        apiVersion: "1.0",
      };
    } catch (error) {
      throw new Error(
        `Failed to get Ollama capabilities: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    this.validateRequest(request);

    const model = this.getModelName(request);
    const messages = this.convertMessages(request.messages);
    const tools = request.tools ? this.convertTools(request.tools) : undefined;

    const payload: any = {
      model,
      messages,
      stream: false,
      options: {
        temperature: request.temperature ?? 0.7,
        num_predict: request.maxTokens ?? -1,
      },
    };

    if (tools && tools.length > 0) {
      payload.tools = tools;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.config.timeout || 120000),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ollama API error ${response.status}: ${error}`);
      }

      const data = (await response.json()) as OllamaResponse;
      return this.parseResponse(data);
    } catch (error) {
      throw new Error(
        `Ollama chat failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async *chatStream(request: ChatRequest): AsyncIterable<StreamChunk> {
    this.validateRequest(request);

    const model = this.getModelName(request);
    const messages = this.convertMessages(request.messages);
    const tools = request.tools ? this.convertTools(request.tools) : undefined;

    const payload: any = {
      model,
      messages,
      stream: true,
      options: {
        temperature: request.temperature ?? 0.7,
        num_predict: request.maxTokens ?? -1,
      },
    };

    if (tools && tools.length > 0) {
      payload.tools = tools;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.config.timeout || 120000),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ollama API error ${response.status}: ${error}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let accumulatedText = "";
      const accumulatedToolCalls: ToolCall[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const data = JSON.parse(trimmed) as OllamaResponse;
            const content = data.message?.content || "";

            if (content) {
              accumulatedText += content;
              yield {
                delta: content,
                done: false,
              };
            }

            // Handle tool calls
            if (data.message?.tool_calls) {
              const parsedToolCalls = this.parseToolCalls(data.message.tool_calls);
              accumulatedToolCalls.push(...parsedToolCalls);
            }

            if (data.done) {
              // Final chunk
              const finalResponse: ChatResponse = {
                text: accumulatedText,
                incomplete: false,
                finishReason: accumulatedToolCalls.length > 0 ? "tool_calls" : "stop",
                toolCalls: accumulatedToolCalls.length > 0 ? accumulatedToolCalls : undefined,
                usage: {
                  promptTokens: data.prompt_eval_count || 0,
                  completionTokens: data.eval_count || 0,
                  totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
                },
              };

              yield {
                done: true,
                response: finalResponse,
              };
              return;
            }
          } catch (e) {
            // Skip invalid JSON
            console.error("Failed to parse Ollama stream chunk:", e);
          }
        }
      }
    } catch (error) {
      throw new Error(
        `Ollama stream failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Convert AIRIS messages to Ollama format
   */
  private convertMessages(messages: ChatMessage[]): OllamaMessage[] {
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  /**
   * Convert AIRIS tool specs to Ollama format
   */
  private convertTools(tools: ToolSpec[]): OllamaTool[] {
    if (!tools) return [];

    return tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  /**
   * Parse Ollama response to AIRIS format
   */
  private parseResponse(data: OllamaResponse): ChatResponse {
    const toolCalls = data.message.tool_calls
      ? this.parseToolCalls(data.message.tool_calls)
      : undefined;

    return {
      text: data.message.content,
      toolCalls,
      incomplete: false,
      finishReason: toolCalls && toolCalls.length > 0 ? "tool_calls" : "stop",
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      },
    };
  }

  /**
   * Parse Ollama tool calls to AIRIS format
   */
  private parseToolCalls(ollamaToolCalls: OllamaToolCall[]): ToolCall[] {
    return ollamaToolCalls.map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments),
    }));
  }
}
