/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// Represents a single key press combination
export interface KeyBinding {
  key?: string;
  sequence?: string;
  ctrl?: boolean;
  shift?: boolean;
  command?: boolean;
  paste?: boolean;
}

// Enum for all possible commands
export enum Command {
  // TODO: Add commands here
}

// Maps commands to one or more key bindings
export type KeyBindingConfig = {
  [C in Command]: KeyBinding[];
};

// Default key bindings configuration
export const defaultKeyBindings: KeyBindingConfig = {} as KeyBindingConfig;
