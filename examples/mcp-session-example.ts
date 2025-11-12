#!/usr/bin/env tsx
/**
 * AIRIS MCP Session Example
 *
 * This example demonstrates how to use the MCP Session Manager
 * to connect to AIRIS MCP Gateway and invoke tools.
 *
 * Prerequisites:
 * 1. AIRIS MCP Gateway running at http://localhost:3000
 * 2. Set MCP_API_KEY environment variable if required
 *
 * Usage:
 *   pnpm tsx examples/mcp-session-example.ts
 */

import { MCPSessionManager } from '@airiscode/mcp-session';
import { isAlwaysOn, isLazy } from '@airiscode/mcp-registry';

async function main() {
  console.log('🚀 AIRIS MCP Session Example\n');

  // 1. Create session manager
  console.log('1️⃣  Creating MCP session...');
  const session = new MCPSessionManager({
    sessionId: `example-${Date.now()}`,
    baseURL: process.env.MCP_GATEWAY_URL || 'http://localhost:3000',
    apiKey: process.env.MCP_API_KEY,
    timeout: 30000
  });

  try {
    // 2. Initialize and load always-on tools
    console.log('2️⃣  Initializing session and loading always-on tools...');
    await session.initialize();

    const state = session.getState();
    console.log(`   ✅ Connected! Session: ${state.sessionId}`);
    console.log(`   📦 Always-on tools: ${state.alwaysOnTools.length}`);
    console.log(`   🔧 Tools available:`, state.alwaysOnTools.map(t => t.name).slice(0, 5).join(', '), '...\n');

    // 3. Show tool categorization
    console.log('3️⃣  Tool categorization:');
    console.log(`   Always-on: filesystem, context7, sequential-thinking, serena, mindbase, self-management`);
    console.log(`   Lazy: playwright, puppeteer, tavily, supabase, github, ...`);
    console.log(`   isAlwaysOn('filesystem'): ${isAlwaysOn('filesystem')}`);
    console.log(`   isLazy('playwright'): ${isLazy('playwright')}\n`);

    // 4. Enable a lazy server on-demand
    console.log('4️⃣  Enabling lazy server (playwright)...');
    try {
      const playwrightTools = await session.enableLazyServer('playwright', {
        PLAYWRIGHT_BROWSER: 'chromium'
      });
      console.log(`   ✅ Playwright enabled with ${playwrightTools.length} tools`);
    } catch (error) {
      console.log(`   ⚠️  Could not enable playwright: ${error instanceof Error ? error.message : String(error)}`);
      console.log(`   (This is expected if MCP Gateway is not running)\n`);
    }

    // 5. Show all available tools
    console.log('5️⃣  All available tools:');
    const allTools = session.getAllTools();
    console.log(`   Total tools: ${allTools.length}`);
    console.log(`   Always-on servers: ${state.alwaysOnTools.length}`);
    console.log(`   Lazy servers enabled: ${state.lazyTools.size}\n`);

    // 6. Example: Invoke a tool (if gateway is available)
    console.log('6️⃣  Example tool invocation:');
    console.log(`   session.invokeTool('filesystem', 'read_file', { path: '/path/to/file' })`);
    console.log(`   (Skipped - requires live gateway)\n`);

    // 7. Cleanup
    console.log('7️⃣  Cleaning up session...');
    await session.cleanup();
    console.log(`   ✅ Session cleaned up\n`);

    console.log('✨ Example completed successfully!');
    console.log('\nToken Optimization Benefits:');
    console.log('- Only 6 always-on servers loaded initially (~30-50 tools)');
    console.log('- Lazy servers loaded on-demand when LLM requests them');
    console.log('- Saves tokens by not describing unused tools');
    console.log('- Cleanup disables lazy servers to free gateway resources');

  } catch (error) {
    console.error('❌ Error:', error);
    console.error('\nTroubleshooting:');
    console.error('1. Is AIRIS MCP Gateway running at http://localhost:3000?');
    console.error('2. Start gateway: cd /Users/kazuki/github/airis-mcp-gateway && pnpm dev');
    console.error('3. Set MCP_API_KEY if your gateway requires authentication');
    process.exit(1);
  }
}

// Run example
main().catch(console.error);
