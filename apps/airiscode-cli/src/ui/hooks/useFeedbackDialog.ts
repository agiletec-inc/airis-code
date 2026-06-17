import * as fs from "node:fs";
import {
  type Config,
  createDebugLogger,
  isNodeError,
  logUserFeedback,
  UserFeedbackEvent,
  type UserFeedbackRating,
} from "@airiscode/core";
import { useCallback, useEffect, useState } from "react";
import stripJsonComments from "strip-json-comments";
import { type LoadedSettings, SettingScope, USER_SETTINGS_PATH } from "../../config/settings.js";
import type { SessionStatsState } from "../contexts/SessionContext.js";
import { FEEDBACK_OPTIONS } from "../FeedbackDialog.js";
import { type HistoryItem, MessageType, StreamingState } from "../types.js";

const debugLogger = createDebugLogger("FEEDBACK_DIALOG");
// Auto-prompted feedback dialog removed with Qwen OAuth. Helpers below are stubs
// so existing imports continue to resolve; the dialog is only shown manually now.
void debugLogger;
void fs;
void USER_SETTINGS_PATH;
void stripJsonComments;
void isNodeError;
void MessageType;

export interface UseFeedbackDialogProps {
  config: Config;
  settings: LoadedSettings;
  streamingState: StreamingState;
  history: HistoryItem[];
  sessionStats: SessionStatsState;
}

export const useFeedbackDialog = ({
  config,
  settings,
  streamingState,
  history,
  sessionStats,
}: UseFeedbackDialogProps) => {
  // Feedback dialog state
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [isFeedbackDismissedTemporarily, setIsFeedbackDismissedTemporarily] = useState(false);

  const openFeedbackDialog = useCallback(() => {
    setIsFeedbackDialogOpen(true);
  }, []);

  const closeFeedbackDialog = useCallback(() => setIsFeedbackDialogOpen(false), []);

  const temporaryCloseFeedbackDialog = useCallback(() => {
    setIsFeedbackDialogOpen(false);
    setIsFeedbackDismissedTemporarily(true);
  }, []);

  const submitFeedback = useCallback(
    (rating: number) => {
      // Only create and log feedback event for ratings 1-3 (GOOD, BAD, FINE)
      // Rating 0 (DISMISS) should not trigger any telemetry
      if (rating >= FEEDBACK_OPTIONS.GOOD && rating <= FEEDBACK_OPTIONS.FINE) {
        const feedbackEvent = new UserFeedbackEvent(
          sessionStats.sessionId,
          rating as UserFeedbackRating,
          config.getModel(),
          config.getApprovalMode(),
        );

        logUserFeedback(config, feedbackEvent);
      }

      // Record the timestamp when feedback dialog is submitted
      settings.setValue(SettingScope.User, "ui.feedbackLastShownTimestamp", Date.now());

      closeFeedbackDialog();
    },
    [closeFeedbackDialog, sessionStats.sessionId, config, settings],
  );

  useEffect(() => {
    // Qwen OAuth feedback dialog removed; feedback prompts no longer auto-open.
    // Conditions previously required QWEN_OAUTH auth + telemetry + enableUserFeedback,
    // but the OAuth flow is gone in this fork.
    void streamingState;
    void history;
    void sessionStats;
    void config;
    void settings;
    void openFeedbackDialog;
    void isFeedbackDismissedTemporarily;
  }, [
    streamingState,
    history,
    sessionStats,
    isFeedbackDialogOpen,
    isFeedbackDismissedTemporarily,
    openFeedbackDialog,
    settings.merged.ui?.enableUserFeedback,
    config,
  ]);

  // Reset temporary dismissal when a new AI response starts streaming
  useEffect(() => {
    if (streamingState === StreamingState.Responding && isFeedbackDismissedTemporarily) {
      setIsFeedbackDismissedTemporarily(false);
    }
  }, [streamingState, isFeedbackDismissedTemporarily]);

  return {
    isFeedbackDialogOpen,
    openFeedbackDialog,
    closeFeedbackDialog,
    temporaryCloseFeedbackDialog,
    submitFeedback,
  };
};
