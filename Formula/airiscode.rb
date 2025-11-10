class Airiscode < Formula
  desc "Terminal-first autonomous coding runner"
  homepage "https://github.com/agiletec-inc/airiscode"
  url "https://github.com/agiletec-inc/airiscode/archive/refs/tags/v0.1.0.tar.gz"
  sha256 "" # Will be filled after first release
  license "MIT"
  head "https://github.com/agiletec-inc/airiscode.git", branch: "main"

  depends_on "node@20"
  depends_on "pnpm"

  def install
    system "pnpm", "install", "--frozen-lockfile"
    system "pnpm", "build"

    # Install CLI binary
    libexec.install Dir["*"]
    bin.install_symlink "#{libexec}/apps/airiscode-cli/bin/airis"
  end

  test do
    system "#{bin}/airis", "--version"
    system "#{bin}/airis", "--help"
  end
end
