/**
 * Session management
 */

// @ts-ignore
import { v4 as uuidv4 } from 'uuid';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import type { SessionInfo, TaskLogEntry } from '../types.js';
import type { PolicyProfile } from '@airiscode/policies';
import { config } from '../utils/config.js';

/**
 * Session manager
 */
export class SessionManager {
  private sessionDir: string;
  private currentSession?: SessionInfo;
  private taskLogs: TaskLogEntry[] = [];

  constructor() {
    this.sessionDir = config.get('sessionDir');
    this.ensureSessionDir();
  }

  /**
   * Create new session
   */
  createSession(options: {
    name?: string;
    workingDir: string;
    driver: string;
    adapter: string;
    policy: PolicyProfile;
  }): SessionInfo {
    const session: SessionInfo = {
      id: uuidv4(),
      name: options.name,
      workingDir: options.workingDir,
      driver: options.driver,
      adapter: options.adapter,
      policy: options.policy,
      createdAt: new Date(),
      lastActiveAt: new Date(),
      status: 'active',
      taskCount: 0,
    };

    this.currentSession = session;
    this.saveSession(session);

    return session;
  }

  /**
   * Get current session
   */
  getCurrentSession(): SessionInfo | undefined {
    return this.currentSession;
  }

  /**
   * Load session by ID
   */
  loadSession(sessionId: string): SessionInfo | null {
    const sessionPath = join(this.sessionDir, `${sessionId}.json`);
    
    if (!existsSync(sessionPath)) {
      return null;
    }

    try {
      const data = readFileSync(sessionPath, 'utf-8');
      const session = JSON.parse(data) as SessionInfo;
      
      // Convert date strings back to Date objects
      session.createdAt = new Date(session.createdAt);
      session.lastActiveAt = new Date(session.lastActiveAt);
      
      this.currentSession = session;
      return session;
    } catch (error) {
      console.error(`Failed to load session ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Save session
   */
  saveSession(session: SessionInfo): void {
    const sessionPath = join(this.sessionDir, `${session.id}.json`);
    
    try {
      writeFileSync(sessionPath, JSON.stringify(session, null, 2), 'utf-8');
    } catch (error) {
      console.error(`Failed to save session ${session.id}:`, error);
    }
  }

  /**
   * Update session status
   */
  updateStatus(status: SessionInfo['status']): void {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    this.currentSession.status = status;
    this.currentSession.lastActiveAt = new Date();
    this.saveSession(this.currentSession);
  }

  /**
   * Increment task count
   */
  incrementTaskCount(): void {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    this.currentSession.taskCount++;
    this.currentSession.lastActiveAt = new Date();
    this.saveSession(this.currentSession);
  }

  /**
   * List all sessions
   */
  listSessions(): SessionInfo[] {
    const sessions: SessionInfo[] = [];
    
    try {
      const files = readdirSync(this.sessionDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const sessionPath = join(this.sessionDir, file);
          const data = readFileSync(sessionPath, 'utf-8');
          const session = JSON.parse(data) as SessionInfo;
          
          // Convert date strings
          session.createdAt = new Date(session.createdAt);
          session.lastActiveAt = new Date(session.lastActiveAt);
          
          sessions.push(session);
        }
      }
    } catch (error) {
      console.error('Failed to list sessions:', error);
    }

    // Sort by last active (most recent first)
    return sessions.sort((a, b) => 
      b.lastActiveAt.getTime() - a.lastActiveAt.getTime()
    );
  }

  /**
   * Delete session
   */
  deleteSession(sessionId: string): boolean {
    const sessionPath = join(this.sessionDir, `${sessionId}.json`);
    
    if (!existsSync(sessionPath)) {
      return false;
    }

    try {
      unlinkSync(sessionPath);
      
      if (this.currentSession?.id === sessionId) {
        this.currentSession = undefined;
        this.taskLogs = [];
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to delete session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Clean old sessions
   */
  cleanOldSessions(daysOld: number = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const sessions = this.listSessions();
    let deletedCount = 0;

    for (const session of sessions) {
      if (session.status === 'completed' || session.status === 'failed') {
        if (session.lastActiveAt < cutoffDate) {
          if (this.deleteSession(session.id)) {
            deletedCount++;
          }
        }
      }
    }

    return deletedCount;
  }

  /**
   * Add task log
   */
  addLog(entry: Omit<TaskLogEntry, 'timestamp'>): void {
    const log: TaskLogEntry = {
      ...entry,
      timestamp: new Date(),
    };

    this.taskLogs.push(log);
  }

  /**
   * Get task logs
   */
  getLogs(): TaskLogEntry[] {
    return [...this.taskLogs];
  }

  /**
   * Clear task logs
   */
  clearLogs(): void {
    this.taskLogs = [];
  }

  /**
   * Ensure session directory exists
   */
  private ensureSessionDir(): void {
    if (!existsSync(this.sessionDir)) {
      mkdirSync(this.sessionDir, { recursive: true });
    }
  }
}
