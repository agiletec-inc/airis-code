/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPackageJson } from "./package.js";
import { getVersion } from "./version.js";

vi.mock("./package.js", () => ({
  getPackageJson: vi.fn(),
}));

describe("version", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    vi.mocked(getPackageJson).mockResolvedValue({ version: "1.0.0" });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return CLI_VERSION from env if set", async () => {
    process.env["CLI_VERSION"] = "2.0.0";
    const version = await getVersion();
    expect(version).toBe("2.0.0");
  });

  it("should return version from package.json if CLI_VERSION is not set", async () => {
    delete process.env["CLI_VERSION"];
    const version = await getVersion();
    expect(version).toBe("1.0.0");
  });

  it('should return "unknown" if package.json is not found and CLI_VERSION is not set', async () => {
    delete process.env["CLI_VERSION"];
    vi.mocked(getPackageJson).mockResolvedValue(undefined);
    const version = await getVersion();
    expect(version).toBe("unknown");
  });
});
