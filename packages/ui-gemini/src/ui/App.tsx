/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useIsScreenReaderEnabled } from "ink";
import { AlternateBufferQuittingDisplay } from "./components/AlternateBufferQuittingDisplay.js";
import { QuittingDisplay } from "./components/QuittingDisplay.js";
import { StreamingContext } from "./contexts/StreamingContext.js";
import { useUIState } from "./contexts/UIStateContext.js";
import { useAlternateBuffer } from "./hooks/useAlternateBuffer.js";
import { DefaultAppLayout } from "./layouts/DefaultAppLayout.js";
import { ScreenReaderAppLayout } from "./layouts/ScreenReaderAppLayout.js";

export const App = () => {
  const uiState = useUIState();
  const isAlternateBuffer = useAlternateBuffer();
  const isScreenReaderEnabled = useIsScreenReaderEnabled();

  if (uiState.quittingMessages) {
    if (isAlternateBuffer) {
      return (
        <StreamingContext.Provider value={uiState.streamingState}>
          <AlternateBufferQuittingDisplay />
        </StreamingContext.Provider>
      );
    } else {
      return <QuittingDisplay />;
    }
  }

  return (
    <StreamingContext.Provider value={uiState.streamingState}>
      {isScreenReaderEnabled ? <ScreenReaderAppLayout /> : <DefaultAppLayout />}
    </StreamingContext.Provider>
  );
};
