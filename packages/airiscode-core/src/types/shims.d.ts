// Ambient module shims for packages without bundled type definitions.
// The stub `@types/uuid@11` defers to uuid's own types, but `uuid@9` does
// not ship typings of its own — declare the handful of helpers we use.
declare module 'uuid' {
  export function v4(): string;
  export function v5(name: string, namespace: string): string;
  export function v1(): string;
  export function validate(uuid: string): boolean;
}
