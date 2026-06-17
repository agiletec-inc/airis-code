/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from "vitest";
import { getPlainTextLength } from "./InlineMarkdownRenderer.js";

describe("getPlainTextLength", () => {
  it.each([
    ["**Primary Go", 12],
    ["*Primary Go", 11],
    ["**Primary Go**", 10],
    ["*Primary Go*", 10],
    ["**", 2],
    ["*", 1],
    ["compile-time**", 14],
  ])('should measure markdown text length correctly for "%s"', (input, expected) => {
    expect(getPlainTextLength(input)).toBe(expected);
  });
});
