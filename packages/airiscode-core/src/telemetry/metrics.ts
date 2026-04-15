/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// No-op stub. OpenTelemetry has been removed from airiscode-core.
// Functions preserved for API compatibility with existing call sites that are
// gated by isTelemetrySdkInitialized() returning false.

import { SERVICE_NAME, EVENT_CHAT_COMPRESSION } from './constants.js';
import type { Config } from '../config/config.js';
import type { ModelSlashCommandEvent } from './types.js';

export const SUBAGENT_EXECUTION_COUNT = `${SERVICE_NAME}.subagent.execution.count`;

// Public type used by callers to look up attribute shapes by metric name.
// Now a permissive map since the underlying OpenTelemetry-typed registry has
// been removed.
export type MetricDefinitions = Record<
  string,
  {
    attributes: Record<string, unknown>;
  }
>;

export enum FileOperation {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
}

export enum PerformanceMetricType {
  STARTUP = 'startup',
  MEMORY = 'memory',
  CPU = 'cpu',
  TOOL_EXECUTION = 'tool_execution',
  API_REQUEST = 'api_request',
  TOKEN_EFFICIENCY = 'token_efficiency',
}

export enum MemoryMetricType {
  HEAP_USED = 'heap_used',
  HEAP_TOTAL = 'heap_total',
  EXTERNAL = 'external',
  RSS = 'rss',
}

export enum ToolExecutionPhase {
  VALIDATION = 'validation',
  PREPARATION = 'preparation',
  EXECUTION = 'execution',
  RESULT_PROCESSING = 'result_processing',
}

export enum ApiRequestPhase {
  REQUEST_PREPARATION = 'request_preparation',
  NETWORK_LATENCY = 'network_latency',
  RESPONSE_PROCESSING = 'response_processing',
  TOKEN_PROCESSING = 'token_processing',
}

// `Meter` shape kept loose so that existing callers that store the result do
// not need to import an OpenTelemetry type.
export function getMeter(): undefined {
  return undefined;
}

export function initializeMetrics(_config: Config): void {
  return;
}

export function recordChatCompressionMetrics(
  _config: Config,
  _attributes: { tokens_before: number; tokens_after: number },
): void {
  return;
}

export function recordToolCallMetrics(
  _config: Config,
  _durationMs: number,
  _attributes: {
    function_name: string;
    success: boolean;
    decision?: 'accept' | 'reject' | 'modify' | 'auto_accept';
    tool_type?: 'native' | 'mcp';
  },
): void {
  return;
}

export function recordTokenUsageMetrics(
  _config: Config,
  _tokenCount: number,
  _attributes: {
    model: string;
    type: 'input' | 'output' | 'thought' | 'cache' | 'tool';
  },
): void {
  return;
}

export function recordApiResponseMetrics(
  _config: Config,
  _durationMs: number,
  _attributes: {
    model: string;
    status_code?: number | string;
    error_type?: string;
  },
): void {
  return;
}

export function recordApiErrorMetrics(
  _config: Config,
  _durationMs: number,
  _attributes: {
    model: string;
    status_code?: number | string;
    error_type?: string;
  },
): void {
  return;
}

export function recordFileOperationMetric(
  _config: Config,
  _attributes: {
    operation: FileOperation;
    lines?: number;
    mimetype?: string;
    extension?: string;
    programming_language?: string;
  },
): void {
  return;
}

/**
 * Records a metric for when an invalid chunk is received from a stream.
 */
export function recordInvalidChunk(_config: Config): void {
  return;
}

/**
 * Records a metric for when a retry is triggered due to a content error.
 */
export function recordContentRetry(_config: Config): void {
  return;
}

/**
 * Records a metric for when all content error retries have failed for a request.
 */
export function recordContentRetryFailure(_config: Config): void {
  return;
}

export function recordModelSlashCommand(
  _config: Config,
  _event: ModelSlashCommandEvent,
): void {
  return;
}

// Performance Monitoring Functions

export function initializePerformanceMonitoring(_config: Config): void {
  return;
}

export function recordStartupPerformance(
  _config: Config,
  _durationMs: number,
  _attributes: {
    phase: string;
    details?: Record<string, string | number | boolean>;
  },
): void {
  return;
}

export function recordMemoryUsage(
  _config: Config,
  _bytes: number,
  _attributes: {
    memory_type: MemoryMetricType;
    component?: string;
  },
): void {
  return;
}

export function recordCpuUsage(
  _config: Config,
  _percentage: number,
  _attributes: {
    component?: string;
  },
): void {
  return;
}

export function recordToolQueueDepth(
  _config: Config,
  _queueDepth: number,
): void {
  return;
}

export function recordToolExecutionBreakdown(
  _config: Config,
  _durationMs: number,
  _attributes: {
    function_name: string;
    phase: ToolExecutionPhase;
  },
): void {
  return;
}

export function recordTokenEfficiency(
  _config: Config,
  _value: number,
  _attributes: {
    model: string;
    metric: string;
    context?: string;
  },
): void {
  return;
}

export function recordApiRequestBreakdown(
  _config: Config,
  _durationMs: number,
  _attributes: {
    model: string;
    phase: ApiRequestPhase;
  },
): void {
  return;
}

export function recordPerformanceScore(
  _config: Config,
  _score: number,
  _attributes: {
    category: string;
    baseline?: number;
  },
): void {
  return;
}

export function recordPerformanceRegression(
  _config: Config,
  _attributes: {
    metric: string;
    severity: 'low' | 'medium' | 'high';
    current_value: number;
    baseline_value: number;
  },
): void {
  return;
}

export function recordBaselineComparison(
  _config: Config,
  _attributes: {
    metric: string;
    category: string;
    current_value: number;
    baseline_value: number;
  },
): void {
  return;
}

// Utility function to check if performance monitoring is enabled.
export function isPerformanceMonitoringActive(): boolean {
  return false;
}

/**
 * Records a metric for subagent execution events.
 */
export function recordSubagentExecutionMetrics(
  _config: Config,
  _subagentName: string,
  _status: 'started' | 'completed' | 'failed' | 'cancelled',
  _terminateReason?: string,
): void {
  return;
}

// Arena Metric Recording Functions

export function recordArenaSessionStartedMetrics(_config: Config): void {
  return;
}

export function recordArenaAgentCompletedMetrics(
  _config: Config,
  _modelId: string,
  _status: string,
  _durationMs: number,
  _inputTokens: number,
  _outputTokens: number,
): void {
  return;
}

export function recordArenaSessionEndedMetrics(
  _config: Config,
  _status: string,
  _displayBackend?: string,
  _durationMs?: number,
  _winnerModelId?: string,
): void {
  return;
}

// Re-exported event constant kept so existing imports `import { EVENT_CHAT_COMPRESSION }` from this module still resolve
// (no consumer currently imports it from here, but it was effectively used as
// a key into the metric definitions table; preserve as re-export for safety).
export { EVENT_CHAT_COMPRESSION };
