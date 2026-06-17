/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../../test-utils/render.js";
import { type UIState, useUIState } from "../contexts/UIStateContext.js";
import { ExitWarning } from "./ExitWarning.js";

vi.mock("../contexts/UIStateContext.js");

describe("ExitWarning", () => {
  const mockUseUIState = vi.mocked(useUIState);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing by default", () => {
    mockUseUIState.mockReturnValue({
      dialogsVisible: false,
      ctrlCPressedOnce: false,
      ctrlDPressedOnce: false,
    } as unknown as UIState);
    const { lastFrame } = render(<ExitWarning />);
    expect(lastFrame()).toBe("");
  });

  it("renders Ctrl+C warning when pressed once and dialogs visible", () => {
    mockUseUIState.mockReturnValue({
      dialogsVisible: true,
      ctrlCPressedOnce: true,
      ctrlDPressedOnce: false,
    } as unknown as UIState);
    const { lastFrame } = render(<ExitWarning />);
    expect(lastFrame()).toContain("Press Ctrl+C again to exit");
  });

  it("renders Ctrl+D warning when pressed once and dialogs visible", () => {
    mockUseUIState.mockReturnValue({
      dialogsVisible: true,
      ctrlCPressedOnce: false,
      ctrlDPressedOnce: true,
    } as unknown as UIState);
    const { lastFrame } = render(<ExitWarning />);
    expect(lastFrame()).toContain("Press Ctrl+D again to exit");
  });

  it("renders nothing if dialogs are not visible", () => {
    mockUseUIState.mockReturnValue({
      dialogsVisible: false,
      ctrlCPressedOnce: true,
      ctrlDPressedOnce: true,
    } as unknown as UIState);
    const { lastFrame } = render(<ExitWarning />);
    expect(lastFrame()).toBe("");
  });
});
