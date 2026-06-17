/**
 * Shell Guard - Command safety validation
 */

import { PolicyProfile, TrustLevel } from "@airiscode/policies";
import { findMatchingDenyPattern } from "./deny-list.js";

/**
 * Result of Shell Guard evaluation
 */
export interface GuardResult {
  /** Whether the command is allowed */
  allowed: boolean;
  /** Reason for blocking (if blocked) */
  reason?: string;
  /** Suggested rewrite of the command (if applicable) */
  rewritten?: string;
  /** Severity level (if blocked) */
  severity?: "critical" | "high" | "medium";
}

/**
 * Shell Guard validates commands before execution
 */
export class ShellGuard {
  constructor(private policy: PolicyProfile) {}

  /**
   * Evaluate whether a command should be allowed
   */
  evaluate(command: string): GuardResult {
    // RESTRICTED: All shell commands are blocked
    if (this.policy.trust === TrustLevel.RESTRICTED) {
      return {
        allowed: false,
        reason: "Shell execution is disabled in restricted trust mode",
        severity: "high",
      };
    }

    // Check deny list
    const denyMatch = findMatchingDenyPattern(command);
    if (denyMatch) {
      return {
        allowed: false,
        reason: denyMatch.reason,
        severity: denyMatch.severity,
      };
    }

    // SANDBOXED: Block network commands
    if (this.policy.trust === TrustLevel.SANDBOXED) {
      const networkResult = this.checkNetworkCommand(command);
      if (!networkResult.allowed) {
        return networkResult;
      }
    }

    // Command is allowed
    return { allowed: true };
  }

  /**
   * Check if command attempts network access
   */
  private checkNetworkCommand(command: string): GuardResult {
    const networkPatterns = [
      { pattern: /\bcurl\b/, tool: "curl" },
      { pattern: /\bwget\b/, tool: "wget" },
      { pattern: /\bssh\b/, tool: "ssh" },
      { pattern: /\bscp\b/, tool: "scp" },
      { pattern: /\brsync\b.*:/, tool: "rsync" },
      { pattern: /\bftp\b/, tool: "ftp" },
      { pattern: /\btelnet\b/, tool: "telnet" },
      { pattern: /\bnc\b/, tool: "netcat" },
    ];

    for (const { pattern, tool } of networkPatterns) {
      if (pattern.test(command)) {
        return {
          allowed: false,
          reason: `Network access (${tool}) is blocked in sandboxed trust mode`,
          severity: "medium",
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Suggest a safer alternative for a blocked command
   */
  suggestAlternative(command: string): string | null {
    // rm -rf / -> rm -rf ./
    if (/rm\s+-rf\s+\//.test(command)) {
      return command.replace(/rm\s+-rf\s+\//, "rm -rf ./");
    }

    // docker system prune -af -> docker system prune
    if (/docker\s+system\s+prune\s+-af/.test(command)) {
      return command.replace(/-af/, "");
    }

    return null;
  }
}
