/**
 * @license
 * Copyright 2025 AIRIS Code
 * SPDX-License-Identifier: MIT
 *
 * Provider-agnostic types for content generation
 */

export interface GenerateContentResponse {
  content: string;
  raw?: any;
}

export interface GenerateContentParameters {
  prompt?: string;
  messages?: any[];
  model?: string;
  systemInstruction?: string;
  maxTokens?: number;
  [key: string]: any;
}

export interface CountTokensResponse {
  totalTokens?: number;
}

export interface CountTokensParameters {
  content?: string;
  messages?: any[];
  [key: string]: any;
}

export interface EmbedContentResponse {
  vectors: number[][];
}

export interface EmbedContentParameters {
  content: string;
  model?: string;
  [key: string]: any;
}

/**
 * Interface abstracting the core functionalities for generating content and counting tokens.
 */
export interface ContentGenerator {
  generateContent(
    request: GenerateContentParameters,
    userPromptId?: string,
  ): Promise<GenerateContentResponse>;

  generateContentStream(
    request: GenerateContentParameters,
    userPromptId?: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>>;

  countTokens(request: CountTokensParameters): Promise<CountTokensResponse>;

  embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse>;

  userTier?: string;
}
