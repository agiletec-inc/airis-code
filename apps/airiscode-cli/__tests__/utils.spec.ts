import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";

vi.mock("node:os", () => ({
  homedir: () => "/mock/home",
  default: {
    homedir: () => "/mock/home"
  }
}));

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  readdir: vi.fn(),
  mkdir: vi.fn()
}));

import { loadConfig, saveConfig } from "../src/utils/config.js";
import { saveSession, listSessions, loadSession } from "../src/utils/session.js";

describe("CLI Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Config Utility", () => {
    it("should load default config when file does not exist", async () => {
      vi.mocked(fs.readFile).mockRejectedValue(Object.assign(new Error("File not found"), { code: "ENOENT" }));
      const config = await loadConfig();
      expect(config.plannerModel).toBe("qwen3.5:2b");
    });

    it("should save and merge config", async () => {
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ plannerModel: "new-model" }));
      const updated = await saveConfig({ coderModel: "coder-9b" });
      
      expect(updated.plannerModel).toBe("new-model");
      expect(updated.coderModel).toBe("coder-9b");
      expect(fs.writeFile).toHaveBeenCalled();
    });
  });

  describe("Session Utility", () => {
    it("should list sessions", async () => {
      vi.mocked(fs.readdir).mockResolvedValue(["session-1.json", "session-2.json", "other.txt"] as any);
      const sessions = await listSessions();
      expect(sessions).toHaveLength(2);
      expect(sessions[0]).toBe("session-2.json"); // Sorted reverse
    });

    it("should load session content", async () => {
      const mockMessages = [{ role: "user", content: "hello" }];
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockMessages));
      const messages = await loadSession("test.json");
      expect(messages).toEqual(mockMessages);
    });
  });
});
