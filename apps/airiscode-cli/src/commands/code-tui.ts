/**
 * Code command TUI integration
 *
 * Integrates the Ink-based TUI with the code command workflow.
 */

import { render } from 'ink';
import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { App } from '../ui/App.js';
import { EventEmitter } from '../events/emitter.js';

export interface TUIOptions {
  sessionId: string;
  task: string;
  debug?: boolean;
}

export async function renderTUI(options: TUIOptions): Promise<void> {
  const emitter = new EventEmitter('tui', {
    onInfo: (summary) => {
      if (options.debug) {
        console.log(`[TUI] ${summary}`);
      }
    },
  });

  const { waitUntilExit } = render(
    React.createElement(App, {
      sessionId: options.sessionId,
      task: options.task,
      emitter,
    })
  );

  await waitUntilExit();
}
