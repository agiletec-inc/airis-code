/**
 * Tool Categories - Always-on vs Lazy Loading
 * Based on airis-mcp-gateway defaults
 */

export const ALWAYS_ON_SERVERS = [
  'filesystem',
  'context7',
  'sequential-thinking',
  'serena',
  'mindbase',
  'self-management',
] as const;

export const LAZY_SERVERS = [
  'playwright',
  'puppeteer',
  'chrome-devtools',
  'magic',
  'tavily',
  'supabase',
  'mongodb',
  'notion',
  'slack',
  'figma',
  'mcp-postgres-server',
  'morphllm-fast-apply',
  'sqlite',
] as const;

export type AlwaysOnServer = typeof ALWAYS_ON_SERVERS[number];
export type LazyServer = typeof LAZY_SERVERS[number];
export type ServerName = AlwaysOnServer | LazyServer;

export function isAlwaysOn(serverName: string): serverName is AlwaysOnServer {
  return ALWAYS_ON_SERVERS.includes(serverName as AlwaysOnServer);
}

export function isLazy(serverName: string): serverName is LazyServer {
  return LAZY_SERVERS.includes(serverName as LazyServer);
}
