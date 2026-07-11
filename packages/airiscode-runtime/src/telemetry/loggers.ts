/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// No-op stub. OpenTelemetry has been removed from airiscode-runtime.
// Functions preserved for API compatibility with existing call sites that are
// gated by isTelemetrySdkInitialized() returning false.

import type { Config } from '../config/config.js';
import { isInternalPromptId } from '../utils/internalPromptIds.js';
import {
  EVENT_API_ERROR,
  EVENT_API_CANCEL,
  EVENT_API_RESPONSE,
  EVENT_TOOL_CALL,
  EVENT_USER_FEEDBACK,
} from './constants.js';
import type {
  ApiErrorEvent,
  ApiCancelEvent,
  ApiRequestEvent,
  ApiResponseEvent,
  FileOperationEvent,
  IdeConnectionEvent,
  StartSessionEvent,
  ToolCallEvent,
  UserPromptEvent,
  UserRetryEvent,
  FlashFallbackEvent,
  NextSpeakerCheckEvent,
  LoopDetectedEvent,
  LoopDetectionDisabledEvent,
  SlashCommandEvent,
  ConversationFinishedEvent,
  KittySequenceOverflowEvent,
  ChatCompressionEvent,
  ContentRetryEvent,
  ContentRetryFailureEvent,
  RipgrepFallbackEvent,
  ToolOutputTruncatedEvent,
  ExtensionDisableEvent,
  ExtensionEnableEvent,
  ExtensionUninstallEvent,
  ExtensionUpdateEvent,
  ExtensionInstallEvent,
  ModelSlashCommandEvent,
  SubagentExecutionEvent,
  MalformedJsonResponseEvent,
  InvalidChunkEvent,
  AuthEvent,
  SkillLaunchEvent,
  UserFeedbackEvent,
  ArenaSessionStartedEvent,
  ArenaAgentCompletedEvent,
  ArenaSessionEndedEvent,
  PromptSuggestionEvent,
  SpeculationEvent,
} from './types.js';
import type { HookCallEvent } from './types.js';
import type { UiEvent } from './uiTelemetry.js';
import { uiTelemetryService } from './uiTelemetry.js';

// Minimal attribute bag retained for internal use only.
type LogAttributes = Record<string, unknown>;

function getCommonAttributes(config: Config): LogAttributes {
  return {
    'session.id': config.getSessionId(),
  };
}

export { getCommonAttributes };

export function logStartSession(
  _config: Config,
  _event: StartSessionEvent,
): void {
  return;
}

export function logUserPrompt(_config: Config, _event: UserPromptEvent): void {
  return;
}

export function logUserRetry(_config: Config, _event: UserRetryEvent): void {
  return;
}

export function logToolCall(config: Config, event: ToolCallEvent): void {
  // Preserve the UI telemetry side effects since they are independent of OTel.
  const uiEvent = {
    ...event,
    'event.name': EVENT_TOOL_CALL,
    'event.timestamp': new Date().toISOString(),
  } as UiEvent;
  uiTelemetryService.addEvent(uiEvent);
  if (!isInternalPromptId(event.prompt_id)) {
    config.getChatRecordingService()?.recordUiTelemetryEvent(uiEvent);
  }
}

export function logToolOutputTruncated(
  _config: Config,
  _event: ToolOutputTruncatedEvent,
): void {
  return;
}

export function logFileOperation(
  _config: Config,
  _event: FileOperationEvent,
): void {
  return;
}

export function logApiRequest(_config: Config, _event: ApiRequestEvent): void {
  return;
}

export function logFlashFallback(
  _config: Config,
  _event: FlashFallbackEvent,
): void {
  return;
}

export function logRipgrepFallback(
  _config: Config,
  _event: RipgrepFallbackEvent,
): void {
  return;
}

export function logApiError(config: Config, event: ApiErrorEvent): void {
  // Preserve the UI telemetry side effects since they are independent of OTel.
  const uiEvent = {
    ...event,
    'event.name': EVENT_API_ERROR,
    'event.timestamp': new Date().toISOString(),
  } as UiEvent;
  uiTelemetryService.addEvent(uiEvent);
  if (!isInternalPromptId(event.prompt_id)) {
    config.getChatRecordingService()?.recordUiTelemetryEvent(uiEvent);
  }
}

export function logApiCancel(_config: Config, event: ApiCancelEvent): void {
  // Preserve the UI telemetry side effects since they are independent of OTel.
  const uiEvent = {
    ...event,
    'event.name': EVENT_API_CANCEL,
    'event.timestamp': new Date().toISOString(),
  } as UiEvent;
  uiTelemetryService.addEvent(uiEvent);
}

export function logApiResponse(config: Config, event: ApiResponseEvent): void {
  // Preserve the UI telemetry side effects since they are independent of OTel.
  const uiEvent = {
    ...event,
    'event.name': EVENT_API_RESPONSE,
    'event.timestamp': new Date().toISOString(),
  } as UiEvent;
  uiTelemetryService.addEvent(uiEvent);
  if (!isInternalPromptId(event.prompt_id)) {
    config.getChatRecordingService()?.recordUiTelemetryEvent(uiEvent);
  }
}

export function logLoopDetected(
  _config: Config,
  _event: LoopDetectedEvent,
): void {
  return;
}

export function logLoopDetectionDisabled(
  _config: Config,
  _event: LoopDetectionDisabledEvent,
): void {
  return;
}

export function logNextSpeakerCheck(
  _config: Config,
  _event: NextSpeakerCheckEvent,
): void {
  return;
}

export function logSlashCommand(
  _config: Config,
  _event: SlashCommandEvent,
): void {
  return;
}

export function logIdeConnection(
  _config: Config,
  _event: IdeConnectionEvent,
): void {
  return;
}

export function logConversationFinishedEvent(
  _config: Config,
  _event: ConversationFinishedEvent,
): void {
  return;
}

export function logChatCompression(
  _config: Config,
  _event: ChatCompressionEvent,
): void {
  return;
}

export function logKittySequenceOverflow(
  _config: Config,
  _event: KittySequenceOverflowEvent,
): void {
  return;
}

export function logMalformedJsonResponse(
  _config: Config,
  _event: MalformedJsonResponseEvent,
): void {
  return;
}

export function logInvalidChunk(
  _config: Config,
  _event: InvalidChunkEvent,
): void {
  return;
}

export function logContentRetry(
  _config: Config,
  _event: ContentRetryEvent,
): void {
  return;
}

export function logContentRetryFailure(
  _config: Config,
  _event: ContentRetryFailureEvent,
): void {
  return;
}

export function logSubagentExecution(
  _config: Config,
  _event: SubagentExecutionEvent,
): void {
  return;
}

export function logModelSlashCommand(
  _config: Config,
  _event: ModelSlashCommandEvent,
): void {
  return;
}

export function logHookCall(_config: Config, _event: HookCallEvent): void {
  return;
}

export function logExtensionInstallEvent(
  _config: Config,
  _event: ExtensionInstallEvent,
): void {
  return;
}

export function logExtensionUninstall(
  _config: Config,
  _event: ExtensionUninstallEvent,
): void {
  return;
}

export async function logExtensionUpdateEvent(
  _config: Config,
  _event: ExtensionUpdateEvent,
): Promise<void> {
  return Promise.resolve();
}

export function logExtensionEnable(
  _config: Config,
  _event: ExtensionEnableEvent,
): void {
  return;
}

export function logExtensionDisable(
  _config: Config,
  _event: ExtensionDisableEvent,
): void {
  return;
}

export function logAuth(_config: Config, _event: AuthEvent): void {
  return;
}

export function logSkillLaunch(
  _config: Config,
  _event: SkillLaunchEvent,
): void {
  return;
}

export function logUserFeedback(
  config: Config,
  event: UserFeedbackEvent,
): void {
  // Preserve the UI telemetry side effects since they are independent of OTel.
  const uiEvent = {
    ...event,
    'event.name': EVENT_USER_FEEDBACK,
    'event.timestamp': new Date().toISOString(),
  } as UiEvent;
  uiTelemetryService.addEvent(uiEvent);
  config.getChatRecordingService()?.recordUiTelemetryEvent(uiEvent);
}

export function logArenaSessionStarted(
  _config: Config,
  _event: ArenaSessionStartedEvent,
): void {
  return;
}

export function logArenaAgentCompleted(
  _config: Config,
  _event: ArenaAgentCompletedEvent,
): void {
  return;
}

export function logArenaSessionEnded(
  _config: Config,
  _event: ArenaSessionEndedEvent,
): void {
  return;
}

export function logPromptSuggestion(
  _config: Config,
  _event: PromptSuggestionEvent,
): void {
  return;
}

export function logSpeculation(
  _config: Config,
  _event: SpeculationEvent,
): void {
  return;
}
