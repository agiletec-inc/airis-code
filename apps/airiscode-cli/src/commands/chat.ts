/**
 * Chat command - Interactive chat interface with Ollama
 */

import { Command } from 'commander';
import React from 'react';
import { render } from 'ink';
import { randomUUID } from 'node:crypto';
import { ChatApp } from '../ui/ChatApp.js';
import { getModelForRole } from '../config/models.js';

export function createChatCommand(): Command {
  const cmd = new Command('chat');

  cmd
    .description('Start interactive chat mode with Ollama (Claude Code-style interface)')
    .option('--cwd <dir>', 'Working directory', process.cwd())
    .option('-m, --model <name>', 'Ollama model to use', 'qwen2.5:3b')
    .option('--preset <name>', 'Model preset: premium/balanced/fast/dev', 'dev')
    .option('--role <name>', 'Model role: planner/implementer/reviewer/tester', 'implementer')
    .option('--ollama-url <url>', 'Ollama server URL', 'http://localhost:11434')
    .action(async (options) => {
      await executeChatCommand(options);
    });

  return cmd;
}

export async function executeChatCommand(options: {
  cwd?: string;
  model?: string;
  preset?: string;
  role?: string;
  ollamaUrl?: string;
}): Promise<void> {
  const sessionId = randomUUID();
  const workingDir = options.cwd || process.cwd();

  // Determine model to use
  let model = options.model;
  if (!model && options.preset && options.role) {
    model = getModelForRole(
      options.role as 'planner' | 'implementer' | 'reviewer' | 'tester',
      options.preset
    );
  }
  model = model || 'qwen2.5:3b'; // Fallback to available model

  console.log(`Starting chat with model: ${model} (role: ${options.role || 'implementer'})`);

  // Render the interactive chat UI
  const { waitUntilExit } = render(
    React.createElement(ChatApp, {
      sessionId,
      workingDir,
      model,
      ollamaUrl: options.ollamaUrl || 'http://localhost:11434',
    })
  );

  await waitUntilExit();
}
