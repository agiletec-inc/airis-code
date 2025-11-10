/**
 * TUI Event Bindings - Maps EventKind to UI component updates
 *
 * This module defines which UI panels/components should be updated
 * in response to specific event kinds.
 */

import { EventKind } from '@airiscode/api/gen/ts/airiscode/v1/events';

export interface UIComponents {
  diffPanel: {
    update: (data: unknown) => void;
  };
  testPanel: {
    update: (data: unknown) => void;
  };
  logPanel: {
    info: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
  };
  badges: {
    flash: (badge: string) => void;
  };
  statusBar: {
    setPhase: (phase: string) => void;
  };
}

/**
 * Event-to-component binding map
 */
export function createEventBindings(ui: UIComponents) {
  return {
    [EventKind.EVENT_SESSION_START]: (summary: string) => {
      ui.statusBar.setPhase('initializing');
      ui.logPanel.info(summary);
    },

    [EventKind.EVENT_ADAPTER_SPAWN]: (summary: string) => {
      ui.statusBar.setPhase('spawning adapters');
      ui.logPanel.info(summary);
    },

    [EventKind.EVENT_TOOL_CALL]: (summary: string, data: unknown) => {
      ui.logPanel.info(summary);
    },

    [EventKind.EVENT_GUARD_BLOCK]: (summary: string) => {
      ui.badges.flash('GUARD');
      ui.logPanel.warn(`🛡️  ${summary}`);
    },

    [EventKind.EVENT_DIFF_READY]: (summary: string, data: unknown) => {
      ui.diffPanel.update(data);
      ui.statusBar.setPhase('diff ready');
      ui.logPanel.info(summary);
    },

    [EventKind.EVENT_TEST_START]: (summary: string) => {
      ui.statusBar.setPhase('testing');
      ui.logPanel.info(summary);
    },

    [EventKind.EVENT_TEST_RESULT]: (summary: string, data: unknown) => {
      ui.testPanel.update(data);
      ui.statusBar.setPhase('test complete');
      ui.logPanel.info(summary);
    },

    [EventKind.EVENT_COMMIT]: (summary: string) => {
      ui.statusBar.setPhase('committed');
      ui.logPanel.info(`✅ ${summary}`);
    },

    [EventKind.EVENT_ERROR]: (summary: string) => {
      ui.statusBar.setPhase('error');
      ui.logPanel.error(`❌ ${summary}`);
    },

    [EventKind.EVENT_SESSION_END]: (summary: string) => {
      ui.statusBar.setPhase('complete');
      ui.logPanel.info(summary);
    },
  };
}

/**
 * TUI hotkey bindings
 */
export const HOTKEYS = {
  QUIT: 'q',
  APPROVE: 'y',
  REJECT: 'n',
  TOGGLE_DIFF: 'd',
  TOGGLE_LOGS: 'l',
  TOGGLE_TESTS: 't',
  COPY_COMMAND: 'c',
  HELP: '?',
} as const;

export interface HotkeyHandler {
  onQuit: () => void;
  onApprove: () => void;
  onReject: () => void;
  onToggleDiff: () => void;
  onToggleLogs: () => void;
  onToggleTests: () => void;
  onCopyCommand: () => void;
  onHelp: () => void;
}

/**
 * Hotkey dispatcher
 */
export function handleKeypress(
  key: string,
  handlers: HotkeyHandler
): boolean {
  switch (key) {
    case HOTKEYS.QUIT:
      handlers.onQuit();
      return true;
    case HOTKEYS.APPROVE:
      handlers.onApprove();
      return true;
    case HOTKEYS.REJECT:
      handlers.onReject();
      return true;
    case HOTKEYS.TOGGLE_DIFF:
      handlers.onToggleDiff();
      return true;
    case HOTKEYS.TOGGLE_LOGS:
      handlers.onToggleLogs();
      return true;
    case HOTKEYS.TOGGLE_TESTS:
      handlers.onToggleTests();
      return true;
    case HOTKEYS.COPY_COMMAND:
      handlers.onCopyCommand();
      return true;
    case HOTKEYS.HELP:
      handlers.onHelp();
      return true;
    default:
      return false;
  }
}
