/**
 * Load project rules from .airiscode/rules/*.md
 *
 * Rules are markdown files that provide project-specific instructions
 * to the agent. They are loaded at session start and injected into
 * the system prompt, similar to AIRISCODE.md but organized by topic.
 *
 * This is inspired by Claude Code's .claude/rules/ directory.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Load all rule files from the .airiscode/rules/ directory.
 *
 * @param cwd - The current working directory (project root)
 * @returns Array of rule contents, each prefixed with the filename
 */
export function loadProjectRules(cwd: string): string[] {
  const rulesDir = path.join(cwd, '.airiscode', 'rules');

  if (!fs.existsSync(rulesDir)) {
    return [];
  }

  try {
    const files = fs
      .readdirSync(rulesDir)
      .filter((f) => f.endsWith('.md'))
      .sort();

    return files.map((file) => {
      const content = fs.readFileSync(path.join(rulesDir, file), 'utf-8');
      return `## Rules: ${file}\n\n${content}`;
    });
  } catch {
    return [];
  }
}

/**
 * Load project rules and format them as a single string
 * suitable for system prompt injection.
 */
export function loadProjectRulesAsPrompt(cwd: string): string {
  const rules = loadProjectRules(cwd);
  if (rules.length === 0) {
    return '';
  }
  return `\n# Project Rules\n\n${rules.join('\n\n')}\n`;
}
