import type { GenerateContentConfig } from '../../../types/llm.js';
import type OpenAI from 'openai';

// Extended types to support cache_control for compatible providers
export interface ChatCompletionContentPartTextWithCache
  extends OpenAI.Chat.ChatCompletionContentPartText {
  cache_control?: { type: 'ephemeral' };
}

export type ChatCompletionContentPartWithCache =
  | ChatCompletionContentPartTextWithCache
  | OpenAI.Chat.ChatCompletionContentPartImage
  | OpenAI.Chat.ChatCompletionContentPartRefusal;

export type ChatCompletionToolWithCache = OpenAI.Chat.ChatCompletionTool & {
  cache_control?: { type: 'ephemeral' };
};

export interface OpenAICompatibleProvider {
  buildHeaders(): Record<string, string | undefined>;
  buildClient(): OpenAI;
  buildRequest(
    request: OpenAI.Chat.ChatCompletionCreateParams,
    userPromptId: string,
  ): OpenAI.Chat.ChatCompletionCreateParams;
  getDefaultGenerationConfig(): GenerateContentConfig;
}
