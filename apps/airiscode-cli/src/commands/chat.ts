/**
 * Chat command - Interactive chat interface with Ollama
 */

import { Command } from 'commander';
import React from 'react';
import { render } from 'ink';
import { randomUUID } from 'node:crypto';
import { ChatApp } from '../ui/ChatApp.js';
import { getModelForRole } from '../config/models.js';
import { MCPSessionManager } from '@airiscode/mcp-session';
import chalk from 'chalk';

export function createChatCommand(): Command {
  const cmd = new Command('chat');

  cmd
    .description('Start interactive chat mode with Ollama (Claude Code-style interface)')
    .option('--cwd <dir>', 'Working directory', process.cwd())
    .option('-m, --model <name>', 'Ollama model to use', 'qwen2.5:3b')
    .option('--preset <name>', 'Model preset: premium/balanced/fast/dev', 'dev')
    .option('--role <name>', 'Model role: planner/implementer/reviewer/tester', 'implementer')
    .option('--ollama-url <url>', 'Ollama server URL', 'http://localhost:11434')
    .option('--mcp-gateway <url>', 'MCP Gateway URL', process.env.MCP_GATEWAY_URL || 'http://localhost:3000')
    .option('--no-mcp', 'Disable MCP tools')
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
  mcpGateway?: string;
  mcp?: boolean;
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

  // Initialize MCP session if enabled
  let mcpSession: MCPSessionManager | undefined;
  if (options.mcp !== false) {
    try {
      console.log(chalk.blue('Initializing MCP Gateway...'));
      mcpSession = new MCPSessionManager({
        sessionId,
        baseURL: options.mcpGateway || 'http://localhost:3000',
        apiKey: process.env.MCP_API_KEY,
        timeout: 30000,
      });

      await mcpSession.initialize();
      const tools = mcpSession.getAllTools();
      console.log(chalk.green(`✓ MCP Gateway connected (${tools.length} tools available)`));
    } catch (error) {
      console.log(
        chalk.yellow(
          `⚠ MCP Gateway not available: ${error instanceof Error ? error.message : String(error)}`
        )
      );
      console.log(chalk.gray('Continuing without MCP tools...'));
      mcpSession = undefined;
    }
  }

  // Render the interactive chat UI
  const { waitUntilExit } = render(
    React.createElement(ChatApp, {
      sessionId,
      workingDir,
      model,
      ollamaUrl: options.ollamaUrl || 'http://localhost:11434',
      mcpSession,
    })
  );

  try {
    await waitUntilExit();
  } finally {
    // Cleanup MCP session
    if (mcpSession) {
      await mcpSession.cleanup();
      console.log(chalk.gray('MCP session cleaned up'));
    }
  }
}
