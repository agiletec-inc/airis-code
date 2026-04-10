# Homebrew Formula for AIRIS Code

This directory contains the Homebrew formula for installing AIRIS Code.

## For agiletec-inc/homebrew-tap maintainers

Copy `airiscode.rb` to the tap repository:

```bash
# Clone the tap repository
git clone https://github.com/agiletec-inc/homebrew-tap.git
cd homebrew-tap

# Copy the formula
cp /path/to/airiscode/homebrew/airiscode.rb Formula/airiscode.rb

# Commit and push
git add Formula/airiscode.rb
git commit -m "Add airiscode formula"
git push
```

## For users

Once the formula is added to the tap:

```bash
# Add the tap
brew tap agiletec-inc/tap

# Install airiscode
brew install airiscode

# Verify installation
airiscode --version
```

## Updating the formula

When releasing a new version:

1. Create a new GitHub release with tag (e.g., `v0.2.0`)
2. Update the `url` and `sha256` in the formula
3. Test the formula locally:
   ```bash
   brew install --build-from-source Formula/airiscode.rb
   ```
4. Push to the tap repository

## Getting the SHA256

```bash
curl -L https://github.com/agiletec-inc/airiscode/archive/refs/tags/v0.1.0.tar.gz | shasum -a 256
```
