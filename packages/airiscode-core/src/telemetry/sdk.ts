/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// No-op stub. OpenTelemetry has been removed from airiscode.
// Telemetry calls throughout the codebase are gated by isTelemetrySdkInitialized()
// which now always returns false, making them no-ops.

import type { Config } from '../config/config.js';

export function isTelemetrySdkInitialized(): boolean {
  return false;
}

export function initializeTelemetry(_config: Config): void {
  // no-op
}

export async function shutdownTelemetry(): Promise<void> {
  // no-op
}
