# AIRIS Code - Quickstart Guide

🚀 **AIRIS Code** is a terminal-first autonomous coding runner with unified multi-provider support.

## Installation & Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Build Packages

```bash
pnpm -w build
```

### 3. Configure Provider

Copy the example config:

```bash
cp ~/.airiscode/config.toml.example ~/.airiscode/config.toml
```

Edit `~/.airiscode/config.toml` and configure your provider.

## Provider Configuration Examples

### OpenAI

```toml
[provider]
name = "openai"

[openai]
api_key = "$OPENAI_API_KEY"
model = "gpt-4o-mini"
```

```bash
export OPENAI_API_KEY="sk-..."
```

### Anthropic (Claude)

```toml
[provider]
name = "anthropic"

[anthropic]
api_key = "$ANTHROPIC_API_KEY"
model = "claude-3-5-sonnet-latest"
```

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

### Ollama (Local)

```toml
[provider]
name = "ollama"

[ollama]
model = "qwen2.5:7b"
```

```bash
ollama serve
ollama pull qwen2.5:7b
```

## Running

```bash
# Development
pnpm --filter @airiscode/cli dev

# Production
pnpm --filter @airiscode/cli start
```

## Status

✅ Core drivers implemented (OpenAI, Anthropic, Ollama)
✅ Config-based provider switching
✅ Basic Ink UI
🚧 Full Gemini UI integration
🚧 MCP Gateway integration
🚧 Shell Guard & policies

## License

MIT
