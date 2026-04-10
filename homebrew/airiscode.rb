class Airiscode < Formula
  desc "Terminal-first autonomous coding runner"
  homepage "https://github.com/agiletec-inc/airiscode"
  url "https://github.com/agiletec-inc/airiscode/archive/refs/tags/v0.1.0.tar.gz"
  sha256 "" # Will be filled after first release
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", "--production"

    # Install the CLI globally
    libexec.install Dir["*"]
    bin.install_symlink libexec/"apps/airiscode-cli/bin/airiscode"
  end

  test do
    assert_match "AIRIS Code", shell_output("#{bin}/airiscode --version")
  end
end
