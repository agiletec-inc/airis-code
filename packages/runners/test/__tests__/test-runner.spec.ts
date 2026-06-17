import { beforeEach, describe, expect, it, vi } from "vitest";
import { TestRunner } from "../src/test-runner.js";
import { TestFramework } from "../src/types.js";

// Mock child_process
vi.mock("child_process", () => ({
  spawn: vi.fn(),
}));

// Mock fs
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

describe("@airiscode/runners-test - TestRunner", () => {
  let runner: TestRunner;
  let mockSpawn: any;
  let mockExistsSync: any;
  let mockReadFileSync: any;

  beforeEach(async () => {
    const { spawn } = await import("child_process");
    const { existsSync, readFileSync } = await import("fs");

    mockSpawn = spawn as any;
    mockExistsSync = existsSync as any;
    mockReadFileSync = readFileSync as any;

    runner = new TestRunner("/test/project");

    // Reset mocks
    vi.clearAllMocks();
  });

  describe("framework detection", () => {
    it("should detect vitest", async () => {
      mockExistsSync.mockReturnValueOnce(true);
      mockReadFileSync.mockReturnValueOnce(
        JSON.stringify({
          devDependencies: { vitest: "^1.0.0" },
        }),
      );

      mockSpawn.mockReturnValueOnce({
        stdout: {
          on: vi.fn((event, cb) => {
            if (event === "data") {
              cb("Tests  5 passed (5)");
            }
          }),
        },
        stderr: { on: vi.fn() },
        on: vi.fn((event, cb) => {
          if (event === "close") cb(0);
        }),
      });

      const result = await runner.run({});

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.framework).toBe(TestFramework.VITEST);
      }
    });

    it("should detect jest", async () => {
      mockExistsSync.mockReturnValueOnce(true);
      mockReadFileSync.mockReturnValueOnce(
        JSON.stringify({
          devDependencies: { jest: "^29.0.0" },
        }),
      );

      mockSpawn.mockReturnValueOnce({
        stdout: {
          on: vi.fn((event, cb) => {
            if (event === "data") cb("Tests  3 passed (3)");
          }),
        },
        stderr: { on: vi.fn() },
        on: vi.fn((event, cb) => {
          if (event === "close") cb(0);
        }),
      });

      const result = await runner.run({});

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.framework).toBe(TestFramework.JEST);
      }
    });

    it("should detect pytest", async () => {
      mockExistsSync.mockImplementation((path: string) => {
        if (path.includes("package.json")) return false;
        if (path.includes("pytest.ini")) return true;
        return false;
      });

      mockSpawn.mockReturnValueOnce({
        stdout: {
          on: vi.fn((event, cb) => {
            if (event === "data") cb("5 passed");
          }),
        },
        stderr: { on: vi.fn() },
        on: vi.fn((event, cb) => {
          if (event === "close") cb(0);
        }),
      });

      const result = await runner.run({});

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.framework).toBe(TestFramework.PYTEST);
      }
    });

    it("should detect go test", async () => {
      mockExistsSync.mockImplementation((path: string) => {
        if (path.includes("package.json")) return false;
        if (path.includes("pytest.ini")) return false;
        if (path.includes("go.mod")) return true;
        return false;
      });

      mockSpawn.mockReturnValueOnce({
        stdout: {
          on: vi.fn((event, cb) => {
            if (event === "data") cb("ok  \tmodule/package\t0.5s");
          }),
        },
        stderr: { on: vi.fn() },
        on: vi.fn((event, cb) => {
          if (event === "close") cb(0);
        }),
      });

      const result = await runner.run({});

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.framework).toBe(TestFramework.GO_TEST);
      }
    });
  });

  describe("run tests", () => {
    beforeEach(() => {
      mockExistsSync.mockReturnValueOnce(true);
      mockReadFileSync.mockReturnValueOnce(
        JSON.stringify({
          devDependencies: { vitest: "^1.0.0" },
        }),
      );
    });

    it("should run tests successfully", async () => {
      mockSpawn.mockReturnValueOnce({
        stdout: {
          on: vi.fn((event, cb) => {
            if (event === "data") {
              cb("Tests  5 passed (5)\n");
            }
          }),
        },
        stderr: { on: vi.fn() },
        on: vi.fn((event, cb) => {
          if (event === "close") cb(0);
        }),
      });

      const result = await runner.run({ framework: TestFramework.VITEST });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.success).toBe(true);
        expect(result.value.exitCode).toBe(0);
        expect(result.value.summary.passed).toBe(5);
        expect(result.value.summary.total).toBe(5);
      }
    });

    it("should handle failed tests", async () => {
      mockSpawn.mockReturnValueOnce({
        stdout: {
          on: vi.fn((event, cb) => {
            if (event === "data") {
              cb("Tests  3 passed\n2 failed\n");
            }
          }),
        },
        stderr: { on: vi.fn() },
        on: vi.fn((event, cb) => {
          if (event === "close") cb(1);
        }),
      });

      const result = await runner.run({ framework: TestFramework.VITEST });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.success).toBe(false);
        expect(result.value.exitCode).toBe(1);
        expect(result.value.summary.passed).toBe(3);
        expect(result.value.summary.failed).toBe(2);
        expect(result.value.summary.total).toBe(5);
      }
    });

    it("should run with coverage", async () => {
      mockSpawn.mockReturnValueOnce({
        stdout: {
          on: vi.fn((event, cb) => {
            if (event === "data") {
              cb(`Tests  5 passed (5)
All files      |   85.5 |   90.2 |   78.3 |   85.5 |`);
            }
          }),
        },
        stderr: { on: vi.fn() },
        on: vi.fn((event, cb) => {
          if (event === "close") cb(0);
        }),
      });

      const result = await runner.run({
        framework: TestFramework.VITEST,
        coverage: true,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.coverage).toBeDefined();
        expect(result.value.coverage?.lines.percent).toBe(85.5);
        expect(result.value.coverage?.statements.percent).toBe(90.2);
      }
    });

    it("should run with custom options", async () => {
      mockSpawn.mockReturnValueOnce({
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, cb) => {
          if (event === "close") cb(0);
        }),
      });

      await runner.run({
        framework: TestFramework.VITEST,
        files: ["src/**/*.test.ts"],
        watch: false,
        verbose: true,
        bail: true,
        grep: "should pass",
      });

      const [command, args] = mockSpawn.mock.calls[0];
      expect(command).toBe("vitest");
      expect(args).toContain("--reporter=verbose");
      expect(args).toContain("--bail");
      expect(args).toContain("--grep");
      expect(args).toContain("should pass");
      expect(args).toContain("src/**/*.test.ts");
    });
  });

  describe("framework-specific commands", () => {
    it("should build jest command", async () => {
      mockExistsSync.mockReturnValueOnce(true);
      mockReadFileSync.mockReturnValueOnce(
        JSON.stringify({ devDependencies: { jest: "^29.0.0" } }),
      );

      mockSpawn.mockReturnValueOnce({
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, cb) => {
          if (event === "close") cb(0);
        }),
      });

      await runner.run({
        coverage: true,
        verbose: true,
      });

      const [command, args] = mockSpawn.mock.calls[0];
      expect(command).toBe("jest");
      expect(args).toContain("--coverage");
      expect(args).toContain("--verbose");
    });

    it("should build mocha command", async () => {
      mockSpawn.mockReturnValueOnce({
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, cb) => {
          if (event === "close") cb(0);
        }),
      });

      await runner.run({
        framework: TestFramework.MOCHA,
        bail: true,
        grep: "integration",
        timeout: 5000,
      });

      const [command, args] = mockSpawn.mock.calls[0];
      expect(command).toBe("mocha");
      expect(args).toContain("--bail");
      expect(args).toContain("--grep");
      expect(args).toContain("integration");
      expect(args).toContain("--timeout");
      expect(args).toContain("5000");
    });

    it("should build pytest command", async () => {
      mockSpawn.mockReturnValueOnce({
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, cb) => {
          if (event === "close") cb(0);
        }),
      });

      await runner.run({
        framework: TestFramework.PYTEST,
        verbose: true,
        bail: true,
        coverage: true,
        grep: "unit",
      });

      const [command, args] = mockSpawn.mock.calls[0];
      expect(command).toBe("pytest");
      expect(args).toContain("-v");
      expect(args).toContain("-x");
      expect(args).toContain("--cov");
      expect(args).toContain("-k");
      expect(args).toContain("unit");
    });

    it("should build go test command", async () => {
      mockSpawn.mockReturnValueOnce({
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, cb) => {
          if (event === "close") cb(0);
        }),
      });

      await runner.run({
        framework: TestFramework.GO_TEST,
        verbose: true,
        coverage: true,
        grep: "TestIntegration",
        timeout: 10000,
      });

      const [command, args] = mockSpawn.mock.calls[0];
      expect(command).toBe("go");
      expect(args).toContain("test");
      expect(args).toContain("-v");
      expect(args).toContain("-cover");
      expect(args).toContain("-run");
      expect(args).toContain("TestIntegration");
      expect(args).toContain("-timeout");
      expect(args).toContain("10000ms");
    });
  });

  describe("error handling", () => {
    it("should handle missing framework", async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await runner.run({});

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("Could not detect test framework");
      }
    });
  });
});
