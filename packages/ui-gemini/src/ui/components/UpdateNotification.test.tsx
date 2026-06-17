/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from "vitest";
import { render } from "../../test-utils/render.js";
import { UpdateNotification } from "./UpdateNotification.js";

describe("UpdateNotification", () => {
  it("renders message", () => {
    const { lastFrame } = render(<UpdateNotification message="Update available!" />);
    expect(lastFrame()).toContain("Update available!");
  });
});
