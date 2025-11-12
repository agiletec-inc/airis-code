/**
 * @license
 * Copyright 2025 AIRIS Code
 * SPDX-License-Identifier: MIT
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface SessionMetadata {
  sessionId: string;
  startedAt: number;
  messageCount: number;
}

export class SessionStorage {
  private sessionId: string;
  private sessionDir: string;
  private sessionFile: string;

  constructor(sessionId?: string) {
    this.sessionId = sessionId || `session-${Date.now()}`;
    this.sessionDir = path.join(os.homedir(), ".airiscode", "sessions");
    this.sessionFile = path.join(this.sessionDir, `${this.sessionId}.jsonl`);

    // Ensure sessions directory exists
    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }
  }

  getSessionId(): string {
    return this.sessionId;
  }

  appendMessage(message: Message): void {
    const line = JSON.stringify(message) + "\n";
    fs.appendFileSync(this.sessionFile, line, "utf8");
  }

  loadMessages(): Message[] {
    if (!fs.existsSync(this.sessionFile)) {
      return [];
    }

    const content = fs.readFileSync(this.sessionFile, "utf8");
    const lines = content.trim().split("\n").filter((line) => line.length > 0);

    return lines.map((line) => JSON.parse(line) as Message);
  }

  listSessions(): SessionMetadata[] {
    if (!fs.existsSync(this.sessionDir)) {
      return [];
    }

    const files = fs.readdirSync(this.sessionDir);
    const sessions: SessionMetadata[] = [];

    for (const file of files) {
      if (!file.endsWith(".jsonl")) continue;

      const filePath = path.join(this.sessionDir, file);
      const content = fs.readFileSync(filePath, "utf8");
      const lines = content.trim().split("\n").filter((line) => line.length > 0);

      if (lines.length === 0) continue;

      const firstMessage = JSON.parse(lines[0]) as Message;
      const sessionId = file.replace(".jsonl", "");

      sessions.push({
        sessionId,
        startedAt: firstMessage.timestamp,
        messageCount: lines.length,
      });
    }

    // Sort by most recent first
    return sessions.sort((a, b) => b.startedAt - a.startedAt);
  }

  deleteSession(): void {
    if (fs.existsSync(this.sessionFile)) {
      fs.unlinkSync(this.sessionFile);
    }
  }
}
