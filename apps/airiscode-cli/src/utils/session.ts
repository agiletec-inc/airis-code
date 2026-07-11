import * as fs from "node:fs/promises";
import { homedir } from "node:os";
import * as path from "node:path";

const SESSION_DIR = path.join(homedir(), ".airiscode", "sessions");

export async function saveSession(sessionId: string, data: unknown): Promise<void> {
  await fs.mkdir(SESSION_DIR, { recursive: true });
  await fs.writeFile(
    path.join(SESSION_DIR, `${sessionId}.json`),
    JSON.stringify(data, null, 2),
    "utf8",
  );
}

export async function listSessions(): Promise<string[]> {
  try {
    const entries = await fs.readdir(SESSION_DIR);
    return entries
      .filter((name) => name.endsWith(".json"))
      .sort()
      .reverse();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function loadSession<T = unknown>(sessionFileName: string): Promise<T> {
  const raw = await fs.readFile(path.join(SESSION_DIR, sessionFileName), "utf8");
  return JSON.parse(raw) as T;
}
