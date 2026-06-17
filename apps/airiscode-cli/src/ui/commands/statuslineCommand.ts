/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import { t } from "../../i18n/index.js";
import type { SlashCommand, SubmitPromptActionReturn } from "./types.js";
import { CommandKind } from "./types.js";

export const statuslineCommand: SlashCommand = {
  name: "statusline",
  get description() {
    return t("Set up AIRIS Code's status line UI");
  },
  kind: CommandKind.BUILT_IN,
  action: (_context, args): SubmitPromptActionReturn => {
    const prompt = args.trim() || "Configure my statusLine from my shell PS1 configuration";
    return {
      type: "submit_prompt",
      content: [
        {
          text: `Use the Agent tool with subagent_type: "statusline-setup" and this prompt:\n\n${prompt}`,
        },
      ],
    };
  },
};
