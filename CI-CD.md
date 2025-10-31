# CI/CD Documentation

Comprehensive Continuous Integration and Continuous Deployment documentation for the Privacy Evaluation Platform.

## Table of Contents

- [Overview](#overview)
- [GitHub Actions Workflows](#github-actions-workflows)
- [Code Quality Tools](#code-quality-tools)
- [Coverage Reporting](#coverage-reporting)
- [Running Checks Locally](#running-checks-locally)
- [Configuration Files](#configuration-files)
- [Troubleshooting](#troubleshooting)

## Overview

The Privacy Evaluation Platform uses GitHub Actions for automated testing, code quality checks, and coverage reporting. The CI/CD pipeline ensures code quality and reliability through automated checks on every push and pull request.

### Key Features

- ✅ Automated testing on multiple Node.js versions (18.x, 20.x)
- ✅ Solidity code linting with Solhint
- ✅ Code formatting verification with Prettier
- ✅ Code coverage reporting with Codecov
- ✅ Gas usage reporting
- ✅ Security vulnerability scanning
- ✅ Build verification

### Trigger Events

CI/CD workflows automatically run on:
- Push to `main` branch
- Push to `develop` branch
- Pull requests to `main` or `develop`

## GitHub Actions Workflows

### 1. Test and Quality Checks (`.github/workflows/test.yml`)

Main workflow for comprehensive testing and quality assurance.

#### Jobs

**lint-and-format**
- Runs Solidity linter (Solhint)
- Checks code formatting (Prettier)
- Node.js version: 18.x
- Fast feedback on code quality

**test-node-18**
- Runs full test suite on Node.js 18.x
- Generates coverage report
- Uploads to Codecov
- Matrix strategy for scalability

**test-node-20**
- Runs full test suite on Node.js 20.x
- Generates coverage report
- Uploads to Codecov
- Ensures compatibility with latest LTS

**gas-report**
- Generates gas usage reports
- Monitors contract efficiency
- Helps identify optimization opportunities

**security-check**
- Runs Solidity security analysis
- Checks for npm package vulnerabilities
- Continues on error for informational purposes

**build-check**
- Verifies clean build process
- Ensures artifacts are generated correctly
- Validates compilation

### 2. Code Coverage (`.github/workflows/codecov.yml`)

Dedicated workflow for detailed coverage analysis.

#### Features
- Comprehensive coverage report generation
- Upload to Codecov for visualization
- Archive coverage artifacts (30 days retention)
- Tracks coverage trends over time

### Workflow Diagram

```
Push/PR to main/develop
        |
        v
    Lint & Format Check
        |
        v
    +---+---+---+
    |   |   |   |
    v   v   v   v
   T18 T20 Gas Sec
        |
        v
   Build Check
        |
        v
  Codecov Upload
```

## Code Quality Tools

### Solhint (Solidity Linter)

Configuration file: `.solhint.json`

#### Enabled Rules

| Category | Rule | Severity | Description |
|----------|------|----------|-------------|
| Security | compiler-version | error | Enforce minimum compiler version |
| Security | state-visibility | error | Require explicit state visibility |
| Security | check-send-result | error | Check send() return values |
| Best Practices | func-visibility | error | Explicit function visibility |
| Best Practices | imports-on-top | error | Imports at file top |
| Style | max-line-length | warn | Max 140 characters |
| Style | quotes | error | Use double quotes |
| Gas | gas-custom-errors | off | Allow require statements |

#### Running Solhint

```bash
# Check all Solidity files
npm run lint:sol

# Auto-fix issues where possible
npm run lint:sol:fix

# Check specific file
npx solhint contracts/MyContract.sol
```

#### Configuration

```json
{
  "extends": "solhint:recommended",
  "rules": {
    "max-line-length": ["warn", 140],
    "compiler-version": ["error", ">=0.8.24"],
    "func-visibility": ["error", { "ignoreConstructors": true }]
  }
}
```

### Prettier (Code Formatter)

Configuration file: `.prettierrc.json`

#### Settings

| Setting | Value | Purpose |
|---------|-------|---------|
| printWidth | 120 | Max line width |
| tabWidth | 2 (JS), 4 (Sol) | Indentation size |
| semi | true | Always use semicolons |
| singleQuote | false | Use double quotes |
| trailingComma | es5 | ES5-compatible trailing commas |

#### Running Prettier

```bash
# Check formatting
npm run prettier:check

# Auto-format all files
npm run prettier:write

# Format specific file
npx prettier --write contracts/MyContract.sol
```

#### Ignored Files

- `node_modules/`
- `artifacts/`
- `cache/`
- `coverage/`
- `fhevmTemp/`
- `*.md` (documentation)
- `LICENSE`

## Coverage Reporting

### Codecov Integration

Coverage reports are automatically uploaded to Codecov after successful test runs.

#### Configuration (`codecov.yml`)

```yaml
coverage:
  precision: 2
  round: down
  range: "70...100"

  status:
    project:
      default:
        target: 80%
        threshold: 5%
```

#### Metrics

- **Target Coverage**: 80%
- **Threshold**: ±5% change allowed
- **Precision**: 2 decimal places
- **Range**: 70-100% (70% minimum)

#### Flags

- `unittests-node-18`: Coverage from Node.js 18.x
- `unittests-node-20`: Coverage from Node.js 20.x

#### Viewing Reports

1. **Online**: Check PR comments for Codecov report
2. **Local**: Open `coverage/lcov-report/index.html` after running `npm run coverage`

### Coverage Commands

```bash
# Generate coverage report
npm run coverage

# View HTML report
open coverage/lcov-report/index.html  # macOS
start coverage/lcov-report/index.html # Windows
xdg-open coverage/lcov-report/index.html # Linux
```

### Coverage Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Statements | 80% | - |
| Branches | 80% | - |
| Functions | 80% | - |
| Lines | 80% | - |

## Running Checks Locally

### Pre-Push Checklist

Before pushing code, run these commands:

```bash
# 1. Lint Solidity code
npm run lint:sol

# 2. Check formatting
npm run prettier:check

# 3. Run tests
npm test

# 4. Generate coverage
npm run coverage

# 5. Check gas usage
npm run test:gas
```

### All-in-One Check

```bash
# Run all quality checks
npm run lint && npm test && npm run coverage
```

### Git Hooks (Optional)

Install Husky for automatic pre-commit checks:

```bash
npm install --save-dev husky
npx husky init
```

Create `.husky/pre-commit`:
```bash
#!/bin/sh
npm run lint
npm test
```

## Configuration Files

### Overview

| File | Purpose | Location |
|------|---------|----------|
| `.github/workflows/test.yml` | Main CI workflow | Root |
| `.github/workflows/codecov.yml` | Coverage workflow | Root |
| `.solhint.json` | Solidity linter config | Root |
| `.solhintignore` | Solhint ignore patterns | Root |
| `.prettierrc.json` | Prettier config | Root |
| `.prettierignore` | Prettier ignore patterns | Root |
| `codecov.yml` | Codecov settings | Root |

### .github/workflows/test.yml

```yaml
name: Test and Quality Checks

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test-node-18:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18.x'
      - run: npm ci
      - run: npm test
```

### Secrets Required

Configure these secrets in GitHub repository settings:

| Secret | Description | Required |
|--------|-------------|----------|
| `CODECOV_TOKEN` | Codecov upload token | Yes |
| `ETHERSCAN_API_KEY` | For contract verification | Optional |

## Troubleshooting

### Common Issues

#### 1. Linting Errors

**Problem**: Solhint reports many warnings

**Solution**:
```bash
# Fix automatically where possible
npm run lint:sol:fix

# Or adjust rules in .solhint.json
```

#### 2. Formatting Failures

**Problem**: Prettier check fails

**Solution**:
```bash
# Auto-format all files
npm run prettier:write

# Check what changed
npm run prettier:check
```

#### 3. Tests Fail in CI but Pass Locally

**Problem**: Tests pass locally but fail in GitHub Actions

**Possible Causes**:
- Different Node.js versions
- Missing environment variables
- Timeout issues

**Solution**:
```bash
# Test with specific Node version
nvm use 18
npm test

# Increase timeout in hardhat.config.js
mocha: {
  timeout: 200000
}
```

#### 4. Coverage Upload Fails

**Problem**: Codecov upload fails

**Solution**:
1. Check `CODECOV_TOKEN` is set in repository secrets
2. Verify coverage files are generated: `ls -la coverage/`
3. Check Codecov status: https://status.codecov.io/

#### 5. Gas Report Not Generated

**Problem**: Gas report missing

**Solution**:
```bash
# Ensure environment variable is set
REPORT_GAS=true npm test

# Or use dedicated script
npm run test:gas
```

### Debug Mode

Enable verbose logging in workflows:

```yaml
- name: Run tests with debug
  run: DEBUG=* npm test
  env:
    NODE_DEBUG: '*'
```

### Viewing Workflow Logs

1. Go to GitHub repository
2. Click "Actions" tab
3. Select failed workflow
4. Click on failed job
5. Expand step to see detailed logs

## Best Practices

### For Developers

1. **Run checks before committing**
   ```bash
   npm run lint && npm test
   ```

2. **Write meaningful commit messages**
   ```
   feat: add project evaluation feature
   fix: resolve gas estimation issue
   test: add edge case tests
   ```

3. **Keep PRs small and focused**
   - One feature/fix per PR
   - Easier to review and test

4. **Respond to CI feedback**
   - Fix failing tests immediately
   - Address linting warnings
   - Maintain coverage levels

### For Reviewers

1. **Check CI status before reviewing**
   - All checks must pass
   - Coverage should not decrease significantly

2. **Review code quality**
   - Look for complex functions
   - Check for security issues
   - Verify test coverage

3. **Validate gas usage**
   - Check gas report for increases
   - Identify optimization opportunities

## Metrics and Monitoring

### Key Performance Indicators

| Metric | Target | Tracking |
|--------|--------|----------|
| Test Success Rate | 100% | GitHub Actions |
| Code Coverage | >80% | Codecov |
| Linting Warnings | <5 | Solhint |
| Build Time | <2 min | GitHub Actions |
| Gas Efficiency | Baseline | Gas Reporter |

### Badges

Add these badges to README.md:

```markdown
[![Tests](https://github.com/USER/REPO/workflows/Test/badge.svg)](https://github.com/USER/REPO/actions)
[![Coverage](https://codecov.io/gh/USER/REPO/branch/main/graph/badge.svg)](https://codecov.io/gh/USER/REPO)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
```

## Future Improvements

### Planned Enhancements

- [ ] Automated dependency updates (Dependabot)
- [ ] Scheduled security scans
- [ ] Performance regression testing
- [ ] Automated deployment to testnet
- [ ] Contract size monitoring
- [ ] Slither security analysis
- [ ] Mythril symbolic execution

### Integration Opportunities

- **Dependabot**: Automated dependency updates
- **Snyk**: Advanced security scanning
- **SonarCloud**: Code quality analysis
- **Slither**: Solidity static analysis
- **Echidna**: Fuzzy testing

## Resources

### Documentation
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Solhint Rules](https://github.com/protofire/solhint/blob/master/docs/rules.md)
- [Prettier Options](https://prettier.io/docs/en/options.html)
- [Codecov Documentation](https://docs.codecov.com/)

### Tools
- [Solhint](https://github.com/protofire/solhint) - Solidity linter
- [Prettier](https://prettier.io/) - Code formatter
- [Hardhat](https://hardhat.org/) - Development environment
- [Codecov](https://codecov.io/) - Coverage reporting

## Support

For CI/CD issues or questions:

1. Check workflow logs in GitHub Actions
2. Review this documentation
3. Search existing GitHub issues
4. Open a new issue with workflow logs

---

**Last Updated**: 2025-01-15

**Maintainer**: Privacy Evaluation Platform Team
