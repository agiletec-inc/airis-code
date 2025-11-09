import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionManager } from '../src/session/session-manager';
import { ApprovalsLevel, TrustLevel } from '@airiscode/policies';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('SessionManager', () => {
  let sessionManager: SessionManager;
  let testSessionDir: string;

  beforeEach(() => {
    // Create temporary session directory
    testSessionDir = join(tmpdir(), 'airis-test-sessions-' + Date.now());
    mkdirSync(testSessionDir, { recursive: true });

    // Mock config
    vi.mock('../src/utils/config', () => ({
      config: {
        get: vi.fn((key: string) => {
          if (key === 'sessionDir') return testSessionDir;
          return null;
        }),
      },
    }));

    sessionManager = new SessionManager();
  });

  afterEach(() => {
    // Cleanup
    if (existsSync(testSessionDir)) {
      rmSync(testSessionDir, { recursive: true, force: true });
    }
    vi.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a new session', () => {
      const session = sessionManager.createSession({
        name: 'test-session',
        workingDir: '/test/dir',
        driver: 'ollama',
        adapter: 'claude-code',
        policy: {
          approvals: ApprovalsLevel.ON_REQUEST,
          trust: TrustLevel.SANDBOXED,
          guardStrict: true,
        },
      });

      expect(session.id).toBeDefined();
      expect(session.name).toBe('test-session');
      expect(session.workingDir).toBe('/test/dir');
      expect(session.driver).toBe('ollama');
      expect(session.adapter).toBe('claude-code');
      expect(session.status).toBe('active');
      expect(session.taskCount).toBe(0);
    });

    it('should save session to file', () => {
      const session = sessionManager.createSession({
        workingDir: '/test/dir',
        driver: 'ollama',
        adapter: 'claude-code',
        policy: {
          approvals: ApprovalsLevel.ON_REQUEST,
          trust: TrustLevel.SANDBOXED,
          guardStrict: true,
        },
      });

      const sessionFile = join(testSessionDir, `${session.id}.json`);
      expect(existsSync(sessionFile)).toBe(true);
    });
  });

  describe('loadSession', () => {
    it('should load existing session', () => {
      const created = sessionManager.createSession({
        name: 'load-test',
        workingDir: '/test/dir',
        driver: 'ollama',
        adapter: 'claude-code',
        policy: {
          approvals: ApprovalsLevel.ON_REQUEST,
          trust: TrustLevel.SANDBOXED,
          guardStrict: true,
        },
      });

      const loaded = sessionManager.loadSession(created.id);

      expect(loaded).not.toBeNull();
      expect(loaded?.id).toBe(created.id);
      expect(loaded?.name).toBe('load-test');
    });

    it('should return null for non-existent session', () => {
      const loaded = sessionManager.loadSession('non-existent-id');
      expect(loaded).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should update session status', () => {
      sessionManager.createSession({
        workingDir: '/test/dir',
        driver: 'ollama',
        adapter: 'claude-code',
        policy: {
          approvals: ApprovalsLevel.ON_REQUEST,
          trust: TrustLevel.SANDBOXED,
          guardStrict: true,
        },
      });

      sessionManager.updateStatus('completed');

      const current = sessionManager.getCurrentSession();
      expect(current?.status).toBe('completed');
    });
  });

  describe('listSessions', () => {
    it('should list all sessions', () => {
      sessionManager.createSession({
        name: 'session-1',
        workingDir: '/test/dir',
        driver: 'ollama',
        adapter: 'claude-code',
        policy: {
          approvals: ApprovalsLevel.ON_REQUEST,
          trust: TrustLevel.SANDBOXED,
          guardStrict: true,
        },
      });

      sessionManager.createSession({
        name: 'session-2',
        workingDir: '/test/dir',
        driver: 'ollama',
        adapter: 'claude-code',
        policy: {
          approvals: ApprovalsLevel.ON_REQUEST,
          trust: TrustLevel.SANDBOXED,
          guardStrict: true,
        },
      });

      const sessions = sessionManager.listSessions();
      expect(sessions).toHaveLength(2);
    });

    it('should sort by last active (most recent first)', () => {
      const session1 = sessionManager.createSession({
        name: 'old-session',
        workingDir: '/test/dir',
        driver: 'ollama',
        adapter: 'claude-code',
        policy: {
          approvals: ApprovalsLevel.ON_REQUEST,
          trust: TrustLevel.SANDBOXED,
          guardStrict: true,
        },
      });

      // Wait a bit
      setTimeout(() => {
        const session2 = sessionManager.createSession({
          name: 'new-session',
          workingDir: '/test/dir',
          driver: 'ollama',
          adapter: 'claude-code',
          policy: {
            approvals: ApprovalsLevel.ON_REQUEST,
            trust: TrustLevel.SANDBOXED,
            guardStrict: true,
          },
        });

        const sessions = sessionManager.listSessions();
        expect(sessions[0].id).toBe(session2.id);
        expect(sessions[1].id).toBe(session1.id);
      }, 100);
    });
  });

  describe('deleteSession', () => {
    it('should delete session', () => {
      const session = sessionManager.createSession({
        workingDir: '/test/dir',
        driver: 'ollama',
        adapter: 'claude-code',
        policy: {
          approvals: ApprovalsLevel.ON_REQUEST,
          trust: TrustLevel.SANDBOXED,
          guardStrict: true,
        },
      });

      const deleted = sessionManager.deleteSession(session.id);
      expect(deleted).toBe(true);

      const loaded = sessionManager.loadSession(session.id);
      expect(loaded).toBeNull();
    });
  });

  describe('task logs', () => {
    it('should add and retrieve logs', () => {
      sessionManager.createSession({
        workingDir: '/test/dir',
        driver: 'ollama',
        adapter: 'claude-code',
        policy: {
          approvals: ApprovalsLevel.ON_REQUEST,
          trust: TrustLevel.SANDBOXED,
          guardStrict: true,
        },
      });

      sessionManager.addLog({
        level: 'info',
        source: 'adapter',
        message: 'Test log message',
      });

      const logs = sessionManager.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Test log message');
      expect(logs[0].timestamp).toBeInstanceOf(Date);
    });

    it('should clear logs', () => {
      sessionManager.createSession({
        workingDir: '/test/dir',
        driver: 'ollama',
        adapter: 'claude-code',
        policy: {
          approvals: ApprovalsLevel.ON_REQUEST,
          trust: TrustLevel.SANDBOXED,
          guardStrict: true,
        },
      });

      sessionManager.addLog({
        level: 'info',
        source: 'adapter',
        message: 'Test',
      });

      sessionManager.clearLogs();
      expect(sessionManager.getLogs()).toHaveLength(0);
    });
  });
});
