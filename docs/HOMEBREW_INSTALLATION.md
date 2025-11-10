# Homebrew Installation Guide

Guide for installing airiscode via Homebrew (for macOS/Linux users).

**Status**: ✅ Formula created, testing in progress

---

## For End Users (After Release)

Once airiscode is publicly released, installation will be:

```bash
# Add Agiletec tap
brew tap agiletec-inc/tap

# Install airiscode
brew install airiscode

# Verify installation
airis --version
airis --help
```

---

## For Developers (Local Testing)

### Current Setup

A Homebrew formula has been created at:
```
/opt/homebrew/Library/Taps/agiletec-inc/homebrew-tap/Formula/airiscode.rb
```

### Local Installation (Development)

```bash
# Install from local tap
brew install agiletec-inc/tap/airiscode

# Or reinstall after changes
brew reinstall agiletec-inc/tap/airiscode

# Uninstall
brew uninstall airiscode
```

### Formula Structure

```ruby
class Airiscode < Formula
  desc "Terminal-first autonomous coding runner"
  homepage "https://github.com/agiletec-inc/airiscode"
  license "MIT"

  # For release (future):
  # url "https://github.com/agiletec-inc/airiscode/archive/refs/tags/v0.1.0.tar.gz"
  # sha256 "..."

  # Current (development):
  url "file:///Users/kazuki/github/airiscode"
  version "0.1.0-dev"

  depends_on "node@20"
  depends_on "pnpm"

  def install
    system "pnpm", "install"
    system "pnpm", "turbo", "run", "build"

    libexec.install Dir["*"]

    (bin/"airis").write <<~EOS
      #!/bin/bash
      exec node "#{libexec}/apps/airiscode-cli/dist/index.js" "$@"
    EOS
    chmod 0755, bin/"airis"
  end

  test do
    assert_match "airis", shell_output("#{bin}/airis --help 2>&1", 0)
  end
end
```

---

## Release Checklist

Before publishing to Homebrew:

### 1. Create GitHub Release

```bash
# Tag release
git tag -a v0.1.0 -m "Release v0.1.0"
git push origin v0.1.0

# Create release archive
git archive --format=tar.gz --prefix=airiscode-0.1.0/ v0.1.0 > airiscode-0.1.0.tar.gz

# Calculate SHA256
shasum -a 256 airiscode-0.1.0.tar.gz
```

### 2. Update Formula for Release

```ruby
class Airiscode < Formula
  desc "Terminal-first autonomous coding runner"
  homepage "https://github.com/agiletec-inc/airiscode"
  url "https://github.com/agiletec-inc/airiscode/archive/refs/tags/v0.1.0.tar.gz"
  sha256 "<output from shasum above>"
  license "MIT"

  # ... rest of formula
end
```

### 3. Test Formula

```bash
# Test installation
brew install --build-from-source agiletec-inc/tap/airiscode

# Run tests
brew test airiscode

# Audit formula
brew audit --strict airiscode
```

### 4. Publish Tap

```bash
cd /opt/homebrew/Library/Taps/agiletec-inc/homebrew-tap
git add Formula/airiscode.rb
git commit -m "Add airiscode v0.1.0"
git push origin main
```

---

## Troubleshooting

### Issue: pnpm not found

**Solution**: Formula includes `depends_on "pnpm"`

### Issue: Build fails

**Solution**: Check logs at:
```bash
cat ~/Library/Logs/Homebrew/airiscode/*.log
```

### Issue: Node version mismatch

**Solution**: Formula specifies `depends_on "node@20"`

### Issue: Binary not working

**Solution**: Check wrapper script:
```bash
cat /opt/homebrew/bin/airis
```

---

## Alternative: npm Installation

If Homebrew is not preferred:

```bash
# Global npm install (after npm publish)
npm install -g @airiscode/cli

# Verify
airis --version
```

---

## References

- Homebrew Formula Cookbook: https://docs.brew.sh/Formula-Cookbook
- Homebrew Tap Documentation: https://docs.brew.sh/How-to-Create-and-Maintain-a-Tap
- GitHub Releases: https://docs.github.com/en/repositories/releasing-projects-on-github

---

**Status**: Formula created ✅
**Testing**: In progress 🚧
**Public Release**: Not yet (v0.1.0 is pre-alpha)
