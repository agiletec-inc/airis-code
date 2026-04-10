/**
 * @license
 * Copyright 2025 Agiletec Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import OpenAI from 'openai';
import type { GenerateContentConfig } from '@google/genai';
import type { Config } from '../../../config/config.js';
import { type ContentGeneratorConfig } from '../../contentGenerator.js';
import { DefaultOpenAICompatibleProvider } from './default.js';
/**
 * Ollama provider for OpenAI-compatible API.
 *
 * Ollama exposes an OpenAI-compatible endpoint at /v1/chat/completions.
 * No API key is required (local inference). A dummy key is provided
 * because the OpenAI SDK requires one.
 */
export declare class OllamaOpenAICompatibleProvider extends DefaultOpenAICompatibleProvider {
    constructor(contentGeneratorConfig: ContentGeneratorConfig, cliConfig: Config);
    /**
     * Detect if this configuration targets an Ollama instance.
     */
    static isOllamaProvider(contentGeneratorConfig: ContentGeneratorConfig): boolean;
    buildHeaders(): Record<string, string | undefined>;
    buildClient(): OpenAI;
    buildRequest(request: OpenAI.Chat.ChatCompletionCreateParams, userPromptId: string): OpenAI.Chat.ChatCompletionCreateParams;
    getDefaultGenerationConfig(): GenerateContentConfig;
}
//# sourceMappingURL=ollama.d.ts.map