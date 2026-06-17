/**
 * Default policy profiles
 */

import { ApprovalsLevel, PolicyProfile, TrustLevel } from "./types.js";

/**
 * Default policy profile (recommended for most use cases)
 */
export const DEFAULT_POLICY: PolicyProfile = {
  approvals: ApprovalsLevel.ON_FAILURE,
  trust: TrustLevel.SANDBOXED,
  guardStrict: true,
};

/**
 * Autonomous policy profile (fully automated)
 */
export const AUTONOMOUS_POLICY: PolicyProfile = {
  approvals: ApprovalsLevel.NEVER,
  trust: TrustLevel.SANDBOXED,
  guardStrict: true,
};

/**
 * Interactive policy profile (requires approval for all actions)
 */
export const INTERACTIVE_POLICY: PolicyProfile = {
  approvals: ApprovalsLevel.ON_REQUEST,
  trust: TrustLevel.SANDBOXED,
  guardStrict: true,
};

/**
 * Restricted policy profile (read-only, maximum security)
 */
export const RESTRICTED_POLICY: PolicyProfile = {
  approvals: ApprovalsLevel.ON_REQUEST,
  trust: TrustLevel.RESTRICTED,
  guardStrict: true,
};

/**
 * Development policy profile (more permissive for local development)
 */
export const DEVELOPMENT_POLICY: PolicyProfile = {
  approvals: ApprovalsLevel.ON_FAILURE,
  trust: TrustLevel.UNTRUSTED,
  guardStrict: false,
};
