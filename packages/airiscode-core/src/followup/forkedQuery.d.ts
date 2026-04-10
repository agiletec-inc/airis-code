/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 *
 * Forked Query Infrastructure
 *
 * Enables cache-aware secondary LLM calls that share the main conversation's
 * prompt prefix (systemInstruction + history) for cache hits.
 *
 * DashScope already enables cache_control via X-DashScope-CacheControl header.
 * By constructing the forked GeminiChat with identical generationConfig and
 * history prefix, the fork automatically benefits from prefix caching.
 *
 * Note: `runForkedQuery` overrides `tools: []` at the per-request level so the
 * model cannot produce function calls. `createForkedChat` retains the full
 * generationConfig (including tools) for callers like speculation that need them.
 */
import type { Content, GenerateContentConfig } from '@google/genai';
import { GeminiChat } from '../core/geminiChat.js';
import type { Config } from '../config/config.js';
/**
 * Snapshot of the main conversation's cache-critical parameters.
 * Captured after each successful main turn so forked queries share the same prefix.
 */
export interface CacheSafeParams {
    /** Full generation config including systemInstruction and tools */
    generationConfig: GenerateContentConfig;
    /** Curated conversation history (deep clone) */
    history: Content[];
    /** Model identifier */
    model: string;
    /** Version number — increments when systemInstruction or tools change */
    version: number;
}
/**
 * Result from a forked query.
 */
export interface ForkedQueryResult {
    /** Extracted text response, or null if no text */
    text: string | null;
    /** Parsed JSON result if schema was provided */
    jsonResult?: Record<string, unknown>;
    /** Token usage metrics */
    usage: {
        inputTokens: number;
        outputTokens: number;
        cacheHitTokens: number;
    };
}
/**
 * Save cache-safe params after a successful main conversation turn.
 * Called from GeminiClient.sendMessageStream() on successful completion.
 */
export declare function saveCacheSafeParams(generationConfig: GenerateContentConfig, history: Content[], model: string): void;
/**
 * Get the current cache-safe params, or null if not yet captured.
 */
export declare function getCacheSafeParams(): CacheSafeParams | null;
/**
 * Clear cache-safe params (e.g., on session reset).
 */
export declare function clearCacheSafeParams(): void;
/**
 * Create an isolated GeminiChat that shares the main conversation's
 * generationConfig (including systemInstruction, tools, and history).
 *
 * The full config is retained so that callers like `runSpeculativeLoop`
 * can execute tool calls during speculation. For pure-text callers like
 * `runForkedQuery`, tools are stripped at the per-request level via
 * `NO_TOOLS` — see {@link runForkedQuery}.
 *
 * The fork does NOT have chatRecordingService or telemetryService to avoid
 * polluting the main session's recordings and token counts.
 */
export declare function createForkedChat(config: Config, params: CacheSafeParams): GeminiChat;
/**
 * Run a forked query using a GeminiChat that shares the main conversation's
 * cache prefix. This is a single-turn, tool-free request (no function calls).
 *
 * @param config - App config
 * @param userMessage - The user message to send (e.g., SUGGESTION_PROMPT)
 * @param options - Optional configuration
 * @returns Query result with text, optional JSON, and usage metrics
 */
export declare function runForkedQuery(config: Config, userMessage: string, options?: {
    abortSignal?: AbortSignal;
    /** JSON schema for structured output */
    jsonSchema?: Record<string, unknown>;
    /** Override model (e.g., for speculation with a cheaper model) */
    model?: string;
}): Promise<ForkedQueryResult>;
//# sourceMappingURL=forkedQuery.d.ts.map