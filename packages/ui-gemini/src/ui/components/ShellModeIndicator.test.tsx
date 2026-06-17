/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from "vitest";
import { render } from "../../test-utils/render.js";
import { ShellModeIndicator } from "./ShellModeIndicator.js";

describe("ShellModeIndicator", () => {
  it("renders correctly", () => {
    const { lastFrame } = render(<ShellModeIndicator />);
    expect(lastFrame()).toContain("shell mode enabled");
    expect(lastFrame()).toContain("esc to disable");
  });
});
