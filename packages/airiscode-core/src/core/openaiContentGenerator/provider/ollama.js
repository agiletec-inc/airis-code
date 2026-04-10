/**
 * @license
 * Copyright 2025 Agiletec Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import OpenAI from 'openai';
import { AuthType, } from '../../contentGenerator.js';
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
    constructor(contentGeneratorConfig, cliConfig) {
        super(contentGeneratorConfig, cliConfig);
    }
    /**
     * Detect if this configuration targets an Ollama instance.
     */
    static isOllamaProvider(contentGeneratorConfig) {
        // Explicit authType match
        if (contentGeneratorConfig.authType === AuthType.USE_OLLAMA) {
            return true;
        }
        const baseUrl = contentGeneratorConfig.baseUrl ?? '';
        // Match common Ollama ports (11434 is the default)
        return (baseUrl.includes(':11434') || baseUrl.includes('ollama'));
    }
    buildHeaders() {
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
    buildClient() {
        const { baseUrl, timeout = DEFAULT_TIMEOUT, maxRetries = 2, } = this.contentGeneratorConfig;
        const defaultHeaders = this.buildHeaders();
        const runtimeOptions = buildRuntimeFetchOptions('openai', this.cliConfig.getProxy());
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
    buildRequest(request, userPromptId) {
        const baseRequest = super.buildRequest(request, userPromptId);
        // Ollama doesn't support some OpenAI-specific parameters
        // Remove unsupported fields to avoid errors
        const { ...cleaned } = baseRequest;
        // Ollama may not support 'parallel_tool_calls' field
        if ('parallel_tool_calls' in cleaned) {
            delete cleaned['parallel_tool_calls'];
        }
        return cleaned;
    }
    getDefaultGenerationConfig() {
        return {
            temperature: 0.7,
        };
    }
}
//# sourceMappingURL=ollama.js.map