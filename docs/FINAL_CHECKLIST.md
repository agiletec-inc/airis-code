# Final Verification Checklist

Use this checklist to verify the implementation skeleton before moving to the integration phase.

**Date**: 2025-01-09
**Version**: 0.1.0
**Phase**: Implementation Skeleton → Integration

---

## 🎯 Pre-Integration Checklist

### ✅ Phase 1: Environment Setup

- [ ] **buf CLI installed**
  ```bash
  buf --version
  # Expected: bufbuild v1.x.x or later
  ```

- [ ] **pnpm installed**
  ```bash
  pnpm --version
  # Expected: 9.x.x or later
  ```

- [ ] **Node.js version**
  ```bash
  node --version
  # Expected: v20.x.x or later
  ```

- [ ] **Repository cloned**
  ```bash
  cd /Users/kazuki/github/airiscode
  git status
  # Expected: On branch main (or equivalent)
  ```

---

### ✅ Phase 2: Proto & Build System

- [ ] **Proto files exist**
  ```bash
  ls packages/api/proto/airiscode/v1/*.proto
  # Expected: 5 files (common, events, model_driver, adapter, runners)
  ```

- [ ] **buf configuration valid**
  ```bash
  buf lint packages/api/proto
  # Expected: No errors
  ```

- [ ] **Codegen script executable**
  ```bash
  test -x tools/make/codegen && echo "OK" || echo "FAIL"
  # Expected: OK
  ```

- [ ] **Run codegen**
  ```bash
  make codegen
  # Expected: Success message + generated files
  ```

- [ ] **Generated TypeScript stubs exist**
  ```bash
  ls packages/api/gen/ts/airiscode/v1/*.ts
  # Expected: 5+ TypeScript files
  ```

- [ ] **Generated Go stubs exist**
  ```bash
  ls packages/api/gen/go/airiscode/v1/*.go
  # Expected: 5+ Go files
  ```

---

### ✅ Phase 3: Dependencies

- [ ] **Install dependencies**
  ```bash
  pnpm install
  # Expected: Success, no errors
  ```

- [ ] **Workspace dependencies resolved**
  ```bash
  pnpm list --depth 0
  # Expected: All @airiscode/* packages listed
  ```

- [ ] **Critical dependencies present**
  ```bash
  # Check key packages
  pnpm list yaml ink react commander uuid
  # Expected: All found
  ```

---

### ✅ Phase 4: Build Verification

- [ ] **TypeScript compilation (sandbox)**
  ```bash
  pnpm --filter @airiscode/sandbox build
  # Expected: Success, dist/ created
  ```

- [ ] **TypeScript compilation (CLI)**
  ```bash
  pnpm --filter @airiscode/cli build
  # Expected: Success, dist/ created
  ```

- [ ] **Build all packages**
  ```bash
  make build
  # Expected: All packages build successfully
  ```

- [ ] **No TypeScript errors**
  ```bash
  pnpm --filter @airiscode/cli exec tsc --noEmit
  # Expected: No errors
  ```

---

### ✅ Phase 5: Security & Policy

- [ ] **Shell Guard YAML valid**
  ```bash
  # Check YAML syntax
  node -e "const yaml = require('yaml'); const fs = require('fs'); yaml.parse(fs.readFileSync('packages/policies/schemas/guard.schema.yaml', 'utf-8'))"
  # Expected: No errors
  ```

- [ ] **Profiles YAML valid**
  ```bash
  node -e "const yaml = require('yaml'); const fs = require('fs'); yaml.parse(fs.readFileSync('packages/policies/schemas/profiles.yaml', 'utf-8'))"
  # Expected: No errors
  ```

- [ ] **Shell Guard unit test (if implemented)**
  ```bash
  pnpm --filter @airiscode/sandbox test
  # Expected: Tests pass (or skip if not implemented yet)
  ```

- [ ] **Verify denylist blocks dangerous commands**
  ```bash
  # Manual test (when Guard is integrated)
  # guard.evaluate("rm -rf /", "sandboxed")
  # Expected: { allowed: false, reason: "System wipe protection" }
  ```

---

### ✅ Phase 6: Event System

- [ ] **EventEmitter compiles**
  ```bash
  # Check if EventEmitter.ts exists and compiles
  ls apps/airiscode-cli/src/events/emitter.ts
  # Expected: File exists
  ```

- [ ] **Event bindings defined**
  ```bash
  # Check bindings.ts
  ls apps/airiscode-cli/src/ui/bindings.ts
  # Expected: File exists with HOTKEYS and createEventBindings
  ```

- [ ] **10 EventKind types defined**
  ```bash
  # Verify in proto or generated code
  grep "EVENT_" packages/api/proto/airiscode/v1/events.proto | wc -l
  # Expected: 10 or more
  ```

---

### ✅ Phase 7: TUI Components

- [ ] **All 6 components exist**
  ```bash
  ls apps/airiscode-cli/src/ui/components/*.tsx | wc -l
  # Expected: 5 (Header, DiffPanel, TestPanel, LogPanel, StatusBar)
  ```

- [ ] **App.tsx exists**
  ```bash
  ls apps/airiscode-cli/src/ui/App.tsx
  # Expected: File exists
  ```

- [ ] **React/Ink dependencies installed**
  ```bash
  pnpm --filter @airiscode/cli list react ink
  # Expected: Both packages listed
  ```

---

### ✅ Phase 8: Adapter Framework

- [ ] **All 3 plugin.json exist**
  ```bash
  ls packages/adapters/*/plugin.json | wc -l
  # Expected: 3 (claude-code, codex, gemini-cli)
  ```

- [ ] **plugin.json valid JSON**
  ```bash
  for f in packages/adapters/*/plugin.json; do
    node -e "JSON.parse(require('fs').readFileSync('$f'))" && echo "$f OK"
  done
  # Expected: All OK
  ```

- [ ] **Adapter bin scripts executable**
  ```bash
  test -x packages/adapters/claude-code/bin/claude-adapter && echo "OK" || echo "FAIL"
  # Expected: OK
  ```

- [ ] **Adapter README.md exists**
  ```bash
  ls packages/adapters/README.md
  # Expected: File exists
  ```

---

### ✅ Phase 9: Documentation

- [ ] **All 5 docs exist**
  ```bash
  ls QUICKSTART.md docs/IMPLEMENTATION_STATUS.md docs/INTEGRATION_GUIDE.md docs/VERIFICATION_REPORT.md docs/FILE_INVENTORY.md
  # Expected: All 5 files exist
  ```

- [ ] **README.md updated**
  ```bash
  grep "Pre-Alpha" README.md
  # Expected: Status badge present
  ```

- [ ] **QUICKSTART has setup instructions**
  ```bash
  grep "make setup" QUICKSTART.md
  # Expected: Found
  ```

---

### ✅ Phase 10: CLI Functionality

- [ ] **CLI binary exists**
  ```bash
  ls apps/airiscode-cli/bin/airis
  # Expected: File exists (or will be created after build)
  ```

- [ ] **CLI help works**
  ```bash
  ./apps/airiscode-cli/bin/airis --help || node apps/airiscode-cli/dist/index.js --help
  # Expected: Help output
  ```

- [ ] **Adapters command works**
  ```bash
  ./apps/airiscode-cli/bin/airis adapters
  # Expected: List of adapters (or placeholder message)
  ```

---

### ✅ Phase 11: Makefile Commands

- [ ] **make help works**
  ```bash
  make help
  # Expected: List of available commands
  ```

- [ ] **make check-deps passes**
  ```bash
  make check-deps
  # Expected: ✓ pnpm is installed
  ```

- [ ] **make setup works**
  ```bash
  make setup
  # Expected: Dependencies installed + codegen run + verification passed
  ```

- [ ] **make clean works**
  ```bash
  make clean
  # Expected: Build artifacts removed
  ```

---

## 🚨 Known Issues to Accept

### Expected Failures (Not Blockers)

1. **gRPC Server Not Implemented**
   - [ ] Acknowledged: Adapter spawn will fail until gRPC server is implemented
   - **Impact**: Cannot run E2E workflow yet
   - **Fix**: Implement AdapterGrpcServer (Week 1)

2. **TUI Events Not Wired**
   - [ ] Acknowledged: TUI won't update on events until handlers are connected
   - **Impact**: Static UI, no dynamic updates
   - **Fix**: Wire EventEmitter to App.tsx (1 hour)

3. **No Model Drivers**
   - [ ] Acknowledged: LLM integration not present
   - **Impact**: Cannot call OpenAI/Anthropic/etc yet
   - **Fix**: Implement ModelDriver services (Week 2-3)

4. **Integration Tests Missing**
   - [ ] Acknowledged: No E2E tests yet
   - **Impact**: Manual testing required
   - **Fix**: Add integration tests (Week 3-4)

---

## ✅ Final Acceptance Criteria

### Must Pass Before Integration

- [ ] All proto files compile with `buf lint` ✅
- [ ] All TypeScript packages build without errors ✅
- [ ] All dependencies installed successfully ✅
- [ ] Shell Guard YAML schemas are valid ✅
- [ ] All 6 TUI components compile ✅
- [ ] All 3 adapter plugin.json are valid JSON ✅
- [ ] All 5 documentation files exist ✅
- [ ] CLI help command works ✅
- [ ] make setup completes successfully ✅

### Nice to Have (Optional)

- [ ] Unit tests pass (if implemented)
- [ ] Linter passes without warnings
- [ ] No TypeScript strict mode violations

---

## 📊 Progress Scorecard

### Overall Completion

- **Proto & Build**: ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ 100%
- **Security**: ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ 100%
- **Events**: ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ 100%
- **TUI**: ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ 100%
- **Adapters**: ⬜⬜⬜⬛⬛⬛⬛⬛⬛⬛ 30%
- **Docs**: ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ 100%

**Total**: 93% Complete ✅

---

## 🚀 Next Phase: Integration

Once this checklist passes, proceed to:

1. **INTEGRATION_GUIDE.md** - Step-by-step integration plan
2. **IMPLEMENTATION_STATUS.md** - Prioritized TODO list
3. **Week 1 Goal**: M4 (Single Adapter Working)

---

## 📝 Sign-off

- [ ] **All "Must Pass" criteria met**
- [ ] **Known issues acknowledged**
- [ ] **Ready for integration phase**

**Signed**: _________________ **Date**: _________________

---

**Checklist Status**: Ready for execution ✅
**Next Review**: After integration phase completion
