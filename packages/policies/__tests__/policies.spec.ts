import { describe, expect, it } from "vitest";
import {
  ApprovalsLevel,
  AUTONOMOUS_POLICY,
  DEFAULT_POLICY,
  parsePolicyProfile,
  RESTRICTED_POLICY,
  safeParsePolicyProfile,
  TrustLevel,
} from "../src/index.js";

describe("@airiscode/policies", () => {
  describe("PolicyProfile validation", () => {
    it("should validate a valid policy profile", () => {
      const result = safeParsePolicyProfile({
        approvals: "on-failure",
        trust: "sandboxed",
        guardStrict: true,
      });

      expect(result.success).toBe(true);
    });

    it("should reject invalid approvals level", () => {
      const result = safeParsePolicyProfile({
        approvals: "invalid",
        trust: "sandboxed",
        guardStrict: true,
      });

      expect(result.success).toBe(false);
    });

    it("should reject invalid trust level", () => {
      const result = safeParsePolicyProfile({
        approvals: "never",
        trust: "invalid",
        guardStrict: true,
      });

      expect(result.success).toBe(false);
    });

    it("should parse valid policy profile", () => {
      const profile = parsePolicyProfile({
        approvals: "on-request",
        trust: "restricted",
        guardStrict: false,
      });

      expect(profile.approvals).toBe(ApprovalsLevel.ON_REQUEST);
      expect(profile.trust).toBe(TrustLevel.RESTRICTED);
      expect(profile.guardStrict).toBe(false);
    });
  });

  describe("Default policies", () => {
    it("should have valid DEFAULT_POLICY", () => {
      expect(DEFAULT_POLICY.approvals).toBe(ApprovalsLevel.ON_FAILURE);
      expect(DEFAULT_POLICY.trust).toBe(TrustLevel.SANDBOXED);
      expect(DEFAULT_POLICY.guardStrict).toBe(true);
    });

    it("should have valid AUTONOMOUS_POLICY", () => {
      expect(AUTONOMOUS_POLICY.approvals).toBe(ApprovalsLevel.NEVER);
      expect(AUTONOMOUS_POLICY.trust).toBe(TrustLevel.SANDBOXED);
    });

    it("should have valid RESTRICTED_POLICY", () => {
      expect(RESTRICTED_POLICY.approvals).toBe(ApprovalsLevel.ON_REQUEST);
      expect(RESTRICTED_POLICY.trust).toBe(TrustLevel.RESTRICTED);
    });
  });
});
