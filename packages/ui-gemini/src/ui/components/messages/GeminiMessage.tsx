/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Box, Text } from "ink";
import type React from "react";
import { useUIState } from "../../contexts/UIStateContext.js";
import { useAlternateBuffer } from "../../hooks/useAlternateBuffer.js";
import { theme } from "../../semantic-colors.js";
import { SCREEN_READER_MODEL_PREFIX } from "../../textConstants.js";
import { MarkdownDisplay } from "../../utils/MarkdownDisplay.js";

interface GeminiMessageProps {
  text: string;
  isPending: boolean;
  availableTerminalHeight?: number;
  terminalWidth: number;
}

export const GeminiMessage: React.FC<GeminiMessageProps> = ({
  text,
  isPending,
  availableTerminalHeight,
  terminalWidth,
}) => {
  const { renderMarkdown } = useUIState();
  const prefix = "✦ ";
  const prefixWidth = prefix.length;

  const isAlternateBuffer = useAlternateBuffer();
  return (
    <Box flexDirection="row">
      <Box width={prefixWidth}>
        <Text color={theme.text.accent} aria-label={SCREEN_READER_MODEL_PREFIX}>
          {prefix}
        </Text>
      </Box>
      <Box flexGrow={1} flexDirection="column">
        <MarkdownDisplay
          text={text}
          isPending={isPending}
          availableTerminalHeight={isAlternateBuffer ? undefined : availableTerminalHeight}
          terminalWidth={terminalWidth}
          renderMarkdown={renderMarkdown}
        />
      </Box>
    </Box>
  );
};
