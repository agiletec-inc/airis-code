# AIRIS Code - Current Status

**Last Updated**: 2025-11-13
**Package Manager**: pnpm 10.21.0 (exclusive)
**Node Version**: 25.0.0+
**Build Tool**: Turbo 2.6.1

## ✅ Completed

### MCP Integration (Gateway Client + Session Management)
All MCP packages are built and ready to use:

- **@airiscode/mcp-gateway-client** - HTTP/SSE communication with AIRIS MCP Gateway
- **@airiscode/mcp-registry** - Tool categorization (6 always-on, 13+ lazy servers)
- **@airiscode/mcp-lazy-loader** - On-demand server enabling/disabling
- **@airiscode/mcp-session** - Complete session lifecycle management

**Token Optimization**: 6 always-on servers provide core tools to LLM context, lazy servers loaded only when requested.

### LLM Drivers (Model Abstraction Layer)
All major LLM drivers are implemented and built:

- **@airiscode/driver-ollama** - Local Ollama inference with tool calling support
- **@airiscode/driver-openai** - OpenAI API (GPT-4, GPT-3.5) with tool calling
- **@airiscode/driver-anthropic** - Anthropic Claude API (Claude 3 Opus/Sonnet/Haiku) with tool calling

All drivers implement the unified `ModelDriver` interface with:
- `chat()` - Synchronous chat completion
- `chatStream()` - Streaming responses
- `getCapabilities()` - Model capabilities query
- Tool calling support for all providers

### CLI Integration
MCPSessionManager integrated into chat command:

- `airis chat` now initializes MCP Gateway connection
- Automatically loads 6 always-on tools
- Graceful fallback if Gateway unavailable
- `--mcp-gateway` flag to customize Gateway URL
- `--no-mcp` flag to disable MCP tools
- Session cleanup on exit

### Tool Execution Loop
Complete LLM↔MCP tool calling implementation:

- **useChatSession hook** - Manages conversation and tool execution loop
- **Autonomous tool execution** - LLM requests tools → MCP executes → results sent back → LLM continues
- **Lazy server loading** - Automatically enables lazy servers when LLM requests their tools
- **Loop safety** - Maximum 10 iterations to prevent infinite loops
- **Tool result rendering** - UI displays tool executions and results
- **Error handling** - Graceful error messages returned to LLM

**Flow**: User → LLM → Tool Call → MCP Gateway → Tool Result → LLM → Response

### Repository Structure
```
airiscode/
├─ apps/
│  └─ airiscode-cli/          # CLI entry point (in progress)
├─ packages/
│  ├─ mcp/
│  │  ├─ gateway-client/      # ✅ Built
│  │  ├─ lazy-loader/         # ✅ Built
│  │  ├─ registry/            # ✅ Built
│  │  └─ session/             # ✅ Built
│  ├─ core-gemini/            # ✅ Built
│  ├─ gemini-core/            # ✅ Built (Gemini CLI core logic)
│  ├─ ui-gemini/              # ⏳ Skipped (missing dependencies)
│  ├─ policies/               # ✅ Built
│  └─ types/                  # ✅ Built
├─ docs/
│  ├─ ARCHITECTURE.md         # Architecture reference
│  ├─ AGENTS.md               # Development guidelines
│  ├─ CLAUDE.md               # Claude Code instructions
│  └─ MCP_INTEGRATION.md      # ✅ MCP integration guide
├─ examples/
│  └─ mcp-session-example.ts  # ✅ Working example
└─ turbo.json                 # ✅ Fixed for Turbo 2.x ("tasks")
```

### Package Manager Standardization
- **Removed**: npm workspaces, npm scripts
- **Configured**: pnpm-workspace.yaml with nested package paths
- **Updated**: All build scripts to use `pnpm` exclusively
- **Engines**: Enforces pnpm >=10.21.0, node >=25.0.0

### Build System
- ✅ Turbo 2.x configuration ("tasks" not "pipeline")
- ✅ All MCP packages build successfully
- ✅ Source maps and type declarations generated
- ✅ Incremental compilation enabled

## ⏳ In Progress

### Observability & Telemetry
- **Status**: Not started
- **Needs**:
  - SessionLogger for tracking tool usage
  - TelemetryEmitter for metrics
  - Tool latency tracking
  - Success/failure rates
  - Token usage optimization metrics

### UI Package (ui-gemini)
- **Status**: Copied from Gemini CLI but not adapted
- **Missing**:
  - Dependencies: `tinygradient`, `lowlight`, `hast`, `semver`, `latest-version`
  - Config files: `extension.js`, `settings.js`, `checks.js`, `math.js`
  - Package references: Should use `@airiscode/gemini-core` not `@google/gemini-cli-core`
- **Decision**: Skipped for now to focus on core functionality

## 🚫 Blocked / Not Started

### Adapters
Child-process wrappers for other CLIs:
- `@airiscode/adapters-claude-code`
- `@airiscode/adapters-codex`
- `@airiscode/adapters-gemini`
- `@airiscode/adapters-aider`

### Runners
- `@airiscode/runners-git` - Git operations and diff management
- `@airiscode/runners-docker` - Docker container management
- `@airiscode/runners-test` - Test execution and verification

### Security
- `@airiscode/sandbox` - Shell Guard (command analysis and blocking)

## 📊 Build Status

| Package | Status | Notes |
|---------|--------|-------|
| @airiscode/mcp-gateway-client | ✅ Built | HTTP/SSE client |
| @airiscode/mcp-registry | ✅ Built | Tool categorization |
| @airiscode/mcp-lazy-loader | ✅ Built | On-demand loading |
| @airiscode/mcp-session | ✅ Built | Session management |
| @airiscode/driver-ollama | ✅ Built | Ollama driver with tools |
| @airiscode/driver-openai | ✅ Built | OpenAI driver with tools |
| @airiscode/driver-anthropic | ✅ Built | Anthropic driver with tools |
| @airiscode/drivers | ✅ Built | Base driver interface |
| @airiscode/core-gemini | ✅ Built | Gemini core logic |
| @airiscode/gemini-core | ✅ Built | Gemini CLI adapted |
| @airiscode/ui-gemini | ⏭️  Skipped | Missing dependencies |
| @airiscode/policies | ✅ Built | Policy profiles |
| @airiscode/types | ✅ Built | Shared types |
| @airiscode/cli | ✅ Integrated | MCP session wired in |

## 🎯 Next Steps

### Priority 1: Production Readiness
1. ~~Implement LLM drivers~~ ✅ Completed
2. ~~Wire MCPSessionManager into CLI~~ ✅ Completed
3. ~~Implement tool execution loop~~ ✅ Completed
4. Add streaming tool execution (show progress in real-time)
5. Implement parallel tool calls (execute multiple tools concurrently)
6. Add conversation compression (prune old messages to save tokens)

### Priority 2: UI & UX
1. Fix ui-gemini dependencies
2. Adapt Gemini CLI components to AIRIS Code
3. Implement terminal-based chat interface
4. Add progress indicators and logging

### Priority 3: Adapters & Runners
1. Implement git-runner for diff management
2. Create adapter protocol (gRPC/JSON)
3. Build Claude Code adapter
4. Add Shell Guard for command safety

## 🔧 Development Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm turbo run build

# Build MCP packages only
pnpm turbo run build --filter='@airiscode/mcp-*'

# Run example
pnpm tsx examples/mcp-session-example.ts

# Lint
pnpm turbo run lint

# Clean
pnpm turbo run clean
```

## 🔗 Related Projects

- **AIRIS MCP Gateway**: `/Users/kazuki/github/airis-mcp-gateway`
- **MindBase**: `/Users/kazuki/github/mindbase`
- **Super Agent**: `/Users/kazuki/github/superagent`
- **SuperClaude**: Multiple locations (Framework + Plugin)

## 📝 Documentation

- **ARCHITECTURE.md** - Complete system architecture
- **AGENTS.md** - Development guidelines
- **CLAUDE.md** - AI assistant instructions
- **MCP_INTEGRATION.md** - MCP integration guide (NEW)
- **STATUS.md** - This file

## 🐛 Known Issues

1. **ui-gemini**: Many missing dependencies from Gemini CLI
2. **Drivers**: Not yet implemented
3. **Adapters**: No adapter protocol implementation yet
4. **Shell Guard**: Security sandbox not built

## 💡 Key Decisions

1. **pnpm only** - No npm/yarn support
2. **Turbo 2.x** - Using "tasks" not "pipeline"
3. **Token optimization** - 6 always-on servers + lazy loading
4. **Gemini CLI UI** - Copied wholesale, will adapt later
5. **MCP-first** - Gateway integration is foundation

---

**Project Goal**: Terminal-first autonomous coding runner that orchestrates multiple CLI coding assistants through unified interface with MCP tool integration.
