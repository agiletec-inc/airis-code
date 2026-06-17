/**
 * Common types used across airiscode packages
 */

export interface UUID {
  value: string;
}

export interface Timestamp {
  seconds: number;
  nanos: number;
}

export interface SemVer {
  major: number;
  minor: number;
  patch: number;
}

export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function err<E = Error>(error: E): Result<never, E> {
  return { ok: false, error };
}
