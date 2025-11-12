#!/usr/bin/env node
/**
 * @license
 * Copyright 2025 AIRIS Code
 * SPDX-License-Identifier: MIT
 */

import React from "react";
import { render } from "ink";
import { MinimalApp } from "./MinimalApp.js";
import { createContentGenerator } from "./providerFactory.js";

async function main() {
  try {
    console.log("🚀 AIRIS Code starting...");

    const contentGenerator = await createContentGenerator();
    console.log("✅ Provider configured successfully\n");

    render(<MinimalApp contentGenerator={contentGenerator} />);
  } catch (error) {
    console.error("❌ Failed to start AIRIS Code:");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
