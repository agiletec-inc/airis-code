/**
 * Dangerous command patterns that should be blocked by Shell Guard
 */

export interface DenyPattern {
  pattern: RegExp;
  reason: string;
  severity: "critical" | "high" | "medium";
}

/**
 * Critical: Commands that can destroy the system or cause irreversible damage
 */
const CRITICAL_PATTERNS: DenyPattern[] = [
  {
    pattern: /rm\s+-rf\s+\//,
    reason: "Attempting to delete root directory",
    severity: "critical",
  },
  {
    pattern: /rm\s+-rf\s+~/,
    reason: "Attempting to delete home directory",
    severity: "critical",
  },
  {
    pattern: /:\(\)\s*{\s*:\|:&\s*};:/,
    reason: "Fork bomb detected",
    severity: "critical",
  },
  {
    pattern: /mkfs/,
    reason: "Attempting to format filesystem",
    severity: "critical",
  },
  {
    pattern: /dd\s+if=.*of=\/dev\/(sd[a-z]|hd[a-z]|nvme\d+n\d+)/,
    reason: "Attempting to write to raw disk device",
    severity: "critical",
  },
  {
    pattern: /chmod\s+-R\s+777\s+\//,
    reason: "Attempting to set world-writable permissions on root",
    severity: "critical",
  },
];

/**
 * High: Commands that can compromise security or system integrity
 */
const HIGH_PATTERNS: DenyPattern[] = [
  {
    pattern: /docker\s+system\s+prune\s+-a/,
    reason: "Attempting to prune all Docker resources",
    severity: "high",
  },
  {
    pattern: /curl.*\|\s*(sudo\s+)?bash/,
    reason: "Executing remote script with elevated privileges",
    severity: "high",
  },
  {
    pattern: /wget.*\|\s*(sudo\s+)?sh/,
    reason: "Executing remote script with elevated privileges",
    severity: "high",
  },
  {
    pattern: /sudo\s+chmod\s+u\+s/,
    reason: "Setting SUID bit with sudo",
    severity: "high",
  },
  {
    pattern: />\s*\/dev\/(sda|hda|nvme)/,
    reason: "Redirecting output to disk device",
    severity: "high",
  },
];

/**
 * Medium: Potentially dangerous commands that might be legitimate in some contexts
 */
const MEDIUM_PATTERNS: DenyPattern[] = [
  {
    pattern: /rm\s+-rf\s+\*$/,
    reason: "Recursive deletion of all files in current directory",
    severity: "medium",
  },
  {
    pattern: /pkill\s+-9\s+-U/,
    reason: "Force killing all processes for a user",
    severity: "medium",
  },
  {
    pattern: /iptables\s+-F/,
    reason: "Flushing iptables rules",
    severity: "medium",
  },
];

/**
 * All deny patterns combined
 */
export const DENY_LIST: DenyPattern[] = [
  ...CRITICAL_PATTERNS,
  ...HIGH_PATTERNS,
  ...MEDIUM_PATTERNS,
];

/**
 * Check if a command matches any deny pattern
 */
export function findMatchingDenyPattern(command: string): DenyPattern | null {
  for (const denyPattern of DENY_LIST) {
    if (denyPattern.pattern.test(command)) {
      return denyPattern;
    }
  }
  return null;
}
