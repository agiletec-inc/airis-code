/**
 * Policy type definitions
 */

/**
 * Approval level determines when user approval is required
 */
export enum ApprovalsLevel {
  /** Fully autonomous, no user approval required */
  NEVER = "never",
  /** Pause for user input when errors occur */
  ON_FAILURE = "on-failure",
  /** Require explicit user approval before executing actions */
  ON_REQUEST = "on-request",
}

/**
 * Trust level determines filesystem and network access permissions
 */
export enum TrustLevel {
  /** Read-only filesystem, shell disabled */
  RESTRICTED = "restricted",
  /** Workspace write allowed, external network blocked */
  SANDBOXED = "sandboxed",
  /** Full access, but Shell Guard still blocks dangerous commands */
  UNTRUSTED = "untrusted",
}

/**
 * Policy profile combining approval and trust settings
 */
export interface PolicyProfile {
  /** Approval level for this session */
  approvals: ApprovalsLevel;
  /** Trust level for this session */
  trust: TrustLevel;
  /** Enable strict Shell Guard validation */
  guardStrict: boolean;
}
