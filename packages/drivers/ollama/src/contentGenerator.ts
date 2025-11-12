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

export interface OllamaOptions {
  model: string;
  baseUrl?: string;
}

export class OllamaContentGenerator implements ContentGenerator {
  constructor(private opts: OllamaOptions) {}

  async generateContent(
    req: GenerateContentParameters,
    userPromptId?: string
  ): Promise<GenerateContentResponse> {
    const url = `${this.opts.baseUrl ?? "http://127.0.0.1:11434"}/api/chat`;

    const messages = req.messages || [
      ...(req.systemInstruction ? [{ role: "system", content: req.systemInstruction }] : []),
      { role: "user", content: req.prompt || "" }
    ];

    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: this.opts.model,
        messages,
        stream: false,
      }),
    });

    if (!r.ok) {
      throw new Error(`Ollama error: ${r.status} ${await r.text()}`);
    }

    const json: any = await r.json();
    const content = json.message?.content ?? "";

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
    const url = `${this.opts.baseUrl ?? "http://127.0.0.1:11434"}/api/chat`;

    const messages = req.messages || [
      ...(req.systemInstruction ? [{ role: "system", content: req.systemInstruction }] : []),
      { role: "user", content: req.prompt || "" }
    ];

    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: this.opts.model,
        messages,
        stream: true,
      }),
    });

    if (!r.ok) {
      throw new Error(`Ollama error: ${r.status} ${await r.text()}`);
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
        if (!trimmed) continue;

        try {
          const json = JSON.parse(trimmed);
          const content = json.message?.content ?? "";
          if (content) {
            yield { content, raw: json };
          }

          if (json.done) {
            break;
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }

  async countTokens(req: CountTokensParameters): Promise<CountTokensResponse> {
    // Placeholder
    return { totalTokens: undefined };
  }

  async embedContent(req: EmbedContentParameters): Promise<EmbedContentResponse> {
    const url = `${this.opts.baseUrl ?? "http://127.0.0.1:11434"}/api/embeddings`;

    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: req.model || this.opts.model,
        prompt: req.content,
      }),
    });

    if (!r.ok) {
      throw new Error(`Ollama error: ${r.status} ${await r.text()}`);
    }

    const json: any = await r.json();
    const vectors = json.embedding ? [json.embedding] : [];

    return { vectors };
  }
}
