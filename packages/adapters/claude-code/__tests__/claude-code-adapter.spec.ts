import { ApprovalsLevel, DEFAULT_POLICY, TrustLevel } from "@airiscode/policies";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClaudeCodeAdapter } from "../src/claude-code-adapter.js";

// Mock child_process
vi.mock("child_process", () => ({
  spawn: vi.fn(() => ({
    pid: 12345,
    stdout: {
      on: vi.fn(),
    },
    stderr: {
      on: vi.fn(),
    },
    stdin: {
      write: vi.fn(),
    },
    on: vi.fn(),
    kill: vi.fn(),
  })),
}));

describe("@airiscode/adapters-claude-code - ClaudeCodeAdapter", () => {
  let adapter: ClaudeCodeAdapter;

  beforeEach(() => {
    adapter = new ClaudeCodeAdapter({
      adapterName: "claude-code",
      env: {},
      policy: DEFAULT_POLICY,
      sessionId: "test-session",
      workingDir: "/test/dir",
    });
    vi.clearAllMocks();
  });

  describe("getMetadata", () => {
    it("should return adapter metadata", () => {
      const metadata = adapter.getMetadata();

      expect(metadata.name).toBe("claude-code");
      expect(metadata.version).toBe("1.0.0");
      expect(metadata.supportedActions).toContain("implement");
      expect(metadata.supportedActions).toContain("refactor");
      expect(metadata.requiresCLI).toBe("claude");
    });
  });

  describe("spawn", () => {
    it("should spawn Claude Code process", async () => {
      const { spawn } = await import("child_process");

      await adapter.spawn();

      expect(spawn).toHaveBeenCalledWith(
        "claude",
        ["--json"],
        expect.objectContaining({
          cwd: "/test/dir",
          stdio: ["pipe", "pipe", "pipe"],
        }),
      );

      const state = adapter.getState();
      expect(state.status).toBe("ready");
      expect(state.processId).toBe(12345);
    });
  });

  describe("execute", () => {
    it("should validate execute request", async () => {
      await adapter.spawn();

      await expect(
        adapter.execute({
          action: "",
          inputJson: JSON.stringify({ prompt: "test" }),
        }),
      ).rejects.toThrow("Action is required");

      await expect(
        adapter.execute({
          action: "implement",
          inputJson: "",
        }),
      ).rejects.toThrow("Input JSON is required");

      await expect(
        adapter.execute({
          action: "implement",
          inputJson: "invalid json",
        }),
      ).rejects.toThrow("Invalid input JSON");
    });
  });

  describe("policy enforcement", () => {
    it("should block dangerous commands", async () => {
      await adapter.spawn();

      const result = await adapter.requestShell("rm -rf /");

      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it("should allow safe commands", async () => {
      await adapter.spawn();

      const result = await adapter.requestShell("git status");

      expect(result.allowed).toBe(true);
      expect(result.exitCode).toBeDefined();
    });

    it("should respect RESTRICTED trust level", async () => {
      const restrictedAdapter = new ClaudeCodeAdapter({
        adapterName: "claude-code",
        env: {},
        policy: {
          approvals: ApprovalsLevel.NEVER,
          trust: TrustLevel.RESTRICTED,
          guardStrict: true,
        },
        sessionId: "test-session",
        workingDir: "/test/dir",
      });

      await restrictedAdapter.spawn();

      const result = await restrictedAdapter.requestShell("ls -la");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("restricted");
    });
  });

  describe("terminate", () => {
    it("should terminate adapter process", async () => {
      await adapter.spawn();

      const { spawn } = await import("child_process");
      const mockProcess = vi.mocked(spawn).mock.results[0].value;

      await adapter.terminate();

      expect(mockProcess.kill).toHaveBeenCalledWith("SIGTERM");

      const state = adapter.getState();
      expect(state.status).toBe("terminated");
    });
  });

  describe("getOptions", () => {
    it("should return spawn options", () => {
      const options = adapter.getOptions();

      expect(options.adapterName).toBe("claude-code");
      expect(options.sessionId).toBe("test-session");
      expect(options.workingDir).toBe("/test/dir");
      expect(options.policy).toEqual(DEFAULT_POLICY);
    });
  });
});
