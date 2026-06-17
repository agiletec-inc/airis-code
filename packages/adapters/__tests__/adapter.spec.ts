import { ApprovalsLevel, DEFAULT_POLICY, TrustLevel } from "@airiscode/policies";
import { beforeEach, describe, expect, it } from "vitest";
import { AdapterEventKind } from "../src/events.js";
import { MockAdapter } from "../src/mock-adapter.js";

describe("@airiscode/adapters - AdapterProcess", () => {
  let adapter: MockAdapter;

  beforeEach(() => {
    adapter = new MockAdapter({
      adapterName: "test-adapter",
      env: {},
      policy: DEFAULT_POLICY,
      sessionId: "test-session",
      workingDir: "/test/dir",
    });
  });

  describe("getMetadata", () => {
    it("should return adapter metadata", () => {
      const metadata = adapter.getMetadata();

      expect(metadata.name).toBe("mock-adapter");
      expect(metadata.version).toBe("1.0.0-mock");
      expect(metadata.supportedActions).toContain("implement");
      expect(metadata.supportedActions).toContain("refactor");
    });
  });

  describe("spawn", () => {
    it("should spawn adapter successfully", async () => {
      await adapter.spawn();

      const state = adapter.getState();
      expect(state.status).toBe("ready");
      expect(state.processId).toBeGreaterThan(0);
      expect(state.startedAt).toBeInstanceOf(Date);
    });

    it("should emit spawned and ready events", async () => {
      const events: any[] = [];
      adapter.on((event) => events.push(event));

      await adapter.spawn();

      expect(events).toHaveLength(2);
      expect(events[0].kind).toBe(AdapterEventKind.SPAWNED);
      expect(events[1].kind).toBe(AdapterEventKind.READY);
    });

    it("should handle spawn failure", async () => {
      const failAdapter = new MockAdapter(
        {
          adapterName: "fail-adapter",
          env: {},
          policy: DEFAULT_POLICY,
          sessionId: "test-session",
          workingDir: "/test/dir",
        },
        { failSpawn: true },
      );

      await expect(failAdapter.spawn()).rejects.toThrow("Mock spawn failure");

      const state = failAdapter.getState();
      expect(state.status).toBe("error");
    });
  });

  describe("execute", () => {
    beforeEach(async () => {
      await adapter.spawn();
    });

    it("should execute action successfully", async () => {
      adapter.setResponse("implement", {
        outputJson: JSON.stringify({ implemented: true }),
        proposedShell: ["git diff"],
      });

      const response = await adapter.execute({
        action: "implement",
        inputJson: JSON.stringify({ feature: "test" }),
      });

      expect(response.outputJson).toBe(JSON.stringify({ implemented: true }));
      expect(response.proposedShell).toEqual(["git diff"]);
    });

    it("should filter dangerous shell commands", async () => {
      adapter.setResponse("dangerous", {
        outputJson: JSON.stringify({ result: "done" }),
        proposedShell: ["rm -rf /", "git status", "ls -la"],
      });

      const response = await adapter.execute({
        action: "dangerous",
        inputJson: JSON.stringify({ test: true }),
      });

      // rm -rf / should be filtered out
      expect(response.proposedShell).not.toContain("rm -rf /");
      expect(response.proposedShell).toContain("git status");
      expect(response.proposedShell).toContain("ls -la");
    });

    it("should emit execute events", async () => {
      const events: any[] = [];
      adapter.on((event) => events.push(event));

      await adapter.execute({
        action: "test",
        inputJson: JSON.stringify({ test: true }),
      });

      const executeEvents = events.filter(
        (e) => e.kind === AdapterEventKind.EXECUTE_START || e.kind === AdapterEventKind.EXECUTE_END,
      );

      expect(executeEvents).toHaveLength(2);
      expect(executeEvents[0].kind).toBe(AdapterEventKind.EXECUTE_START);
      expect(executeEvents[1].kind).toBe(AdapterEventKind.EXECUTE_END);
      expect(executeEvents[1].success).toBe(true);
    });

    it("should validate execute request", async () => {
      await expect(
        adapter.execute({
          action: "",
          inputJson: JSON.stringify({ test: true }),
        }),
      ).rejects.toThrow("Action is required");

      await expect(
        adapter.execute({
          action: "test",
          inputJson: "",
        }),
      ).rejects.toThrow("Input JSON is required");

      await expect(
        adapter.execute({
          action: "test",
          inputJson: "invalid json",
        }),
      ).rejects.toThrow("Invalid input JSON");
    });
  });

  describe("requestShell", () => {
    beforeEach(async () => {
      await adapter.spawn();
    });

    it("should execute safe commands", async () => {
      const result = await adapter.requestShell("git status");

      expect(result.allowed).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("git status");
    });

    it("should block dangerous commands", async () => {
      const result = await adapter.requestShell("rm -rf /");

      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it("should emit shell blocked event for dangerous commands", async () => {
      const events: any[] = [];
      adapter.on((event) => events.push(event));

      await adapter.requestShell("rm -rf /");

      const blockedEvents = events.filter((e) => e.kind === AdapterEventKind.SHELL_BLOCKED);
      expect(blockedEvents).toHaveLength(1);
      expect(blockedEvents[0].command).toBe("rm -rf /");
    });

    it("should emit shell executed event for safe commands", async () => {
      const events: any[] = [];
      adapter.on((event) => events.push(event));

      await adapter.requestShell("ls -la");

      const executedEvents = events.filter((e) => e.kind === AdapterEventKind.SHELL_EXECUTED);
      expect(executedEvents).toHaveLength(1);
      expect(executedEvents[0].command).toBe("ls -la");
    });
  });

  describe("policy enforcement", () => {
    it("should respect RESTRICTED trust level", async () => {
      const restrictedAdapter = new MockAdapter({
        adapterName: "restricted-adapter",
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

      // All commands should be blocked in RESTRICTED mode
      const result = await restrictedAdapter.requestShell("ls -la");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("restricted");
    });

    it("should block network commands in SANDBOXED mode", async () => {
      await adapter.spawn();

      const result = await adapter.requestShell("curl https://example.com");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Network access");
    });

    it("should allow network commands in UNTRUSTED mode", async () => {
      const untrustedAdapter = new MockAdapter({
        adapterName: "untrusted-adapter",
        env: {},
        policy: {
          approvals: ApprovalsLevel.NEVER,
          trust: TrustLevel.UNTRUSTED,
          guardStrict: true,
        },
        sessionId: "test-session",
        workingDir: "/test/dir",
      });

      await untrustedAdapter.spawn();

      const result = await untrustedAdapter.requestShell("curl https://example.com");
      expect(result.allowed).toBe(true);
    });
  });

  describe("streamLogs", () => {
    it("should stream log messages", async () => {
      adapter.addLog("Log message 1");
      adapter.addLog("Log message 2");

      const logs: string[] = [];
      for await (const log of adapter.streamLogs()) {
        logs.push(log);
      }

      expect(logs).toHaveLength(2);
      expect(logs[0]).toBe("Log message 1");
      expect(logs[1]).toBe("Log message 2");
    });

    it("should clear logs", async () => {
      adapter.addLog("Test log");
      adapter.clearLogs();

      const logs: string[] = [];
      for await (const log of adapter.streamLogs()) {
        logs.push(log);
      }

      expect(logs).toHaveLength(0);
    });
  });

  describe("terminate", () => {
    beforeEach(async () => {
      await adapter.spawn();
    });

    it("should terminate adapter", async () => {
      await adapter.terminate();

      const state = adapter.getState();
      expect(state.status).toBe("terminated");
      expect(state.terminatedAt).toBeInstanceOf(Date);
    });

    it("should emit terminated event", async () => {
      const events: any[] = [];
      adapter.on((event) => events.push(event));

      await adapter.terminate();

      const terminatedEvents = events.filter((e) => e.kind === AdapterEventKind.TERMINATED);
      expect(terminatedEvents).toHaveLength(1);
    });
  });

  describe("event listeners", () => {
    it("should add and remove event listeners", async () => {
      const events: any[] = [];
      const listener = (event: any) => events.push(event);

      adapter.on(listener);
      await adapter.spawn();
      expect(events.length).toBeGreaterThan(0);

      const beforeRemoveCount = events.length;
      adapter.off(listener);
      await adapter.terminate();

      // No new events should be recorded after removing listener
      expect(events.length).toBe(beforeRemoveCount);
    });
  });

  describe("getState and getOptions", () => {
    it("should return current state", () => {
      const state = adapter.getState();
      expect(state.status).toBe("idle");
    });

    it("should return spawn options", () => {
      const options = adapter.getOptions();
      expect(options.adapterName).toBe("test-adapter");
      expect(options.sessionId).toBe("test-session");
      expect(options.workingDir).toBe("/test/dir");
    });
  });
});
