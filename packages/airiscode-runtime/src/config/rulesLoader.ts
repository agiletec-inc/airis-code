/**
 * Load project rules from .airiscode/rules/*.md and .claude/rules/*.md
 *
 * Rules are markdown files that provide project-specific instructions
 * to the agent. They are loaded at session start and injected into
 * the system prompt, similar to AIRISCODE.md but organized by topic.
 *
 * Claude Code compatibility: Also reads .claude/rules/ so that teams
 * using both Claude Code and AIRIS Code can share the same rules.
 * .airiscode/rules/ takes precedence if the same filename exists in both.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

/** Directories to scan for rules, in priority order (last wins on conflict) */
const RULES_DIRS = ['.claude/rules', '.airiscode/rules'];

/**
 * Load all rule files from rules directories.
 * Reads both .claude/rules/ and .airiscode/rules/ for Claude Code compatibility.
 * If the same filename exists in both, .airiscode/rules/ takes precedence.
 *
 * @param cwd - The current working directory (project root)
 * @returns Array of rule contents, each prefixed with the filename
 */
export function loadProjectRules(cwd: string): string[] {
  const rulesByName = new Map<string, string>();

  for (const dir of RULES_DIRS) {
    const rulesDir = path.join(cwd, dir);
    if (!fs.existsSync(rulesDir)) {
      continue;
    }

    try {
      const files = fs
        .readdirSync(rulesDir)
        .filter((f) => f.endsWith('.md'))
        .sort();

      for (const file of files) {
        const content = fs.readFileSync(path.join(rulesDir, file), 'utf-8');
        // Later directories override earlier ones (airiscode > claude)
        rulesByName.set(file, content);
      }
    } catch {
      // Silently skip unreadable directories
    }
  }

  return Array.from(rulesByName.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([file, content]) => `## Rules: ${file}\n\n${content}`);
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
