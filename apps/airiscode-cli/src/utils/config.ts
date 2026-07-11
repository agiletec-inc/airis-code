import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { homedir } from 'node:os';

export interface LegacyCliConfig {
  plannerModel: string;
  coderModel?: string;
  [key: string]: unknown;
}

const CONFIG_DIR = path.join(homedir(), '.airiscode');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG: LegacyCliConfig = {
  plannerModel: 'qwen3.5:2b',
};

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export async function loadConfig(): Promise<LegacyCliConfig> {
  const config = await readJsonFile<Partial<LegacyCliConfig>>(CONFIG_FILE);
  return {
    ...DEFAULT_CONFIG,
    ...(config ?? {}),
  };
}

export async function saveConfig(
  updates: Partial<LegacyCliConfig>,
): Promise<LegacyCliConfig> {
  const current = await loadConfig();
  const next = {
    ...current,
    ...updates,
  };

  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(CONFIG_FILE, JSON.stringify(next, null, 2), 'utf8');

  return next;
}
