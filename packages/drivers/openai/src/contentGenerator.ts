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

export interface OpenAIOptions {
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export class OpenAIContentGenerator implements ContentGenerator {
  constructor(private opts: OpenAIOptions) {}

  async generateContent(
    req: GenerateContentParameters,
    userPromptId?: string
  ): Promise<GenerateContentResponse> {
    const url = `${this.opts.baseUrl ?? "https://api.openai.com/v1"}/chat/completions`;

    const messages = req.messages || [
      ...(req.systemInstruction ? [{ role: "system", content: req.systemInstruction }] : []),
      { role: "user", content: req.prompt || "" }
    ];

    const r = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.opts.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.opts.model,
        messages,
        ...req,
      }),
    });

    if (!r.ok) {
      throw new Error(`OpenAI error: ${r.status} ${await r.text()}`);
    }

    const json: any = await r.json();
    const content = json.choices?.[0]?.message?.content ?? "";

    return { content, raw: json };
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
    const url = `${this.opts.baseUrl ?? "https://api.openai.com/v1"}/chat/completions`;

    const messages = req.messages || [
      ...(req.systemInstruction ? [{ role: "system", content: req.systemInstruction }] : []),
      { role: "user", content: req.prompt || "" }
    ];

    const r = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.opts.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.opts.model,
        messages,
        stream: true,
        ...req,
      }),
    });

    if (!r.ok) {
      throw new Error(`OpenAI error: ${r.status} ${await r.text()}`);
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
        if (data === "[DONE]") continue;

        try {
          const json = JSON.parse(data);
          const content = json.choices?.[0]?.delta?.content ?? "";
          if (content) {
            yield { content, raw: json };
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }

  async countTokens(req: CountTokensParameters): Promise<CountTokensResponse> {
    // Placeholder - implement with tiktoken if needed
    return { totalTokens: undefined };
  }

  async embedContent(req: EmbedContentParameters): Promise<EmbedContentResponse> {
    const url = `${this.opts.baseUrl ?? "https://api.openai.com/v1"}/embeddings`;

    const r = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.opts.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: req.model || "text-embedding-3-small",
        input: req.content,
      }),
    });

    if (!r.ok) {
      throw new Error(`OpenAI error: ${r.status} ${await r.text()}`);
    }

    const json: any = await r.json();
    const vectors = json.data?.map((item: any) => item.embedding) ?? [];

    return { vectors };
  }
}
