/**
 * Base model driver abstract class
 */

import type {
  Capabilities,
  ChatRequest,
  ChatResponse,
  DriverConfig,
  StreamChunk,
} from "./types.js";

/**
 * Abstract base class for all model drivers
 *
 * Implementations must provide:
 * - getCapabilities(): Return driver capabilities
 * - chat(): Synchronous chat completion
 * - chatStream(): Streaming chat completion
 */
export abstract class ModelDriver {
  protected config: DriverConfig;

  constructor(config: DriverConfig = {}) {
    this.config = {
      timeout: 120000, // 2 minutes default
      ...config,
    };
  }

  /**
   * Get driver capabilities
   */
  abstract getCapabilities(): Promise<Capabilities>;

  /**
   * Perform synchronous chat completion
   */
  abstract chat(request: ChatRequest): Promise<ChatResponse>;

  /**
   * Perform streaming chat completion
   *
   * @yields StreamChunk objects until done
   */
  abstract chatStream(request: ChatRequest): AsyncIterable<StreamChunk>;

  /**
   * Get configuration
   */
  getConfig(): Readonly<DriverConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration (partial)
   */
  updateConfig(config: Partial<DriverConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Validate chat request before sending
   */
  protected validateRequest(request: ChatRequest): void {
    if (!request.sessionId) {
      throw new Error("Session ID is required");
    }
    if (!request.messages || request.messages.length === 0) {
      throw new Error("Messages array cannot be empty");
    }
    if (request.temperature !== undefined) {
      if (request.temperature < 0 || request.temperature > 2) {
        throw new Error("Temperature must be between 0 and 2");
      }
    }
  }

  /**
   * Get default model from config or hints
   */
  protected getModelName(request: ChatRequest): string {
    return request.modelHints?.model || this.config.defaultModel || "default";
  }
}
