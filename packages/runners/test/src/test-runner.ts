/**
 * Test runner implementation
 */

import { err, ok } from "@airiscode/types";
import { spawn } from "child_process";
import type {
  CoverageReport,
  TestFramework,
  TestResult,
  TestRunnerError,
  TestRunOptions,
  TestRunResult,
  TestRunResultType,
  TestStatus,
  TestSuiteResult,
} from "./types.js";
import { TestRunnerError as TestError } from "./types.js";

/**
 * Test execution runner
 *
 * Features:
 * - Multi-framework support (Vitest, Jest, Mocha, pytest, etc.)
 * - Framework auto-detection
 * - Coverage collection
 * - Watch mode support
 * - Result parsing and normalization
 */
export class TestRunner {
  constructor(private workingDir: string) {}

  /**
   * Run tests
   */
  async run(options: TestRunOptions = {}): Promise<TestRunResultType> {
    try {
      const framework = options.framework || (await this.detectFramework());

      if (!framework) {
        return err(
          new TestError("Could not detect test framework. Please specify framework explicitly."),
        );
      }

      const { command, args } = this.buildCommand(framework, options);

      const output = await this.execCommand(command, args, options.env);

      const result = this.parseOutput(framework, output, options.coverage);

      return ok(result);
    } catch (error) {
      return err(
        new TestError(
          "Failed to run tests",
          options.framework,
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  /**
   * Auto-detect test framework
   */
  private async detectFramework(): Promise<TestFramework | null> {
    const { existsSync, readFileSync } = await import("fs");
    const { join } = await import("path");

    // Check package.json for framework dependencies
    const packageJsonPath = join(this.workingDir, "package.json");
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
      const deps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      if (deps.vitest) return TestFramework.VITEST;
      if (deps.jest || deps["@types/jest"]) return TestFramework.JEST;
      if (deps.mocha) return TestFramework.MOCHA;
      if (deps.ava) return TestFramework.AVA;
    }

    // Check for Python pytest
    const pytestConfig = join(this.workingDir, "pytest.ini");
    if (existsSync(pytestConfig)) return TestFramework.PYTEST;

    // Check for Go
    const goMod = join(this.workingDir, "go.mod");
    if (existsSync(goMod)) return TestFramework.GO_TEST;

    // Check for Rust
    const cargoToml = join(this.workingDir, "Cargo.toml");
    if (existsSync(cargoToml)) return TestFramework.CARGO_TEST;

    return null;
  }

  /**
   * Build command for framework
   */
  private buildCommand(
    framework: TestFramework,
    options: TestRunOptions,
  ): { command: string; args: string[] } {
    switch (framework) {
      case TestFramework.VITEST:
        return this.buildVitestCommand(options);
      case TestFramework.JEST:
        return this.buildJestCommand(options);
      case TestFramework.MOCHA:
        return this.buildMochaCommand(options);
      case TestFramework.AVA:
        return this.buildAvaCommand(options);
      case TestFramework.PYTEST:
        return this.buildPytestCommand(options);
      case TestFramework.GO_TEST:
        return this.buildGoTestCommand(options);
      case TestFramework.CARGO_TEST:
        return this.buildCargoTestCommand(options);
      default:
        throw new Error(`Unsupported framework: ${framework}`);
    }
  }

  private buildVitestCommand(options: TestRunOptions): { command: string; args: string[] } {
    const args = ["run"];

    if (options.watch) args.push("--watch");
    if (options.coverage) args.push("--coverage");
    if (options.verbose) args.push("--reporter=verbose");
    if (options.bail) args.push("--bail", "1");
    if (options.grep) args.push("--grep", options.grep);

    if (options.files && options.files.length > 0) {
      args.push(...options.files);
    }

    return { command: "vitest", args };
  }

  private buildJestCommand(options: TestRunOptions): { command: string; args: string[] } {
    const args: string[] = [];

    if (options.watch) args.push("--watch");
    if (options.coverage) args.push("--coverage");
    if (options.verbose) args.push("--verbose");
    if (options.bail) args.push("--bail");
    if (options.grep) args.push("--testNamePattern", options.grep);

    if (options.files && options.files.length > 0) {
      args.push(...options.files);
    }

    return { command: "jest", args };
  }

  private buildMochaCommand(options: TestRunOptions): { command: string; args: string[] } {
    const args: string[] = [];

    if (options.watch) args.push("--watch");
    if (options.bail) args.push("--bail");
    if (options.grep) args.push("--grep", options.grep);
    if (options.timeout) args.push("--timeout", options.timeout.toString());

    if (options.files && options.files.length > 0) {
      args.push(...options.files);
    } else {
      args.push("test/**/*.test.{js,ts}");
    }

    return { command: "mocha", args };
  }

  private buildAvaCommand(options: TestRunOptions): { command: string; args: string[] } {
    const args: string[] = [];

    if (options.watch) args.push("--watch");
    if (options.verbose) args.push("--verbose");
    if (options.bail) args.push("--fail-fast");
    if (options.grep) args.push("--match", options.grep);

    if (options.files && options.files.length > 0) {
      args.push(...options.files);
    }

    return { command: "ava", args };
  }

  private buildPytestCommand(options: TestRunOptions): { command: string; args: string[] } {
    const args: string[] = [];

    if (options.verbose) args.push("-v");
    if (options.bail) args.push("-x");
    if (options.grep) args.push("-k", options.grep);
    if (options.coverage) args.push("--cov");

    if (options.files && options.files.length > 0) {
      args.push(...options.files);
    }

    return { command: "pytest", args };
  }

  private buildGoTestCommand(options: TestRunOptions): { command: string; args: string[] } {
    const args = ["test"];

    if (options.verbose) args.push("-v");
    if (options.coverage) args.push("-cover");
    if (options.grep) args.push("-run", options.grep);
    if (options.timeout) args.push("-timeout", `${options.timeout}ms`);

    if (options.files && options.files.length > 0) {
      args.push(...options.files);
    } else {
      args.push("./...");
    }

    return { command: "go", args };
  }

  private buildCargoTestCommand(options: TestRunOptions): { command: string; args: string[] } {
    const args = ["test"];

    if (options.verbose) args.push("--verbose");
    if (options.grep) args.push(options.grep);

    // Cargo test doesn't support individual file selection
    // Tests are selected by name pattern

    return { command: "cargo", args };
  }

  /**
   * Execute command
   */
  private execCommand(
    command: string,
    args: string[],
    env?: Record<string, string>,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve) => {
      const proc = spawn(command, args, {
        cwd: this.workingDir,
        env: { ...process.env, ...env },
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });

      proc.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      proc.on("close", (code) => {
        resolve({ stdout, stderr, exitCode: code || 0 });
      });
    });
  }

  /**
   * Parse test output
   */
  private parseOutput(
    framework: TestFramework,
    output: { stdout: string; stderr: string; exitCode: number },
    coverageEnabled?: boolean,
  ): TestRunResult {
    // This is a simplified parser
    // In production, you'd use framework-specific parsers or JSON reporters

    const lines = output.stdout.split("\n");
    const suites: TestSuiteResult[] = [];
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let skippedTests = 0;

    // Extract test counts from output (framework-specific patterns)
    for (const line of lines) {
      // Vitest/Jest pattern: "Tests  2 passed (2)"
      const vitestMatch = line.match(/Tests\s+(\d+)\s+passed/);
      if (vitestMatch) {
        passedTests = parseInt(vitestMatch[1], 10);
        totalTests += passedTests;
      }

      // Failed tests pattern
      const failedMatch = line.match(/(\d+)\s+failed/);
      if (failedMatch) {
        failedTests = parseInt(failedMatch[1], 10);
        totalTests += failedTests;
      }

      // Skipped tests pattern
      const skippedMatch = line.match(/(\d+)\s+skipped/);
      if (skippedMatch) {
        skippedTests = parseInt(skippedMatch[1], 10);
        totalTests += skippedTests;
      }
    }

    // Parse coverage if enabled
    let coverage: CoverageReport | undefined;
    if (coverageEnabled) {
      coverage = this.parseCoverage(output.stdout);
    }

    return {
      framework,
      suites,
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        skipped: skippedTests,
        duration: 0, // Would be extracted from output
      },
      coverage,
      exitCode: output.exitCode,
      success: output.exitCode === 0,
    };
  }

  /**
   * Parse coverage report
   */
  private parseCoverage(output: string): CoverageReport {
    // Simplified coverage parsing
    // In production, parse coverage JSON reports

    const defaultCoverage = {
      total: 0,
      covered: 0,
      percent: 0,
    };

    // Look for coverage percentage patterns
    const coverageMatch = output.match(
      /All files\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)/,
    );

    if (coverageMatch) {
      return {
        lines: {
          total: 100,
          covered: Math.round(parseFloat(coverageMatch[1])),
          percent: parseFloat(coverageMatch[1]),
        },
        statements: {
          total: 100,
          covered: Math.round(parseFloat(coverageMatch[2])),
          percent: parseFloat(coverageMatch[2]),
        },
        functions: {
          total: 100,
          covered: Math.round(parseFloat(coverageMatch[3])),
          percent: parseFloat(coverageMatch[3]),
        },
        branches: {
          total: 100,
          covered: Math.round(parseFloat(coverageMatch[4])),
          percent: parseFloat(coverageMatch[4]),
        },
      };
    }

    return {
      lines: defaultCoverage,
      statements: defaultCoverage,
      functions: defaultCoverage,
      branches: defaultCoverage,
    };
  }
}
