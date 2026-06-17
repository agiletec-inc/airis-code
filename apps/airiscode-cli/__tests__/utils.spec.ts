import * as fs from "node:fs/promises";
import * as path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:os", () => ({
  homedir: () => "/mock/home",
}));

import { loadConfig, saveConfig } from "../src/utils/config.js";
import { listSessions, loadSession, saveSession } from "../src/utils/session.js";

vi.mock("node:fs/promises");

describe("CLI Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Config Utility", () => {
    it("should load default config when file does not exist", async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error("File not found"));
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
      vi.mocked(fs.readdir).mockResolvedValue([
        "session-1.json",
        "session-2.json",
        "other.txt",
      ] as any);
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
