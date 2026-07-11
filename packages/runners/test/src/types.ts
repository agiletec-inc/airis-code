/**
 * Test runner types
 */

import type { Result } from "@airiscode/types";

/**
 * Test framework types
 */
export enum TestFramework {
  VITEST = "vitest",
  JEST = "jest",
  MOCHA = "mocha",
  AVA = "ava",
  PYTEST = "pytest",
  GO_TEST = "go_test",
  CARGO_TEST = "cargo_test",
}

/**
 * Test run options
 */
export interface TestRunOptions {
  /** Test framework to use */
  framework?: TestFramework;
  /** Test files or patterns */
  files?: string[];
  /** Watch mode */
  watch?: boolean;
  /** Coverage collection */
  coverage?: boolean;
  /** Verbose output */
  verbose?: boolean;
  /** Bail on first failure */
  bail?: boolean;
  /** Run only tests matching pattern */
  grep?: string;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Environment variables */
  env?: Record<string, string>;
}

/**
 * Test result status
 */
export enum TestStatus {
  PASSED = "passed",
  FAILED = "failed",
  SKIPPED = "skipped",
  TODO = "todo",
}

/**
 * Individual test result
 */
export interface TestResult {
  /** Test name */
  name: string;
  /** Test file */
  file: string;
  /** Status */
  status: TestStatus;
  /** Duration in milliseconds */
  duration: number;
  /** Error message if failed */
  error?: string;
  /** Error stack trace */
  stack?: string;
}

/**
 * Test suite result
 */
export interface TestSuiteResult {
  /** Suite name */
  name: string;
  /** Test file */
  file: string;
  /** Tests in suite */
  tests: TestResult[];
  /** Total duration */
  duration: number;
}

/**
 * Overall test run result
 */
export interface TestRunResult {
  /** Framework used */
  framework: TestFramework;
  /** Test suites */
  suites: TestSuiteResult[];
  /** Summary statistics */
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
  /** Coverage report if enabled */
  coverage?: CoverageReport;
  /** Exit code */
  exitCode: number;
  /** Success flag */
  success: boolean;
}

/**
 * Coverage report
 */
export interface CoverageReport {
  /** Lines coverage */
  lines: {
    total: number;
    covered: number;
    percent: number;
  };
  /** Statements coverage */
  statements: {
    total: number;
    covered: number;
    percent: number;
  };
  /** Functions coverage */
  functions: {
    total: number;
    covered: number;
    percent: number;
  };
  /** Branches coverage */
  branches: {
    total: number;
    covered: number;
    percent: number;
  };
  /** File coverage details */
  files?: Array<{
    path: string;
    lines: number;
    statements: number;
    functions: number;
    branches: number;
  }>;
}

/**
 * Test runner error
 */
export class TestRunnerError extends Error {
  constructor(
    message: string,
    public framework?: TestFramework,
    public cause?: Error,
  ) {
    super(message);
    this.name = "TestRunnerError";
  }
}

/**
 * Test runner result type
 */
export type TestRunResultType = Result<TestRunResult, TestRunnerError>;
