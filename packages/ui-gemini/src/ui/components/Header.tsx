/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Box } from "ink";
import type React from "react";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { getTerminalProgram } from "../utils/terminalSetup.js";
import { getAsciiArtWidth } from "../utils/textUtils.js";
import {
  longAsciiLogo,
  longAsciiLogoIde,
  shortAsciiLogo,
  shortAsciiLogoIde,
  tinyAsciiLogo,
  tinyAsciiLogoIde,
} from "./AsciiArt.js";
import { ThemedGradient } from "./ThemedGradient.js";

interface HeaderProps {
  customAsciiArt?: string; // For user-defined ASCII art
  version: string;
  nightly: boolean;
}

export const Header: React.FC<HeaderProps> = ({ customAsciiArt, version, nightly }) => {
  const { columns: terminalWidth } = useTerminalSize();
  const isIde = getTerminalProgram();
  let displayTitle;
  const widthOfLongLogo = getAsciiArtWidth(longAsciiLogo);
  const widthOfShortLogo = getAsciiArtWidth(shortAsciiLogo);

  if (customAsciiArt) {
    displayTitle = customAsciiArt;
  } else if (terminalWidth >= widthOfLongLogo) {
    displayTitle = isIde ? longAsciiLogoIde : longAsciiLogo;
  } else if (terminalWidth >= widthOfShortLogo) {
    displayTitle = isIde ? shortAsciiLogoIde : shortAsciiLogo;
  } else {
    displayTitle = isIde ? tinyAsciiLogoIde : tinyAsciiLogo;
  }

  const artWidth = getAsciiArtWidth(displayTitle);

  return (
    <Box alignItems="flex-start" width={artWidth} flexShrink={0} flexDirection="column">
      <ThemedGradient>{displayTitle}</ThemedGradient>
      {nightly && (
        <Box width="100%" flexDirection="row" justifyContent="flex-end">
          <ThemedGradient>v{version}</ThemedGradient>
        </Box>
      )}
    </Box>
  );
};
