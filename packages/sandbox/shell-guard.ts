/**
 * Shell Guard - Command validation and rewriting engine
 *
 * This module enforces the security boundary defined in guard.schema.yaml.
 * All shell execution MUST flow through this guard.
 */

import * as fs from "fs/promises";
import * as path from "path";
import * as yaml from "yaml";

export interface GuardConfig {
  version: number;
  denylist: Array<{ pattern: string; reason: string }>;
  rewrites: Array<{
    from: string;
    to: string;
    when_trust?: string;
    reason: string;
  }>;
  network: {
    default: string;
    allow_hosts: string[];
    allow_domains: string[];
  };
  fs: {
    write_root: string;
    readonly_paths: string[];
    writable_paths: string[];
  };
  timeouts: Record<string, number>;
}

export interface GuardVerdict {
  allowed: boolean;
  rewritten_command?: string;
  reason?: string;
  timeout_sec: number;
}

export type TrustLevel = "restricted" | "sandboxed" | "untrusted";

export class ShellGuard {
  private config: GuardConfig;

  constructor(configPath?: string) {
    // Config loaded asynchronously via init()
    this.config = {} as GuardConfig;
  }

  async init(configPath?: string): Promise<void> {
    const defaultPath = path.join(__dirname, "../policies/schemas/guard.schema.yaml");
    const yamlContent = await fs.readFile(configPath || defaultPath, "utf-8");
    this.config = yaml.parse(yamlContent);
  }

  /**
   * Evaluate a shell command against Guard policies
   */
  evaluate(command: string, trustLevel: TrustLevel): GuardVerdict {
    // 1. Check denylist (absolute blocks)
    for (const rule of this.config.denylist) {
      const regex = new RegExp(rule.pattern, "i");
      if (regex.test(command)) {
        return {
          allowed: false,
          reason: `Denied: ${rule.reason}`,
          timeout_sec: 0,
        };
      }
    }

    // 2. Apply rewrites based on trust level
    let rewrittenCommand = command;
    for (const rewrite of this.config.rewrites) {
      if (!rewrite.when_trust || rewrite.when_trust === trustLevel) {
        const regex = new RegExp(rewrite.from);
        if (regex.test(command)) {
          rewrittenCommand = command.replace(regex, rewrite.to);
          break;
        }
      }
    }

    // 3. Determine timeout
    const timeout_sec = this.config.timeouts[trustLevel] || 300;

    return {
      allowed: true,
      rewritten_command: rewrittenCommand !== command ? rewrittenCommand : undefined,
      timeout_sec,
    };
  }

  /**
   * Static analysis: extract filesystem paths from command
   */
  extractPaths(command: string): string[] {
    // Simple heuristic: match quoted strings and bare paths
    const pathRegex = /(?:["']([^"']+)["'])|(?:\s(\/[^\s]+))|(?:\s(\.\/[^\s]+))/g;
    const matches = Array.from(command.matchAll(pathRegex));
    return matches.map((m) => m[1] || m[2] || m[3]).filter(Boolean);
  }

  /**
   * Validate filesystem access based on trust level
   */
  validateFsAccess(paths: string[], trustLevel: TrustLevel): { allowed: boolean; reason?: string } {
    if (trustLevel === "restricted") {
      // Read-only: reject all writes
      return {
        allowed: false,
        reason: "Filesystem writes disabled in restricted mode",
      };
    }

    for (const p of paths) {
      // Check readonly paths
      for (const ro of this.config.fs.readonly_paths) {
        if (p.startsWith(ro)) {
          return {
            allowed: false,
            reason: `Write to read-only path: ${ro}`,
          };
        }
      }

      // Check write root (sandboxed mode)
      if (trustLevel === "sandboxed") {
        const writeRoot = this.config.fs.write_root;
        if (!p.startsWith(writeRoot) && !p.startsWith("./")) {
          return {
            allowed: false,
            reason: `Write outside workspace root: ${p}`,
          };
        }
      }
    }

    return { allowed: true };
  }
}

/**
 * Singleton instance for global access
 */
let guardInstance: ShellGuard | null = null;

export async function getGuard(configPath?: string): Promise<ShellGuard> {
  if (!guardInstance) {
    guardInstance = new ShellGuard(configPath);
    await guardInstance.init(configPath);
  }
  return guardInstance;
}
