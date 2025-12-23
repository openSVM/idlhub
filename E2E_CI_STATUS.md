# E2E Tests CI/CD Status

## ✅ Deployed and Active

**Repository**: https://github.com/openSVM/idlhub
**Workflow**: `.github/workflows/e2e-tests.yml`
**Status**: ✅ Active and running

## 📊 Current Configuration

### Test Execution
- **Browser**: Chromium only (in CI)
- **Parallelization**: 4 shards for faster execution
- **Test Count**: ~197 tests per run (785 total / 4 shards * 1 browser)
- **Timeout**: 60 minutes max per workflow

### Workflow Triggers
- ✅ Push to `main` branch
- ✅ Push to `develop` branch
- ✅ Pull requests to `main`/`develop`
- ✅ Manual workflow dispatch

### Build Process
1. Install Node.js 22
2. Install system dependencies (canvas package requirements)
3. Install npm dependencies
4. Install Playwright Chromium browser
5. Build application (`npm run build`)
6. Serve built app on `localhost:5173`
7. Run tests in 4 parallel shards
8. Upload test results and artifacts
9. Merge reports from all shards

## 🔧 Iterations and Fixes Applied

### Commit 1: `52d152b` - Initial E2E test suite
- Added 785 tests across 9 test files
- Created Playwright configuration
- Added GitHub Actions workflow

### Commit 2: `69d0310` - Fix npm cache issue
- Removed `cache: 'npm'` from setup-node (no lock file)
- Changed from `npm ci` to `npm install`
- Added error resilience to merge-reports

### Commit 3: `325050b` - Add system dependencies
- Installed `libcairo2-dev`, `libpango1.0-dev`, etc.
- Fixed canvas package compilation issues

### Commit 4: `49ebce2` - Configure CI build
- Disabled webServer in CI mode
- Build and serve static app instead
- Added proper wait for server readiness

### Commit 5: `c81e5a7` - Chromium only
- Restricted to Chromium browser in CI (faster, fewer dependencies)
- Firefox and WebKit can be tested locally

## 📈 Test Results

### Latest Run: c81e5a7 (In Progress)
- **Status**: Running
- **Configuration**: Chromium only, 4 shards
- **Expected runtime**: ~3-5 minutes

### View Results
```bash
# Using GitHub CLI
gh run list --repo openSVM/idlhub --workflow="E2E Tests"

# Or visit
https://github.com/openSVM/idlhub/actions/workflows/e2e-tests.yml
```

## 🎯 What Gets Tested in CI

### Pages (All 8 pages tested)
- ✅ HomePage (`/`)
- ✅ RegistryPage (`/registry`)
- ✅ ProtocolPage (`/protocol`)
- ✅ BattlesPage (`/battles`)
- ✅ GuildsPage (`/guilds`)
- ✅ DocsPage (`/docs`)
- ✅ TokenomicsPage (`/tokenomics`)
- ✅ StatusPage (`/status`)

### Features Tested
- IDL Protocol branding and messaging
- veIDL staking stats display
- Prediction markets UI
- 1v1 battles functionality
- IDL registry search
- Wallet integration (UI states)
- Navigation between pages
- Responsive design
- Accessibility (WCAG)
- Performance benchmarks
- Visual components

### Test Categories (~197 Chromium tests)
- **Functional**: ~99 tests
- **Accessibility**: ~26 tests
- **Performance**: ~23 tests
- **Visual**: ~25 tests
- **Integration**: ~24 tests

## 🚀 Running Locally

### Full Multi-Browser Suite (785 tests)
```bash
# Start dev server
npm run dev

# In another terminal
npm run test:e2e
```

### Quick Single-Browser Test
```bash
npm run dev
npm run test:e2e:chromium
```

### Interactive UI Mode (Recommended)
```bash
npm run dev
npm run test:e2e:ui
```

## 📁 Artifacts

Tests generate the following artifacts on failure:

1. **Test Results** (7 day retention)
   - Test execution logs
   - Failed test details
   - Error messages

2. **HTML Reports** (30 day retention)
   - Comprehensive test reports
   - Screenshots of failures
   - Execution timelines

3. **Merged Reports**
   - Combined results from all shards
   - Overall pass/fail summary

## 🔍 Monitoring

### Check Test Status
```bash
# List recent runs
gh run list --repo openSVM/idlhub --workflow="E2E Tests" --limit 5

# View specific run
gh run view <run-id> --repo openSVM/idlhub

# Watch live
gh run watch <run-id> --repo openSVM/idlhub
```

### Download Test Reports
1. Go to Actions → E2E Tests → Select run
2. Scroll to "Artifacts" section
3. Download "playwright-report-merged"
4. Extract and open `index.html`

## ⚙️ Configuration Files

### Playwright Config (`playwright.config.ts`)
- Multi-browser support (5 configurations)
- WebServer disabled in CI
- Base URL configuration
- Test timeouts and retries
- Reporter configuration

### GitHub Actions (`e2e-tests.yml`)
- 4 parallel shards
- System dependency installation
- Build and serve workflow
- Artifact upload/merge

## 🎓 For Developers

### Adding New Tests
1. Create test file in `e2e/` directory
2. Follow existing patterns (see `e2e/home.spec.ts`)
3. Run locally first: `npm run test:e2e:ui`
4. Commit and push - CI runs automatically

### Debugging CI Failures
```bash
# View failure logs
gh run view <run-id> --log-failed

# Download artifacts locally
gh run download <run-id>

# Re-run failed workflow
gh run rerun <run-id>
```

### Updating Dependencies
```bash
# Update Playwright
npm install -D @playwright/test@latest

# Reinstall browsers
npx playwright install
```

## ✅ Success Criteria

Tests are passing when:
- ✅ All 4 shards complete successfully
- ✅ Build step succeeds
- ✅ Server starts and responds
- ✅ No test failures
- ✅ Reports generated and uploaded

## 🔄 Next Steps

1. **Monitor first successful run** of commit `c81e5a7`
2. **Review test results** in artifacts
3. **Fix any failing tests** found
4. **Iterate and improve** test coverage
5. **Add visual regression baselines** (optional)

## 📞 Resources

- **GitHub Actions**: https://github.com/openSVM/idlhub/actions
- **Playwright Docs**: https://playwright.dev
- **Local Docs**: `e2e/README.md`, `e2e/QUICKSTART.md`
- **Test Files**: `e2e/*.spec.ts`

---

**Last Updated**: 2025-12-22
**Latest Commit**: c81e5a7
**Status**: ✅ Active and Running
