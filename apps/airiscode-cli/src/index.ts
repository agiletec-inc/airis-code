#!/usr/bin/env node
/**
 * AIRIS Code CLI
 * Terminal-first autonomous coding runner
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { createCodeCommand } from './commands/code.js';
import { createConfigCommand } from './commands/config.js';
import { createSessionCommand } from './commands/session.js';
import { createChatCommand } from './commands/chat.js';

const program = new Command();

program
  .name('airis')
  .description('AIRIS Code - Terminal-first autonomous coding runner')
  .version('0.1.0');

// Add subcommands
program.addCommand(createCodeCommand());
program.addCommand(createConfigCommand());
program.addCommand(createSessionCommand());
program.addCommand(createChatCommand());

// Default action - treat as 'code' command when task is provided directly
program
  .argument('[task]', 'Task description (shorthand for "airis code <task>")')
  .option('-d, --driver <name>', 'Driver to use (ollama, openai)')
  .option('-a, --adapter <name>', 'Adapter to use (claude-code, cursor)')
  .option('-p, --policy <level>', 'Policy level (restricted, sandboxed, untrusted)')
  .option('--cwd <dir>', 'Working directory')
  .option('-s, --session <name>', 'Session name')
  .option('--json', 'Output in JSON format')
  .option('-v, --verbose', 'Verbose output')
  .action(async (task, options) => {
    if (task) {
      // If task is provided, execute as 'code' command
      const { executeCodeCommand } = await import('./commands/code.js');
      await executeCodeCommand(task, options);
    } else {
      // No task provided, start interactive chat mode
      const { executeChatCommand } = await import('./commands/chat.js');
      await executeChatCommand({ cwd: options.cwd });
    }
  });

// Global error handler
process.on('uncaughtException', (error) => {
  console.error(chalk.red('\nUncaught Exception:'));
  console.error(chalk.red(error.message));
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('\nUnhandled Rejection:'));
  console.error(chalk.red(String(reason)));
  process.exit(1);
});

// Parse arguments
program.parse(process.argv);
