---
name: commit
description: Create a git commit with a well-crafted message. Use when the user asks to "commit", "create a commit", "save changes", or says "/commit". Optionally push and create a PR.
allowedTools:
  - run_shell_command
  - read_file
  - grep_search
  - glob
---

# Git Commit

Create a well-crafted git commit following conventional commit format.

## Step 1: Assess changes

Run these commands in parallel:

1. `git status` — see all changed files (never use `-uall`)
2. `git diff --cached` and `git diff` — see staged and unstaged changes
3. `git log --oneline -5` — see recent commit message style

## Step 2: Stage files

- If no files are staged, stage relevant files by name (prefer explicit `git add <file>` over `git add -A`)
- Never stage files that likely contain secrets (`.env`, credentials, tokens)
- If uncertain which files to stage, ask the user

## Step 3: Draft commit message

Analyze all staged changes and draft a commit message:

- Use conventional commit format: `type(scope): description`
- Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `ci`
- Keep the first line under 72 characters
- Focus on **why** not **what** (the diff shows what)
- Add a body with bullet points if the change is complex
- Match the style of recent commits in the repository

## Step 4: Create the commit

Use a HEREDOC to pass the message:

```bash
git commit -m "$(cat <<'EOF'
type(scope): short description

- Detail 1
- Detail 2
EOF
)"
```

## Step 5: Verify

Run `git status` after committing to verify success.

## Rules

- NEVER amend existing commits unless explicitly asked
- NEVER use `--no-verify` to skip hooks
- NEVER push unless the user explicitly asks
- If a pre-commit hook fails, fix the issue and create a NEW commit
- If the user says "commit and push", push after successful commit
- If the user says "commit and PR", push and create a PR with `gh pr create`
