/**
 * Event Emitter - Unified output for TUI and JSON Lines
 *
 * This module provides a single interface for emitting structured events
 * that can be consumed by either:
 * 1. TUI components (Ink-based UI updates)
 * 2. JSON Lines output (--json mode for CI/CD)
 */

import { Event, EventKind } from '@airiscode/api/gen/ts/airiscode/v1/events';

export type OutputFormat = 'tui' | 'json';

export interface EventHandler {
  onDiffReady?: (data: unknown) => void;
  onTestResult?: (data: unknown) => void;
  onGuardBlock?: (summary: string) => void;
  onError?: (summary: string) => void;
  onInfo?: (summary: string) => void;
}

export class EventEmitter {
  private format: OutputFormat;
  private handlers: EventHandler;

  constructor(format: OutputFormat, handlers: EventHandler = {}) {
    this.format = format;
    this.handlers = handlers;
  }

  /**
   * Emit a structured event
   */
  emit(event: Event): void {
    if (this.format === 'json') {
      this.emitJson(event);
    } else {
      this.emitTui(event);
    }
  }

  /**
   * JSON Lines output (one event per line)
   */
  private emitJson(event: Event): void {
    const jsonEvent = {
      kind: EventKind[event.kind],
      ts: this.formatTimestamp(event.ts),
      session_id: event.session_id?.value,
      actor: event.actor,
      summary: event.summary,
      data: event.data ? JSON.parse(Buffer.from(event.data).toString()) : null,
    };
    process.stdout.write(JSON.stringify(jsonEvent) + '\n');
  }

  /**
   * TUI output (route to UI handlers)
   */
  private emitTui(event: Event): void {
    switch (event.kind) {
      case EventKind.EVENT_DIFF_READY:
        this.handlers.onDiffReady?.(this.parseData(event.data));
        break;

      case EventKind.EVENT_TEST_RESULT:
        this.handlers.onTestResult?.(this.parseData(event.data));
        break;

      case EventKind.EVENT_GUARD_BLOCK:
        this.handlers.onGuardBlock?.(event.summary);
        break;

      case EventKind.EVENT_ERROR:
        this.handlers.onError?.(event.summary);
        break;

      default:
        this.handlers.onInfo?.(event.summary);
    }
  }

  /**
   * Parse event data payload
   */
  private parseData(data?: Uint8Array): unknown {
    if (!data) return null;
    try {
      return JSON.parse(Buffer.from(data).toString());
    } catch {
      return null;
    }
  }

  /**
   * Format timestamp for JSON output
   */
  private formatTimestamp(ts?: { seconds: bigint; nanos: number }): string {
    if (!ts) return new Date().toISOString();
    const seconds = Number(ts.seconds);
    const nanos = ts.nanos || 0;
    const ms = Math.floor(nanos / 1_000_000);
    return new Date(seconds * 1000 + ms).toISOString();
  }

  /**
   * Helper: Create event with current timestamp
   */
  static createEvent(
    kind: EventKind,
    sessionId: string,
    actor: string,
    summary: string,
    data?: unknown
  ): Event {
    const now = Date.now();
    const seconds = Math.floor(now / 1000);
    const nanos = (now % 1000) * 1_000_000;

    return {
      kind,
      ts: { seconds: BigInt(seconds), nanos },
      session_id: { value: sessionId },
      actor,
      summary,
      data: data ? Buffer.from(JSON.stringify(data)) : undefined,
    };
  }
}
