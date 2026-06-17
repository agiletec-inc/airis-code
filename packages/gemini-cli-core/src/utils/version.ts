/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPackageJson } from "./package.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function getVersion(): Promise<string> {
  const pkgJson = await getPackageJson(__dirname);
  return process.env["CLI_VERSION"] || pkgJson?.version || "unknown";
}
