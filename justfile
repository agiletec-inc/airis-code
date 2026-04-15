# airiscode workspace justfile

# Install dependencies
setup:
	bash tools/make/setup

# Build all packages
build:
	pnpm -r build

# Run tests
test:
	pnpm -r test

# Run CLI in dev mode
dev:
	pnpm --filter airiscode dev

# Clean build artifacts
clean:
	pnpm -r clean
	rm -rf dist

# Regenerate workspace files (Mock - should call airiscode generate)
generate:
	pnpm --filter airiscode build
	./apps/airiscode-cli/bin/airiscode generate
