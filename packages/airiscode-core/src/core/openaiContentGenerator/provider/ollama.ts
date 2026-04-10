/**
 * @license
 * Copyright 2025 Agiletec Inc.
 * SPDX-License-Identifier: Apache-2.0
 */

import OpenAI from 'openai';
import type { GenerateContentConfig } from '@google/genai';
import type { Config } from '../../../config/config.js';
import {
  AuthType,
  type ContentGeneratorConfig,
} from '../../contentGenerator.js';
import { DefaultOpenAICompatibleProvider } from './default.js';
import { buildRuntimeFetchOptions } from '../../../utils/runtimeFetchOptions.js';

const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434/v1';
const DEFAULT_TIMEOUT = 120_000; // 2 minutes — local models can be slow on first load

/**
 * Ollama provider for OpenAI-compatible API.
 *
 * Ollama exposes an OpenAI-compatible endpoint at /v1/chat/completions.
 * No API key is required (local inference). A dummy key is provided
 * because the OpenAI SDK requires one.
 */
export class OllamaOpenAICompatibleProvider extends DefaultOpenAICompatibleProvider {
  constructor(
    contentGeneratorConfig: ContentGeneratorConfig,
    cliConfig: Config,
  ) {
    super(contentGeneratorConfig, cliConfig);
  }

  /**
   * Detect if this configuration targets an Ollama instance.
   */
  static isOllamaProvider(
    contentGeneratorConfig: ContentGeneratorConfig,
  ): boolean {
    // Explicit authType match
    if (contentGeneratorConfig.authType === AuthType.USE_OLLAMA) {
      return true;
    }

    const baseUrl = contentGeneratorConfig.baseUrl ?? '';

    // Match common Ollama ports (11434 is the default)
    return (
      baseUrl.includes(':11434') || baseUrl.includes('ollama')
    );
  }

  override buildHeaders(): Record<string, string | undefined> {
    const version = this.cliConfig.getCliVersion() || 'unknown';
    const userAgent = `AirisCode/${version} (${process.platform}; ${process.arch})`;
    const { customHeaders } = this.contentGeneratorConfig;
    const defaultHeaders = {
      'User-Agent': userAgent,
    };

    return customHeaders
      ? { ...defaultHeaders, ...customHeaders }
      : defaultHeaders;
  }

  override buildClient(): OpenAI {
    const {
      baseUrl,
      timeout = DEFAULT_TIMEOUT,
      maxRetries = 2,
    } = this.contentGeneratorConfig;

    const defaultHeaders = this.buildHeaders();
    const runtimeOptions = buildRuntimeFetchOptions(
      'openai',
      this.cliConfig.getProxy(),
    );

    return new OpenAI({
      // Ollama doesn't require auth, but OpenAI SDK mandates an API key
      apiKey: 'ollama',
      baseURL: baseUrl || DEFAULT_OLLAMA_BASE_URL,
      timeout,
      maxRetries,
      defaultHeaders,
      ...(runtimeOptions || {}),
    });
  }

  override buildRequest(
    request: OpenAI.Chat.ChatCompletionCreateParams,
    userPromptId: string,
  ): OpenAI.Chat.ChatCompletionCreateParams {
    const baseRequest = super.buildRequest(request, userPromptId);

    // Ollama doesn't support some OpenAI-specific parameters
    // Remove unsupported fields to avoid errors
    const { ...cleaned } = baseRequest;

    // Ollama may not support 'parallel_tool_calls' field
    if ('parallel_tool_calls' in cleaned) {
      delete (cleaned as Record<string, unknown>)['parallel_tool_calls'];
    }

    return cleaned;
  }

  override getDefaultGenerationConfig(): GenerateContentConfig {
    return {
      temperature: 0.7,
    };
  }
}
