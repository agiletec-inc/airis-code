/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockCommandContext } from "../../test-utils/mockCommandContext.js";
import { corgiCommand } from "./corgiCommand.js";
import { type CommandContext } from "./types.js";

describe("corgiCommand", () => {
  let mockContext: CommandContext;

  beforeEach(() => {
    mockContext = createMockCommandContext();
    vi.spyOn(mockContext.ui, "toggleCorgiMode");
  });

  it("should call the toggleCorgiMode function on the UI context", async () => {
    if (!corgiCommand.action) {
      throw new Error("The corgi command must have an action.");
    }

    await corgiCommand.action(mockContext, "");

    expect(mockContext.ui.toggleCorgiMode).toHaveBeenCalledTimes(1);
  });

  it("should have the correct name and description", () => {
    expect(corgiCommand.name).toBe("corgi");
    expect(corgiCommand.description).toBe("Toggles corgi mode");
  });
});
