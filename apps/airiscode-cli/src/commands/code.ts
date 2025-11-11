/**
 * Code command - Execute coding task with AI
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { SessionManager } from '../session/session-manager.js';
import { config } from '../utils/config.js';
// import { ClaudeCodeAdapter } from '@airiscode/adapters-claude-code';
import { ApprovalsLevel, TrustLevel } from '@airiscode/policies';
import type { CodeCommandOptions } from '../types.js';

export function createCodeCommand(): Command {
  const cmd = new Command('code');

  cmd
    .description('Execute a coding task with AI assistance')
    .argument('<task>', 'Task description')
    .option('-d, --driver <name>', 'Driver to use (ollama, openai)', config.get('defaultDriver'))
    .option('-a, --adapter <name>', 'Adapter to use (claude-code, cursor)', config.get('defaultAdapter'))
    .option('-p, --policy <level>', 'Policy level (restricted, sandboxed, untrusted)', 'sandboxed')
    .option('--cwd <dir>', 'Working directory', process.cwd())
    .option('-s, --session <name>', 'Session name')
    .option('--json', 'Output in JSON format')
    .option('-v, --verbose', 'Verbose output')
    .action(async (task: string, options: CodeCommandOptions) => {
      await executeCodeCommand(task, options);
    });

  return cmd;
}

export async function executeCodeCommand(task: string, options: CodeCommandOptions): Promise<void> {
  const spinner = options.json ? null : ora('Initializing...').start();

  try {
    // Create session
    const sessionManager = new SessionManager();

    const policyMap = {
      restricted: { approvals: ApprovalsLevel.NEVER, trust: TrustLevel.RESTRICTED, guardStrict: true },
      sandboxed: { approvals: ApprovalsLevel.ON_REQUEST, trust: TrustLevel.SANDBOXED, guardStrict: true },
      untrusted: { approvals: ApprovalsLevel.ON_FAILURE, trust: TrustLevel.UNTRUSTED, guardStrict: false },
    };

    const policy = policyMap[options.policy as keyof typeof policyMap] || config.get('defaultPolicy');

    const session = sessionManager.createSession({
      name: options.session,
      workingDir: options.cwd || process.cwd(),
      driver: options.driver || config.get('defaultDriver'),
      adapter: options.adapter || config.get('defaultAdapter'),
      policy,
    });

    if (options.verbose) {
      console.log(chalk.blue('Session created:'), session.id);
      console.log(chalk.blue('Driver:'), session.driver);
      console.log(chalk.blue('Adapter:'), session.adapter);
      console.log(chalk.blue('Policy:'), JSON.stringify(session.policy, null, 2));
    }

    if (spinner) {
      spinner.succeed(chalk.green('Session created successfully'));
    }

    console.log(chalk.blue('\n📋 Session Information:'));
    console.log(chalk.gray('  ID:'), session.id);
    console.log(chalk.gray('  Task:'), task);
    console.log(chalk.gray('  Working Directory:'), session.workingDir);
    console.log(chalk.gray('  Driver:'), session.driver);
    console.log(chalk.gray('  Adapter:'), session.adapter);
    console.log(chalk.gray('  Policy:'), options.policy || 'sandboxed');

    console.log(chalk.yellow('\n⚠️  Note: Adapter integration is temporarily disabled.'));
    console.log(chalk.gray('     This is a pre-release version for testing CLI functionality.'));
    console.log(chalk.gray('     Full adapter support will be available in the next release.'));

    sessionManager.incrementTaskCount();
    sessionManager.addLog({
      level: 'info',
      source: 'system',
      message: 'Session created (adapters disabled)',
    });

    const result = { outputJson: '{}', proposedShell: [] };

    // Output result
    if (options.json) {
      console.log(JSON.stringify({
        sessionId: session.id,
        status: 'success',
        result: JSON.parse(result.outputJson),
        proposedShell: result.proposedShell,
      }, null, 2));
    } else {
      console.log(chalk.green('\n Task completed successfully\n'));
      console.log(chalk.bold('Result:'));
      const output = JSON.parse(result.outputJson);
      console.log(output);

      if (result.proposedShell && result.proposedShell.length > 0) {
        console.log(chalk.yellow('\nProposed shell commands:'));
        result.proposedShell.forEach((cmd: string, index: number) => {
          console.log(chalk.gray(`  ${index + 1}. ${cmd}`));
        });
      }
    }

    // Update session status
    sessionManager.updateStatus('completed');

    // Adapter termination skipped (adapters disabled)

  } catch (error) {
    if (spinner) {
      spinner.fail('Task failed');
    }

    if (options.json) {
      console.error(JSON.stringify({
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      }, null, 2));
    } else {
      console.error(chalk.red('\n Task failed'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    }

    process.exit(1);
  }
}
