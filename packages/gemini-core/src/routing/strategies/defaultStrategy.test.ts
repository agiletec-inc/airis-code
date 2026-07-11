/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from "vitest";
import type { Config } from "../../config/config.js";
import { DEFAULT_GEMINI_MODEL } from "../../config/models.js";
import type { BaseLlmClient } from "../../core/baseLlmClient.js";
import type { RoutingContext } from "../routingStrategy.js";
import { DefaultStrategy } from "./defaultStrategy.js";

describe("DefaultStrategy", () => {
  it("should always route to the default Gemini model", async () => {
    const strategy = new DefaultStrategy();
    const mockContext = {} as RoutingContext;
    const mockConfig = {} as Config;
    const mockClient = {} as BaseLlmClient;

    const decision = await strategy.route(mockContext, mockConfig, mockClient);

    expect(decision).toEqual({
      model: DEFAULT_GEMINI_MODEL,
      metadata: {
        source: "default",
        latencyMs: 0,
        reasoning: `Routing to default model: ${DEFAULT_GEMINI_MODEL}`,
      },
    });
  });
});
