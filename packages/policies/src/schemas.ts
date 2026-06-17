/**
 * Zod schemas for runtime validation of policy profiles
 */

import { z } from "zod";
import { ApprovalsLevel, TrustLevel } from "./types.js";

/**
 * Zod schema for ApprovalsLevel
 */
export const ApprovalsLevelSchema = z.nativeEnum(ApprovalsLevel);

/**
 * Zod schema for TrustLevel
 */
export const TrustLevelSchema = z.nativeEnum(TrustLevel);

/**
 * Zod schema for PolicyProfile
 */
export const PolicyProfileSchema = z.object({
  approvals: ApprovalsLevelSchema,
  trust: TrustLevelSchema,
  guardStrict: z.boolean(),
});

/**
 * Parse and validate a policy profile
 */
export function parsePolicyProfile(data: unknown) {
  return PolicyProfileSchema.parse(data);
}

/**
 * Safely parse a policy profile, returning a result
 */
export function safeParsePolicyProfile(data: unknown) {
  return PolicyProfileSchema.safeParse(data);
}
