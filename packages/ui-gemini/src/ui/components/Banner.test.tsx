/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from "vitest";
import { render } from "../../test-utils/render.js";
import { Banner } from "./Banner.js";

describe("Banner", () => {
  it.each([
    ["warning mode", true, "Warning Message"],
    ["info mode", false, "Info Message"],
  ])("renders in %s", (_, isWarning, text) => {
    const { lastFrame } = render(<Banner bannerText={text} isWarning={isWarning} width={80} />);
    expect(lastFrame()).toMatchSnapshot();
  });

  it("handles newlines in text", () => {
    const text = "Line 1\\nLine 2";
    const { lastFrame } = render(<Banner bannerText={text} isWarning={false} width={80} />);
    expect(lastFrame()).toMatchSnapshot();
  });
});
