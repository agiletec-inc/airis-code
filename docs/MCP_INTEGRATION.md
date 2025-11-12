# AIRIS MCP Gateway Integration

## Overview

AIRIS Code integrates with AIRIS MCP Gateway through a clean responsibility-based architecture with lazy loading for token optimization.

## Architecture

```
MCPSessionManager (session lifecycle management)
  ├─> MCPGatewayClient (HTTP/SSE communication)
  └─> LazyMCPLoader (on-demand server enabling)
        └─> MCPRegistry (tool categorization)
```

## Package Responsibilities

### `@airiscode/mcp-gateway-client`
**Responsibility**: HTTP/SSE communication with Gateway API

```typescript
import { MCPGatewayClient } from '@airiscode/mcp-gateway-client';

const client = new MCPGatewayClient({
  baseURL: 'http://localhost:3000',
  apiKey: process.env.MCP_API_KEY,
  timeout: 30000
});

// Get always-on server tools
const tools = await client.getAlwaysOnTools();

// Invoke a tool
const result = await client.invokeTool('filesystem', 'read_file', {
  path: '/path/to/file'
});
```

### `@airiscode/mcp-registry`
**Responsibility**: Tool categorization and caching

**Always-On Servers** (loaded at session start):
- `filesystem` - File operations
- `context7` - Documentation retrieval
- `sequential-thinking` - Reasoning framework
- `serena` - Code search
- `mindbase` - Semantic memory
- `self-management` - Agent introspection

**Lazy Servers** (loaded on-demand):
- `playwright`, `puppeteer` - Browser automation
- `chrome-devtools` - DevTools protocol
- `tavily` - Web search
- `supabase`, `postgres` - Database operations
- `github`, `gitlab` - Git integrations
- And 10+ more...

```typescript
import { isAlwaysOn, isLazy } from '@airiscode/mcp-registry';

isAlwaysOn('filesystem'); // true
isLazy('playwright'); // true
```

### `@airiscode/mcp-lazy-loader`
**Responsibility**: On-demand server enabling/disabling

```typescript
import { LazyMCPLoader } from '@airiscode/mcp-lazy-loader';

const loader = new LazyMCPLoader({
  client: mcpClient,
  onToolsAdded: (serverName, tools) => {
    console.log(`Enabled ${serverName} with ${tools.length} tools`);
  }
});

// Enable server on-demand
const tools = await loader.enableServer('playwright', {
  PLAYWRIGHT_BROWSER: 'chromium'
});

// Disable when done
await loader.disableServer('playwright');
```

### `@airiscode/mcp-session`
**Responsibility**: Complete session lifecycle management

```typescript
import { MCPSessionManager } from '@airiscode/mcp-session';

const session = new MCPSessionManager({
  sessionId: 'session-123',
  baseURL: 'http://localhost:3000',
  apiKey: process.env.MCP_API_KEY,
  timeout: 30000
});

// Initialize session and load always-on tools
await session.initialize();

// Get all available tools (always-on only at start)
const tools = session.getAllTools();

// Enable lazy server when LLM requests it
const playwrightTools = await session.enableLazyServer('playwright');

// Invoke tool
const result = await session.invokeTool('filesystem', 'read_file', {
  path: '/path/to/file'
});

// Cleanup
await session.cleanup();
```

## Token Optimization Strategy

1. **Session Start**: Load 6 always-on servers (~30-50 tools)
   - These provide core capabilities: file ops, docs, search, memory
   - Always included in LLM context

2. **On-Demand Loading**: Enable lazy servers only when LLM requests them
   - LLM sees always-on tools in every request
   - When LLM needs playwright, gateway enables it and returns tools
   - Tools added to context for subsequent requests

3. **Cleanup**: Disable lazy servers when session ends
   - Frees gateway resources
   - Resets tool list to always-on only

## Integration with AIRIS Code CLI

```typescript
// apps/airiscode-cli/src/mcp-integration.ts
import { MCPSessionManager } from '@airiscode/mcp-session';

export async function initializeMCP(): Promise<MCPSessionManager> {
  const session = new MCPSessionManager({
    sessionId: `airis-${Date.now()}`,
    baseURL: process.env.MCP_GATEWAY_URL || 'http://localhost:3000',
    apiKey: process.env.MCP_API_KEY,
    timeout: 30000
  });

  await session.initialize();

  console.log(`MCP session initialized with ${session.getAllTools().length} tools`);

  return session;
}

// In your CLI command handler
const mcpSession = await initializeMCP();

// Pass tools to LLM
const availableTools = mcpSession.getAllTools();

// When LLM requests a lazy tool
if (toolRequest.serverName && !session.isConnected()) {
  await mcpSession.enableLazyServer(toolRequest.serverName);
}

// Invoke tool
const result = await mcpSession.invokeTool(
  toolRequest.serverName,
  toolRequest.toolName,
  toolRequest.args
);
```

## Environment Variables

```bash
# .env
MCP_GATEWAY_URL=http://localhost:3000
MCP_API_KEY=your-api-key-here
MCP_TIMEOUT=30000
```

## Package Manager

This project uses **pnpm 10.21.0** exclusively:

```bash
# Install dependencies
pnpm install

# Build MCP packages
pnpm turbo run build --filter='@airiscode/mcp-*'

# Build all packages
pnpm turbo run build
```

## Status

- ✅ `@airiscode/mcp-gateway-client` - Built and tested
- ✅ `@airiscode/mcp-registry` - Built and tested
- ✅ `@airiscode/mcp-lazy-loader` - Built and tested
- ✅ `@airiscode/mcp-session` - Built and tested
- ⏳ CLI integration - Pending
- ⏳ LLM driver integration - Pending

## Next Steps

1. Integrate MCPSessionManager into CLI command handlers
2. Wire up LLM drivers to use MCP tools
3. Implement tool request detection in LLM responses
4. Add telemetry for tool usage tracking
5. Complete ui-gemini package dependencies
