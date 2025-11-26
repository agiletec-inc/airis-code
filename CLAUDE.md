# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Reference

**Read PROJECT_INDEX.md first** - Complete codebase navigation (3K tokens vs 58K full read). Contains package structure, entry points, implementation status, and all documentation links.

## Project Overview

**airiscode** is a terminal-first autonomous coding runner that orchestrates multiple CLI coding assistants (Claude Code, Codex, Gemini CLI, Aider) through a unified interface. It integrates Super Agent runtime, SuperClaude assets, MindBase (local semantic memory), and AIRIS MCP Gateway.

**Status**: Pre-Alpha v0.1.0 (93% complete). Core packages built: LLM drivers (OpenAI, Anthropic, Ollama), MCP integration (gateway-client, registry, session), CLI with tool execution loop.

## Development Commands

**Monorepo**: pnpm + Turbo. Required: pnpm 10.21.0+, Node 25.0.0+, Turbo 2.6.1

```bash
# Setup
pnpm install
pnpm turbo run build

# Development
pnpm dev                              # Watch mode
pnpm --filter @airiscode/cli dev      # Run CLI in dev mode
airiscode                             # Run CLI (after pnpm install)
pnpm tsx examples/mcp-session-example.ts  # Run example

# Testing
pnpm turbo run test                   # All tests (Vitest)
pnpm turbo run test --filter <pkg>   # Single package

# Build specific categories
pnpm turbo run build --filter='@airiscode/mcp-*'
pnpm turbo run build --filter='@airiscode/driver-*'

# Cleanup
pnpm turbo run clean
```

## Architecture Essentials

### Core Principles
1. **No reimplementation** - Wrap existing CLIs (Claude Code, Codex, etc.) as child processes; never fork upstream
2. **LLM-agnostic** - Support OpenAI, Anthropic, Google, Ollama/MLX via unified ModelDriver interface
3. **Dynamic tooling** - MCP Gateway advertises tools lazily; only describe to LLM when selected
4. **Local memory** - MindBase keeps conversation + task logs local (pgvector + Ollama embeddings)
5. **Strict policies** - Enforce `--approvals` (never/on-failure/on-request) and `--trust` (restricted/sandboxed/untrusted)
6. **Terminal-first** - Ink TUI + `--json` headless mode for CI/CD

### Package Categories (22 packages)

**✅ Built & Integrated**:
- `drivers/*` - LLM abstraction (openai, anthropic, ollama)
- `mcp/*` - MCP Gateway integration (gateway-client, registry, lazy-loader, session)
- `policies/` - Security policies (ApprovalsLevel, TrustLevel)
- `gemini-core/`, `core-gemini/` - Gemini CLI adaptation
- `types/` - Shared types & Result pattern

**⏳ Skeleton/Pending**:
- `adapters/*` - CLI wrappers (claude-code, codex, gemini, aider)
- `sandbox/` - Shell Guard (command safety analysis)
- `runners/*` - git-runner, docker-runner, test-runner

### Key Execution Flow
1. User command → Session bootstrap (load policy, init MindBase, detect adapters)
2. Planning → Super Agent confidence gating, deep research, repo indexing
3. Tool orchestration → MCP Gateway exposes tools lazily
4. Adapter invocation → Child process with Shell Guard filtering
5. Runners & verification → git-runner stages diffs, docker-runner spins services
6. Reporting → TUI + optional `--json`, MindBase stores conversation

### MCP Tool Execution Loop
**Implemented**: `@airiscode/mcp-session` + CLI integration

Flow: User → LLM → Tool Call → MCP Gateway → Tool Result → LLM → Response

Features: Autonomous execution, lazy server loading, loop safety (max 10 iterations), error handling

Implementation: `apps/airiscode-cli/src/hooks/useChatSession.tsx`

## Coding Standards

- **TypeScript**: 2-space indent, semicolons, `"strict": true`
- **Naming**: PascalCase (types/classes), camelCase (functions/vars), kebab-case (dirs)
- **Tests**: `*.spec.ts` alongside source or `__tests__/` dirs. Use Vitest.
- **Commits**: Conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`)
- **Module organization**: `packages/adapters/<name>/`, `packages/drivers/<name>/`

## Security

When adding tools/adapters:
1. Route shell execution through `packages/sandbox/` utilities
2. Never downgrade `--approvals` or `--trust` defaults
3. Document shell commands for Shell Guard review
4. Respect policy profiles from `packages/policies/`

Shell Guard blocks: `rm -rf /`, `docker system prune`, fork bombs, etc.

## Key Integration Points

- **Super Agent** (`/Users/kazuki/github/superagent`) - Confidence gating, deep research, repo indexing
- **MindBase** (`/Users/kazuki/github/mindbase`) - Local semantic memory (MCP tools: `mindbase_store`, `mindbase_search`)
- **AIRIS MCP Gateway** (`/Users/kazuki/github/airis-mcp-gateway`) - 25+ MCP servers, lazy tool streaming

## Documentation

**Essential**:
- PROJECT_INDEX.md - Codebase navigation
- ARCHTECHTURE.md - Complete architecture, execution flows, sequence diagrams
- STATUS.md - Implementation progress, known issues
- AGENTS.md - Repository guidelines, coding standards

**Implementation Guides**:
- docs/MCP_INTEGRATION.md - MCP integration with examples
- docs/TOOL_EXECUTION_LOOP.md - LLM↔MCP tool execution flow
- docs/INTEGRATION_GUIDE.md - Integrating new components

## Development Target

**Mac M4 Air** (32GB) - Ollama local inference, Docker Desktop for MindBase/gateway
