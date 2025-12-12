# airiscode

**Terminal-first autonomous coding runner** that orchestrates multiple CLI coding assistants (Claude Code, Codex, Gemini CLI, Aider) through a unified interface.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/agiletec-inc/airiscode)
[![Status](https://img.shields.io/badge/status-pre--alpha-orange.svg)](https://github.com/agiletec-inc/airiscode)

**Status**: Pre-Alpha (v0.1.0) - Implementation Skeleton Complete (93%)

---

## 🌟 Part of the AIRIS Ecosystem

AIRISCode is the **terminal-first coding agent** of the **AIRIS Suite** - providing a unified CLI interface for autonomous coding.

### The AIRIS Suite

| Component | Purpose | For Who |
|-----------|---------|---------|
| **[airis-agent](https://github.com/agiletec-inc/airis-agent)** | 🧠 Intelligence layer for all editors (confidence checks, deep research, self-review) | All developers using Claude Code, Cursor, Windsurf, Codex, Gemini CLI |
| **[airis-mcp-gateway](https://github.com/agiletec-inc/airis-mcp-gateway)** | 🚪 Unified MCP proxy with 90% token reduction via lazy loading | Claude Code users who want faster startup |
| **[mindbase](https://github.com/agiletec-inc/mindbase)** | 💾 Local cross-session memory with semantic search | Developers who want persistent conversation history |
| **[airis-workspace](https://github.com/agiletec-inc/airis-workspace)** | 🏗️ Docker-first monorepo manager | Teams building monorepos |
| **airiscode** (this repo) | 🖥️ Terminal-first autonomous coding agent | CLI-first developers |

### MCP Servers (Included via Gateway)

- **[airis-mcp-supabase-selfhost](https://github.com/agiletec-inc/airis-mcp-supabase-selfhost)** - Self-hosted Supabase MCP with RLS support
- **mindbase** - Memory search & storage tools (`mindbase_search`, `mindbase_store`)

### Quick Install: Complete AIRIS Suite

```bash
# Option 1: Install airis-agent plugin (recommended for Claude Code users)
/plugin marketplace add agiletec-inc/airis-agent
/plugin install airis-agent

# Option 2: Clone all AIRIS repositories at once
uv run airis-agent install-suite --profile core

# Option 3: Just use airiscode standalone
npm install -g @airiscode/cli
airis "your task"
```

**What you get with the full suite:**
- ✅ Confidence-gated workflows (prevents wrong-direction coding)
- ✅ Deep research with evidence synthesis
- ✅ 94% token reduction via repository indexing
- ✅ Cross-session memory across all editors
- ✅ Self-review and post-implementation validation

---

## Features

- 🤖 **Multi-LLM Support**: OpenAI, Anthropic, Google, Ollama, MLX
- 🔌 **CLI Adapters**: Unified interface for Codex, Claude Code, Gemini CLI, Aider
- 🛡️ **Shell Guard**: Blocks dangerous commands (rm -rf /, docker system prune, etc.)
- 🔐 **Policy Management**: Configurable approval and trust levels
- 🧠 **MindBase Integration**: Local semantic memory with pgvector
- 🔧 **MCP Gateway**: Dynamic tool loading via AIRIS MCP Gateway
- 📊 **TUI**: Beautiful terminal UI built with Ink

## Installation

### For Users

**Homebrew (Recommended for macOS/Linux)**
```bash
# Add Agiletec tap
brew tap agiletec-inc/tap

# Install AIRIS Code
brew install airiscode

# Verify installation
airis --version
```

**npm (Alternative)**
```bash
# Install globally
npm install -g @airiscode/cli

# Verify installation
airis --version
```

### For Developers

**Prerequisites:**
- Node.js >= 20.0.0
- pnpm >= 8.0.0 (install: `npm install -g pnpm`)

**Setup:**
```bash
# Clone the repository
git clone https://github.com/agiletec-inc/airiscode.git
cd airiscode

# Install dependencies + generate proto stubs + verify
make setup

# Or manually:
make check-deps  # Check pnpm/buf installation
make install     # Install dependencies
make codegen     # Generate TS/Go stubs from proto
make build       # Build all packages

# Run tests
make test

# Link globally for local development
pnpm link --global

# Verify installation
airis --version
```

### Development

```bash
# Show all available commands
make help

# Watch mode for all packages
pnpm dev

# Run linter
make lint

# Run tests with coverage
make test-coverage

# Run tests in watch mode
make test-watch

# Clean build artifacts
make clean
```

### Available Make Commands

```bash
make help             # Show this help
make check-deps       # Check if required dependencies are installed
make install          # Install all dependencies
make build            # Build all packages via Turbo
make lint             # Lint all packages
make test             # Run all tests
make test-watch       # Run tests in watch mode
make test-coverage    # Run tests with coverage
make test-unit        # Run unit tests only (faster)
make clean            # Clean generated files and build artifacts
```

## Project Structure

```
airiscode/
├── apps/
│   └── airiscode-cli/          # Main CLI application
├── packages/
│   ├── types/                  # Shared TypeScript types
│   ├── policies/               # Policy profiles
│   ├── sandbox/                # Shell Guard
│   ├── drivers/                # LLM drivers
│   ├── adapters/               # CLI adapters
│   ├── mcp/                    # MCP client & registry
│   ├── runners/                # Git/Docker/Test runners
│   ├── super-agent/            # Super Agent runtime wrapper
│   ├── mindbase/               # MindBase client
│   └── ux/                     # Common UI components
└── tools/
    └── make/                   # Build scripts
```

## Usage

```bash
# Shorthand - execute task directly
airis "Add a /health endpoint to the API"

# With options
airis "Refactor authentication" --adapter claude-code --policy sandboxed --verbose

# Explicit code command (also works)
airis code "Add authentication feature"

# Interactive mode with restricted access
airis "Review security" --policy restricted

# Use specific adapter and driver
airis "Fix bug #123" --adapter claude-code --driver ollama

# JSON output for CI/CD
airis "Run tests" --json

# Configuration management
airis config --list
airis config --set defaultDriver=ollama

# Session management
airis session --list
airis session --show <session-id>
airis session --resume <session-id>
```

## Policy Levels

### Approval Levels
- `never`: Fully autonomous, no user approval required
- `on-failure`: Pause for user input when errors occur (default)
- `on-request`: Require explicit user approval before executing actions

### Trust Levels
- `restricted`: Read-only filesystem, shell disabled
- `sandboxed`: Workspace write allowed, external network blocked (default)
- `untrusted`: Full access, but Shell Guard still blocks dangerous commands

## Architecture

See [ARCHTECHTURE.md](./ARCHTECHTURE.md) for detailed architecture documentation.

## Implementation Plan

See [実装計画プランニング.md](./実装計画プランニング.md) for the detailed implementation roadmap.

## Development Status

**Current Phase**: Phase 5 Complete ✅

### Completed Phases

- [x] **Phase 0 - Foundation** (3 packages)
  - `@airiscode/types` - Common types and Result pattern
  - `@airiscode/policies` - Security policies (ApprovalsLevel, TrustLevel)
  - `@airiscode/sandbox` - ShellGuard with deny list

- [x] **Phase 1 - Core Interfaces** (2 packages)
  - `@airiscode/drivers` - ModelDriver abstract class
  - `@airiscode/adapters` - AdapterProcess abstract class

- [x] **Phase 2 - Implementations** (2 packages)
  - `@airiscode/drivers-local` - Ollama driver with streaming
  - `@airiscode/adapters-claude-code` - Claude Code CLI adapter

- [x] **Phase 3 - MCP Integration** (2 packages)
  - `@airiscode/mcp-client` - MCP Gateway client with caching
  - `@airiscode/mcp-registry` - Tool search and invocation tracking

- [x] **Phase 4 - Runners** (3 packages)
  - `@airiscode/runners-git` - Git operations (status, commit, push, patch)
  - `@airiscode/runners-docker` - Docker operations (compose, health, stats)
  - `@airiscode/runners-test` - Multi-framework test runner (7 frameworks)

- [x] **Phase 5 - CLI** (1 package)
  - `@airiscode/cli` - Commander.js-based CLI with 3 commands
  - Shorthand command support: `airis "task"`
  - Session management
  - Configuration management

### Statistics

- **Total Packages**: 13
- **Total Files**: 141
- **Lines of Code**: 14,180+
- **Test Files**: 13
- **Test Coverage**: Comprehensive (2,500+ lines of tests)

## Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Related Projects

- [Super Agent](https://github.com/yourusername/superagent) - Confidence gating and deep research
- [MindBase](https://github.com/yourusername/mindbase) - Local semantic memory
- [AIRIS MCP Gateway](https://github.com/yourusername/airis-mcp-gateway) - MCP server aggregation

## Documentation

### User Guides
- [QUICKSTART.md](./QUICKSTART.md) - Setup guide & usage examples
- [CLAUDE.md](./CLAUDE.md) - Project guidelines for Claude Code
- [ARCHTECHTURE.md](./ARCHTECHTURE.md) - System architecture & design

### Developer Guides
- [INTEGRATION_GUIDE.md](./docs/INTEGRATION_GUIDE.md) - Integrating new components with existing code
- [IMPLEMENTATION_STATUS.md](./docs/IMPLEMENTATION_STATUS.md) - Progress tracking & prioritized TODO
- [VERIFICATION_REPORT.md](./docs/VERIFICATION_REPORT.md) - Implementation verification & acceptance criteria
- [AGENTS.md](./AGENTS.md) - Repository guidelines & coding standards
- [packages/adapters/README.md](./packages/adapters/README.md) - Adapter implementation guide

### Publishing
- [PUBLISHING.md](./PUBLISHING.md) - npm and Homebrew publishing guide
