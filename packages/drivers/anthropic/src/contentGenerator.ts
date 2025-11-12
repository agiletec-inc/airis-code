/**
 * @license
 * Copyright 2025 AIRIS Code
 * SPDX-License-Identifier: MIT
 */

import type {
  ContentGenerator,
  GenerateContentResponse,
  GenerateContentParameters,
  CountTokensResponse,
  CountTokensParameters,
  EmbedContentResponse,
  EmbedContentParameters,
} from "@airiscode/core-gemini/src/types";

export interface AnthropicOptions {
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export class AnthropicContentGenerator implements ContentGenerator {
  constructor(private opts: AnthropicOptions) {}

  async generateContent(
    req: GenerateContentParameters,
    userPromptId?: string
  ): Promise<GenerateContentResponse> {
    const url = `${this.opts.baseUrl ?? "https://api.anthropic.com"}/v1/messages`;

    const messages = req.messages || [
      { role: "user", content: req.prompt || "" }
    ];

    const body: any = {
      model: this.opts.model,
      max_tokens: req.maxTokens || 4096,
      messages,
    };

    if (req.systemInstruction) {
      body.system = req.systemInstruction;
    }

    const r = await fetch(url, {
      method: "POST",
      headers: {
        "x-api-key": this.opts.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      throw new Error(`Anthropic error: ${r.status} ${await r.text()}`);
    }

    const json: any = await r.json();
    const text = json.content?.map((b: any) => b.text).join("") ?? "";

    return { content: text, raw: json };
  }

  async generateContentStream(
    req: GenerateContentParameters,
    userPromptId?: string
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    return this._generateContentStream(req, userPromptId);
  }

  private async *_generateContentStream(
    req: GenerateContentParameters,
    userPromptId?: string
  ): AsyncGenerator<GenerateContentResponse> {
    const url = `${this.opts.baseUrl ?? "https://api.anthropic.com"}/v1/messages`;

    const messages = req.messages || [
      { role: "user", content: req.prompt || "" }
    ];

    const body: any = {
      model: this.opts.model,
      max_tokens: req.maxTokens || 4096,
      messages,
      stream: true,
    };

    if (req.systemInstruction) {
      body.system = req.systemInstruction;
    }

    const r = await fetch(url, {
      method: "POST",
      headers: {
        "x-api-key": this.opts.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      throw new Error(`Anthropic error: ${r.status} ${await r.text()}`);
    }

    const reader = r.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        const data = trimmed.slice(6);

        try {
          const json = JSON.parse(data);

          if (json.type === "content_block_delta" && json.delta?.type === "text_delta") {
            const content = json.delta.text ?? "";
            if (content) {
              yield { content, raw: json };
            }
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }

  async countTokens(req: CountTokensParameters): Promise<CountTokensResponse> {
    // Placeholder - Anthropic has a separate API for token counting
    return { totalTokens: undefined };
  }

  async embedContent(req: EmbedContentParameters): Promise<EmbedContentResponse> {
    // Anthropic doesn't provide embeddings API
    throw new Error("Anthropic does not support embeddings");
  }
}
