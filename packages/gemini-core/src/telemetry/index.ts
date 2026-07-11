/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export enum TelemetryTarget {
  GCP = "gcp",
  LOCAL = "local",
}

const DEFAULT_TELEMETRY_TARGET = TelemetryTarget.LOCAL;
const DEFAULT_OTLP_ENDPOINT = "http://localhost:4317";

export { SpanStatusCode, ValueType } from "@opentelemetry/api";
export { SemanticAttributes } from "@opentelemetry/semantic-conventions";
export {
  ActivityDetector,
  getActivityDetector,
  isUserActive,
  recordUserActivity,
} from "./activity-detector.js";
export {
  ActivityMonitor,
  getActivityMonitor,
  initializeActivityMonitor,
  startGlobalActivityMonitoring,
  stopGlobalActivityMonitoring,
} from "./activity-monitor.js";
export { ActivityType } from "./activity-types.js";
export {
  parseBooleanEnvFlag,
  parseTelemetryTargetValue,
  resolveTelemetrySettings,
} from "./config.js";
export {
  GcpLogExporter,
  GcpMetricExporter,
  GcpTraceExporter,
} from "./gcp-exporters.js";
export { HighWaterMarkTracker } from "./high-water-mark-tracker.js";
export {
  logApiError,
  logApiRequest,
  logApiResponse,
  logChatCompression,
  logCliConfiguration,
  logConversationFinishedEvent,
  logExtensionEnable,
  logExtensionInstallEvent,
  logExtensionUninstall,
  logExtensionUpdateEvent,
  logFlashFallback,
  logSlashCommand,
  logToolCall,
  logToolOutputTruncated,
  logUserPrompt,
  logWebFetchFallbackAttempt,
} from "./loggers.js";
export type { MemorySnapshot, ProcessMetrics } from "./memory-monitor.js";
export {
  getMemoryMonitor,
  initializeMemoryMonitor,
  MemoryMonitor,
  recordCurrentMemoryUsage,
  startGlobalMemoryMonitoring,
  stopGlobalMemoryMonitoring,
} from "./memory-monitor.js";
export {
  ApiRequestPhase,
  FileOperation,
  // OpenTelemetry Semantic Convention types
  GenAiOperationName,
  GenAiProviderName,
  GenAiTokenType,
  getConventionAttributes,
  isPerformanceMonitoringActive,
  MemoryMetricType,
  // Performance monitoring types
  PerformanceMetricType,
  recordApiErrorMetrics,
  recordApiRequestBreakdown,
  recordApiResponseMetrics,
  recordBaselineComparison,
  recordContentRetry,
  recordContentRetryFailure,
  recordCpuUsage,
  recordCustomApiResponseMetrics,
  // Custom metrics for token usage and API responses
  recordCustomTokenUsageMetrics,
  recordExitFail,
  recordFileOperationMetric,
  recordFlickerFrame,
  recordGenAiClientOperationDuration,
  // OpenTelemetry GenAI semantic convention for token usage and operation duration
  recordGenAiClientTokenUsage,
  recordInvalidChunk,
  recordMemoryUsage,
  recordModelRoutingMetrics,
  recordPerformanceRegression,
  recordPerformanceScore,
  recordSlowRender,
  // Performance monitoring functions
  recordStartupPerformance,
  recordTokenEfficiency,
  recordTokenUsageMetrics,
  // Core metrics functions
  recordToolCallMetrics,
  recordToolExecutionBreakdown,
  recordToolQueueDepth,
  ToolExecutionPhase,
} from "./metrics.js";
export { RateLimiter } from "./rate-limiter.js";
export {
  initializeTelemetry,
  isTelemetrySdkInitialized,
  shutdownTelemetry,
} from "./sdk.js";
export { runInDevTraceSpan, type SpanMetadata } from "./trace.js";
export type { ChatCompressionEvent, SlashCommandEvent, TelemetryEvent } from "./types.js";
export {
  ApiErrorEvent,
  ApiRequestEvent,
  ApiResponseEvent,
  ConversationFinishedEvent,
  EndSessionEvent,
  FlashFallbackEvent,
  makeChatCompressionEvent,
  makeSlashCommandEvent,
  SlashCommandStatus,
  StartSessionEvent,
  ToolCallDecision,
  ToolCallEvent,
  ToolOutputTruncatedEvent,
  UserPromptEvent,
  WebFetchFallbackAttemptEvent,
} from "./types.js";
export * from "./uiTelemetry.js";
export { DEFAULT_OTLP_ENDPOINT, DEFAULT_TELEMETRY_TARGET };
