import { beforeEach, describe, expect, it, vi } from "vitest";
import { GitRunner } from "../src/git-runner.js";
import { GitOperation } from "../src/types.js";

// Mock simple-git
vi.mock("simple-git", () => ({
  simpleGit: vi.fn(() => ({
    status: vi.fn(),
    diff: vi.fn(),
    add: vi.fn(),
    commit: vi.fn(),
    push: vi.fn(),
    pull: vi.fn(),
    branch: vi.fn(),
    checkoutBranch: vi.fn(),
    checkoutLocalBranch: vi.fn(),
    checkout: vi.fn(),
    log: vi.fn(),
    raw: vi.fn(),
    reset: vi.fn(),
    stash: vi.fn(),
  })),
}));

describe("@airiscode/runners-git - GitRunner", () => {
  let runner: GitRunner;
  let mockGit: any;

  beforeEach(async () => {
    const { simpleGit } = await import("simple-git");
    mockGit = simpleGit("/test/repo");
    runner = new GitRunner("/test/repo");
  });

  describe("status", () => {
    it("should return git status", async () => {
      mockGit.status.mockResolvedValueOnce({
        current: "main",
        modified: ["file1.ts", "file2.ts"],
        staged: ["file3.ts"],
        not_added: ["file4.ts"],
        conflicted: [],
        isClean: () => false,
        ahead: 2,
        behind: 1,
        tracking: "origin/main",
      });

      const result = await runner.status();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.current).toBe("main");
        expect(result.value.modified).toEqual(["file1.ts", "file2.ts"]);
        expect(result.value.staged).toEqual(["file3.ts"]);
        expect(result.value.untracked).toEqual(["file4.ts"]);
        expect(result.value.isClean).toBe(false);
        expect(result.value.tracking).toEqual({ ahead: 2, behind: 1 });
      }
    });

    it("should handle clean repository", async () => {
      mockGit.status.mockResolvedValueOnce({
        current: "main",
        modified: [],
        staged: [],
        not_added: [],
        conflicted: [],
        isClean: () => true,
        ahead: 0,
        behind: 0,
      });

      const result = await runner.status();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.isClean).toBe(true);
      }
    });

    it("should handle errors", async () => {
      mockGit.status.mockRejectedValueOnce(new Error("Git error"));

      const result = await runner.status();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.operation).toBe(GitOperation.STATUS);
        expect(result.error.message).toContain("Failed to get git status");
      }
    });
  });

  describe("diff", () => {
    it("should return diff", async () => {
      const mockDiff = `diff --git a/file.ts b/file.ts
index 123..456 789
--- a/file.ts
+++ b/file.ts
@@ -1,3 +1,3 @@
-old line
+new line`;

      mockGit.diff.mockResolvedValueOnce(mockDiff);

      const result = await runner.diff();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(mockDiff);
      }
    });

    it("should get staged diff", async () => {
      mockGit.diff.mockResolvedValueOnce("staged diff");

      const result = await runner.diff({ staged: true });

      expect(result.ok).toBe(true);
      expect(mockGit.diff).toHaveBeenCalledWith(["--cached"]);
    });

    it("should get diff for specific files", async () => {
      mockGit.diff.mockResolvedValueOnce("file diff");

      const result = await runner.diff({ files: ["file1.ts", "file2.ts"] });

      expect(result.ok).toBe(true);
      expect(mockGit.diff).toHaveBeenCalledWith(["--", "file1.ts", "file2.ts"]);
    });

    it("should use context lines", async () => {
      mockGit.diff.mockResolvedValueOnce("diff with context");

      const result = await runner.diff({ context: 5 });

      expect(result.ok).toBe(true);
      expect(mockGit.diff).toHaveBeenCalledWith(["-U5"]);
    });
  });

  describe("add", () => {
    it("should add files", async () => {
      mockGit.add.mockResolvedValueOnce(undefined);

      const result = await runner.add(["file1.ts", "file2.ts"]);

      expect(result.ok).toBe(true);
      expect(mockGit.add).toHaveBeenCalledWith(["file1.ts", "file2.ts"]);
    });

    it("should handle errors", async () => {
      mockGit.add.mockRejectedValueOnce(new Error("Add failed"));

      const result = await runner.add(["file.ts"]);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.operation).toBe(GitOperation.ADD);
      }
    });
  });

  describe("commit", () => {
    it("should create commit", async () => {
      mockGit.commit.mockResolvedValueOnce({
        commit: "abc123",
        summary: {
          changes: 2,
          insertions: 10,
          deletions: 5,
        },
      });

      const result = await runner.commit({
        message: "Test commit",
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.commit).toBe("abc123");
        expect(result.value.summary.changes).toBe(2);
        expect(result.value.summary.insertions).toBe(10);
        expect(result.value.summary.deletions).toBe(5);
      }
    });

    it("should create commit with author", async () => {
      mockGit.commit.mockResolvedValueOnce({
        commit: "abc123",
        summary: { changes: 1, insertions: 1, deletions: 0 },
      });

      const result = await runner.commit({
        message: "Test commit",
        author: "Test User",
        email: "test@example.com",
      });

      expect(result.ok).toBe(true);
      expect(mockGit.commit).toHaveBeenCalledWith(
        "Test commit",
        undefined,
        expect.arrayContaining(["--author", "Test User <test@example.com>"]),
      );
    });

    it("should allow empty commit", async () => {
      mockGit.commit.mockResolvedValueOnce({
        commit: "abc123",
        summary: { changes: 0, insertions: 0, deletions: 0 },
      });

      const result = await runner.commit({
        message: "Empty commit",
        allowEmpty: true,
      });

      expect(result.ok).toBe(true);
      expect(mockGit.commit).toHaveBeenCalledWith(
        "Empty commit",
        undefined,
        expect.arrayContaining(["--allow-empty"]),
      );
    });

    it("should amend commit", async () => {
      mockGit.commit.mockResolvedValueOnce({
        commit: "abc123",
        summary: { changes: 1, insertions: 1, deletions: 0 },
      });

      const result = await runner.commit({
        message: "Amended commit",
        amend: true,
      });

      expect(result.ok).toBe(true);
      expect(mockGit.commit).toHaveBeenCalledWith(
        "Amended commit",
        undefined,
        expect.arrayContaining(["--amend"]),
      );
    });
  });

  describe("push", () => {
    it("should push to default remote", async () => {
      mockGit.push.mockResolvedValueOnce(undefined);

      const result = await runner.push();

      expect(result.ok).toBe(true);
      expect(mockGit.push).toHaveBeenCalledWith(["origin"]);
    });

    it("should push to specific remote and branch", async () => {
      mockGit.push.mockResolvedValueOnce(undefined);

      const result = await runner.push({
        remote: "upstream",
        branch: "feature",
      });

      expect(result.ok).toBe(true);
      expect(mockGit.push).toHaveBeenCalledWith(["upstream", "feature"]);
    });

    it("should force push", async () => {
      mockGit.push.mockResolvedValueOnce(undefined);

      const result = await runner.push({ force: true });

      expect(result.ok).toBe(true);
      expect(mockGit.push).toHaveBeenCalledWith(expect.arrayContaining(["--force"]));
    });

    it("should set upstream", async () => {
      mockGit.push.mockResolvedValueOnce(undefined);

      const result = await runner.push({
        branch: "feature",
        setUpstream: true,
      });

      expect(result.ok).toBe(true);
      expect(mockGit.push).toHaveBeenCalledWith(expect.arrayContaining(["--set-upstream"]));
    });
  });

  describe("pull", () => {
    it("should pull from default remote", async () => {
      mockGit.pull.mockResolvedValueOnce(undefined);

      const result = await runner.pull();

      expect(result.ok).toBe(true);
      expect(mockGit.pull).toHaveBeenCalledWith("origin", undefined);
    });

    it("should pull from specific remote and branch", async () => {
      mockGit.pull.mockResolvedValueOnce(undefined);

      const result = await runner.pull("upstream", "main");

      expect(result.ok).toBe(true);
      expect(mockGit.pull).toHaveBeenCalledWith("upstream", "main");
    });
  });

  describe("branch operations", () => {
    it("should list branches", async () => {
      mockGit.branch.mockResolvedValueOnce({
        branches: {
          main: {
            current: true,
            commit: "abc123",
            label: "origin/main",
          },
          feature: {
            current: false,
            commit: "def456",
            label: "",
          },
        },
      });

      const result = await runner.listBranches();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0].name).toBe("main");
        expect(result.value[0].current).toBe(true);
        expect(result.value[1].name).toBe("feature");
        expect(result.value[1].current).toBe(false);
      }
    });

    it("should create branch", async () => {
      mockGit.checkoutLocalBranch.mockResolvedValueOnce(undefined);

      const result = await runner.createBranch("feature");

      expect(result.ok).toBe(true);
      expect(mockGit.checkoutLocalBranch).toHaveBeenCalledWith("feature");
    });

    it("should create branch from start point", async () => {
      mockGit.checkoutBranch.mockResolvedValueOnce(undefined);

      const result = await runner.createBranch("feature", "main");

      expect(result.ok).toBe(true);
      expect(mockGit.checkoutBranch).toHaveBeenCalledWith("feature", "main");
    });

    it("should checkout branch", async () => {
      mockGit.checkout.mockResolvedValueOnce(undefined);

      const result = await runner.checkout("feature");

      expect(result.ok).toBe(true);
      expect(mockGit.checkout).toHaveBeenCalledWith("feature");
    });
  });

  describe("log", () => {
    it("should get commit log", async () => {
      mockGit.log.mockResolvedValueOnce({
        all: [
          {
            hash: "abc123",
            date: "2024-01-01T00:00:00Z",
            message: "Commit 1",
            author_name: "User 1",
            author_email: "user1@example.com",
          },
          {
            hash: "def456",
            date: "2024-01-02T00:00:00Z",
            message: "Commit 2",
            author_name: "User 2",
            author_email: "user2@example.com",
          },
        ],
      });

      const result = await runner.log(10);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0].hash).toBe("abc123");
        expect(result.value[0].message).toBe("Commit 1");
        expect(result.value[1].hash).toBe("def456");
      }
    });
  });

  describe("reset", () => {
    it("should reset with default mode", async () => {
      mockGit.reset.mockResolvedValueOnce(undefined);

      const result = await runner.reset();

      expect(result.ok).toBe(true);
      expect(mockGit.reset).toHaveBeenCalledWith(["--mixed", "HEAD"]);
    });

    it("should reset with soft mode", async () => {
      mockGit.reset.mockResolvedValueOnce(undefined);

      const result = await runner.reset("soft", "HEAD~1");

      expect(result.ok).toBe(true);
      expect(mockGit.reset).toHaveBeenCalledWith(["--soft", "HEAD~1"]);
    });

    it("should reset with hard mode", async () => {
      mockGit.reset.mockResolvedValueOnce(undefined);

      const result = await runner.reset("hard");

      expect(result.ok).toBe(true);
      expect(mockGit.reset).toHaveBeenCalledWith(["--hard", "HEAD"]);
    });
  });

  describe("stash", () => {
    it("should stash changes", async () => {
      mockGit.stash.mockResolvedValueOnce(undefined);

      const result = await runner.stash();

      expect(result.ok).toBe(true);
      expect(mockGit.stash).toHaveBeenCalled();
    });

    it("should stash with message", async () => {
      mockGit.stash.mockResolvedValueOnce(undefined);

      const result = await runner.stash("WIP: feature");

      expect(result.ok).toBe(true);
      expect(mockGit.stash).toHaveBeenCalledWith(["push", "-m", "WIP: feature"]);
    });

    it("should pop stash", async () => {
      mockGit.stash.mockResolvedValueOnce(undefined);

      const result = await runner.stashPop();

      expect(result.ok).toBe(true);
      expect(mockGit.stash).toHaveBeenCalledWith(["pop"]);
    });
  });
});
