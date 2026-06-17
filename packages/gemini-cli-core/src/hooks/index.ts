/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// Export hook trigger functions
export {
  firePreCompressHook,
  fireSessionEndHook,
  fireSessionStartHook,
} from "../core/sessionHookTriggers.js";
export type { AggregatedHookResult } from "./hookAggregator.js";
export { HookAggregator } from "./hookAggregator.js";
export { HookEventHandler } from "./hookEventHandler.js";
export type { HookEventContext } from "./hookPlanner.js";
export { HookPlanner } from "./hookPlanner.js";
// Export interfaces and enums
export type { HookRegistryEntry } from "./hookRegistry.js";
export { ConfigSource, HookRegistry } from "./hookRegistry.js";
export { HookRunner } from "./hookRunner.js";
// Export core components
export { HookSystem } from "./hookSystem.js";
// Export types
export * from "./types.js";
