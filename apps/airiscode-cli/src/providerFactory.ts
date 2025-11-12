/**
 * @license
 * Copyright 2025 AIRIS Code
 * SPDX-License-Identifier: MIT
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import TOML from "@iarna/toml";
import type { ContentGenerator } from "@airiscode/core-gemini";

export interface ProviderConfig {
  provider: {
    name: string;
  };
  openai?: {
    api_key?: string;
    model: string;
    base_url?: string;
  };
  anthropic?: {
    api_key?: string;
    model: string;
    base_url?: string;
  };
  ollama?: {
    model: string;
    base_url?: string;
  };
  mlx?: {
    model: string;
    base_url?: string;
  };
}

function expandEnvVar(value: string | undefined): string | undefined {
  if (!value) return value;
  if (value.startsWith("$")) {
    const envVar = value.slice(1);
    return process.env[envVar];
  }
  return value;
}

export async function createContentGenerator(): Promise<ContentGenerator> {
  const configPath = path.join(os.homedir(), ".airiscode", "config.toml");

  if (!fs.existsSync(configPath)) {
    throw new Error(
      `Config file not found: ${configPath}\n\nPlease create ~/.airiscode/config.toml with your provider settings.`
    );
  }

  const configContent = fs.readFileSync(configPath, "utf8");
  const cfg = TOML.parse(configContent) as Partial<ProviderConfig>;
  const providerName = cfg.provider?.name ?? "openai";

  switch (providerName) {
    case "openai": {
      const { OpenAIContentGenerator } = await import("@airiscode/driver-openai");
      const apiKey = expandEnvVar(cfg.openai?.api_key) ?? process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error("OpenAI API key not found. Set OPENAI_API_KEY or configure in config.toml");
      }
      return new OpenAIContentGenerator({
        apiKey,
        model: cfg.openai?.model ?? "gpt-4o-mini",
        baseUrl: cfg.openai?.base_url,
      });
    }

    case "anthropic": {
      const { AnthropicContentGenerator } = await import("@airiscode/driver-anthropic");
      const apiKey = expandEnvVar(cfg.anthropic?.api_key) ?? process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error("Anthropic API key not found. Set ANTHROPIC_API_KEY or configure in config.toml");
      }
      return new AnthropicContentGenerator({
        apiKey,
        model: cfg.anthropic?.model ?? "claude-3-5-sonnet-latest",
        baseUrl: cfg.anthropic?.base_url,
      });
    }

    case "ollama": {
      const { OllamaContentGenerator } = await import("@airiscode/driver-ollama");
      return new OllamaContentGenerator({
        model: cfg.ollama?.model ?? "qwen2.5:7b",
        baseUrl: cfg.ollama?.base_url,
      });
    }

    case "mlx": {
      // MLX driver placeholder - similar to Ollama but with MLX-specific endpoint
      const { OllamaContentGenerator } = await import("@airiscode/driver-ollama");
      return new OllamaContentGenerator({
        model: cfg.mlx?.model ?? "mlx-community/Qwen2.5-7B-Instruct-4bit",
        baseUrl: cfg.mlx?.base_url ?? "http://127.0.0.1:8080",
      });
    }

    default:
      throw new Error(`Unknown provider: ${providerName}. Supported: openai, anthropic, ollama, mlx`);
  }
}
