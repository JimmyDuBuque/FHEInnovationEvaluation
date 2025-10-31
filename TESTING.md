# Testing Documentation

Comprehensive testing documentation for the Privacy Evaluation Platform.

## Table of Contents

- [Test Overview](#test-overview)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Test Coverage](#test-coverage)
- [Test Categories](#test-categories)
- [Writing New Tests](#writing-new-tests)
- [Continuous Integration](#continuous-integration)

## Test Overview

The Privacy Evaluation Platform includes a comprehensive test suite with **58 test cases** covering all critical functionality, edge cases, and performance requirements.

### Test Statistics

| Category | Test Count | Coverage |
|----------|------------|----------|
| Deployment & Initialization | 8 | 100% |
| Project Submission | 10 | 100% |
| Evaluation Submission | 12 | 100% |
| Access Control | 9 | 100% |
| View Functions | 4 | 100% |
| Edge Cases | 7 | 100% |
| Gas Optimization | 3 | 100% |
| Integration Scenarios | 5 | 100% |
| **Total** | **58** | **100%** |

### Technology Stack

- **Test Framework**: Mocha + Chai
- **Development Framework**: Hardhat
- **Assertions**: Chai Matchers
- **Network**: Hardhat Local Network
- **Language**: JavaScript (ES6+)

## Running Tests

### Basic Test Commands

```bash
# Run all tests
npm test

# Run tests with gas reporting
REPORT_GAS=true npm test

# Run tests with coverage
npm run coverage

# Run specific test file
npx hardhat test test/EvaluationContract.test.js

# Run tests on Sepolia testnet
npm run test:sepolia
```

### Expected Output

```
Privacy Evaluation Platform - Comprehensive Tests
  Deployment and Initialization
    ✔ should deploy successfully with valid address
    ✔ should set deployer as contract owner
    ✔ should initialize with nextProjectId as 1
    ...

58 passing (1s)
```

## Test Structure

### File Organization

```
test/
└── EvaluationContract.test.js    # Main test suite (58 tests)
```

### Test Template

```javascript
describe("Feature Name", function () {
  let contract, contractAddress;
  let deployer, alice, bob;

  beforeEach(async function () {
    ({ contract, contractAddress } = await deployFixture());
  });

  it("should perform expected behavior", async function () {
    // Arrange
    await contract.connect(alice).submitProject("Title", "Desc");

    // Act
    const result = await contract.getProjectInfo(1);

    // Assert
    expect(result[0]).to.equal("Title");
  });
});
```

## Test Coverage

### 1. Deployment and Initialization Tests (8 tests)

Tests contract deployment and initial state verification.

**Coverage:**
- Contract address validation
- Owner assignment
- State variable initialization
- Evaluation period setup
- Authorization state

**Example:**
```javascript
it("should deploy successfully with valid address", async function () {
  expect(contractAddress).to.be.properAddress;
  expect(contractAddress).to.not.equal(ethers.ZeroAddress);
});
```

### 2. Project Submission Tests (10 tests)

Tests project creation and storage functionality.

**Coverage:**
- Project submission by different users
- Event emission
- State updates (nextProjectId, project count)
- Project data storage (title, description, submitter)
- Project status initialization
- Multiple project handling

**Example:**
```javascript
it("should emit ProjectSubmitted event on submission", async function () {
  await expect(
    contract.connect(alice).submitProject("Test Project", "Description")
  )
    .to.emit(contract, "ProjectSubmitted")
    .withArgs(1, alice.address, "Test Project");
});
```

### 3. Evaluation Submission Tests (12 tests)

Tests evaluation system and score validation.

**Coverage:**
- Valid evaluation submission
- Score range validation (0-10)
- Duplicate prevention
- Evaluation counting
- Multiple evaluator support
- Event emission
- Invalid input rejection

**Example:**
```javascript
it("should reject evaluation with innovation score > 10", async function () {
  await expect(
    contract.connect(bob).submitEvaluation(1, 11, 7, 9, 8)
  ).to.be.reverted;
});
```

### 4. Access Control Tests (9 tests)

Tests permission and authorization mechanisms.

**Coverage:**
- Owner-only functions
- Evaluator authorization
- Evaluator revocation
- Permission enforcement
- Unauthorized access prevention
- Event emission for auth changes

**Example:**
```javascript
it("should prevent non-owner from authorizing evaluator", async function () {
  await expect(
    contract.connect(alice).authorizeEvaluator(bob.address)
  ).to.be.reverted;
});
```

### 5. View Functions Tests (4 tests)

Tests read-only query functions.

**Coverage:**
- Project information retrieval
- Evaluation period queries
- Project listing by period
- Evaluation status checking

**Example:**
```javascript
it("should return projects by period", async function () {
  const projects = await contract.getProjectsByPeriod(1);
  expect(projects.length).to.equal(2);
});
```

### 6. Edge Cases Tests (7 tests)

Tests boundary conditions and unusual inputs.

**Coverage:**
- Zero values
- Maximum values
- Empty strings
- Very long strings
- Non-existent entities
- Multiple concurrent operations

**Example:**
```javascript
it("should handle evaluation with all zeros", async function () {
  await expect(
    contract.connect(bob).submitEvaluation(1, 0, 0, 0, 0)
  ).to.not.be.reverted;
});
```

### 7. Gas Optimization Tests (3 tests)

Tests gas efficiency of operations.

**Coverage:**
- Deployment gas usage
- Project submission efficiency
- Evaluation submission efficiency

**Thresholds:**
- Deployment: < 3M gas
- Project submission: < 300k gas
- Evaluation submission: < 500k gas (FHE operations)

**Example:**
```javascript
it("should deploy within reasonable gas limits", async function () {
  const receipt = await (await contract.deploymentTransaction()).wait();
  expect(receipt.gasUsed).to.be.lt(3000000);
});
```

### 8. Integration Scenarios Tests (5 tests)

Tests complex multi-step workflows.

**Coverage:**
- Complete evaluation workflow
- Multiple projects and evaluations
- State consistency across operations
- Authorization workflows
- Sequential operations

**Example:**
```javascript
it("should handle complete evaluation workflow", async function () {
  // Submit project
  await contract.connect(alice).submitProject("Innovation", "Revolutionary idea");

  // Multiple evaluations
  await contract.connect(bob).submitEvaluation(1, 9, 8, 9, 8);
  await contract.connect(charlie).submitEvaluation(1, 8, 9, 8, 9);

  // Verify state
  const projectInfo = await contract.getProjectInfo(1);
  expect(projectInfo[5]).to.equal(2);
});
```

## Writing New Tests

### Test Guidelines

1. **Descriptive Names**: Use clear, descriptive test names
   ```javascript
   // Good
   it("should reject evaluation with innovation score > 10")

   // Bad
   it("test evaluation")
   ```

2. **Arrange-Act-Assert Pattern**:
   ```javascript
   it("should do something", async function () {
     // Arrange: Setup test conditions
     await contract.connect(alice).submitProject("Title", "Desc");

     // Act: Execute the function
     const result = await contract.getProjectInfo(1);

     // Assert: Verify expectations
     expect(result[0]).to.equal("Title");
   });
   ```

3. **Isolation**: Each test should be independent
   ```javascript
   beforeEach(async function () {
     // Deploy fresh contract for each test
     ({ contract, contractAddress } = await deployFixture());
   });
   ```

4. **Explicit Assertions**: Be specific about expectations
   ```javascript
   // Good
   expect(value).to.equal(100);

   // Avoid
   expect(value).to.be.ok;
   ```

### Adding New Test Categories

1. Create new `describe` block:
   ```javascript
   describe("New Feature", function () {
     it("should behave correctly", async function () {
       // Test implementation
     });
   });
   ```

2. Update test count in documentation

3. Run tests to verify:
   ```bash
   npm test
   ```

## Test Fixtures

### Deployment Fixture

```javascript
async function deployFixture() {
  const ContractFactory = await ethers.getContractFactory("AnonymousInnovationEvaluation");
  const contract = await ContractFactory.deploy();
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}
```

### Signer Setup

```javascript
before(async function () {
  const signers = await ethers.getSigners();
  deployer = signers[0];
  alice = signers[1];
  bob = signers[2];
  charlie = signers[3];
});
```

## Common Testing Patterns

### Testing Events

```javascript
await expect(
  contract.connect(alice).submitProject("Title", "Desc")
)
  .to.emit(contract, "ProjectSubmitted")
  .withArgs(1, alice.address, "Title");
```

### Testing Reverts

```javascript
await expect(
  contract.connect(alice).ownerOnlyFunction()
).to.be.reverted;
```

### Testing State Changes

```javascript
const before = await contract.nextProjectId();
await contract.connect(alice).submitProject("Title", "Desc");
const after = await contract.nextProjectId();

expect(after).to.equal(before + 1n);
```

### Gas Measurement

```javascript
const tx = await contract.connect(alice).submitProject("Title", "Desc");
const receipt = await tx.wait();

expect(receipt.gasUsed).to.be.lt(300000);
```

## Test Assertions Reference

### Chai Matchers

```javascript
// Equality
expect(value).to.equal(expected);
expect(value).to.not.equal(unexpected);

// Booleans
expect(value).to.be.true;
expect(value).to.be.false;

// Numbers
expect(value).to.be.gt(100);  // greater than
expect(value).to.be.lt(200);  // less than
expect(value).to.be.gte(100); // greater than or equal
expect(value).to.be.lte(200); // less than or equal
expect(value).to.be.closeTo(target, delta);

// Addresses
expect(address).to.be.properAddress;
expect(address).to.equal(expectedAddress);

// Reverts
await expect(tx).to.be.reverted;
await expect(tx).to.be.revertedWith("Error message");

// Events
await expect(tx).to.emit(contract, "EventName");
await expect(tx).to.emit(contract, "EventName").withArgs(arg1, arg2);
```

## Continuous Integration

### GitHub Actions

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - run: npm run coverage
```

### Pre-commit Hook

```bash
#!/bin/sh
npm test || exit 1
```

## Coverage Reports

Generate coverage report:

```bash
npm run coverage
```

Expected output:
```
--------------------------|---------|----------|---------|---------|
File                      | % Stmts | % Branch | % Funcs | % Lines |
--------------------------|---------|----------|---------|---------|
contracts/                |     100 |      100 |     100 |     100 |
  AnonymousInnovation...  |     100 |      100 |     100 |     100 |
--------------------------|---------|----------|---------|---------|
All files                 |     100 |      100 |     100 |     100 |
--------------------------|---------|----------|---------|---------|
```

## Troubleshooting

### Common Issues

**Problem**: Tests timeout
```bash
# Solution: Increase timeout in hardhat.config.js
mocha: {
  timeout: 200000
}
```

**Problem**: Gas estimation fails
```bash
# Solution: Check network connection and RPC
npx hardhat test --network localhost
```

**Problem**: Nonce issues
```bash
# Solution: Reset Hardhat network
npm run clean
```

### Debug Mode

Run tests with verbose logging:

```bash
npx hardhat test --verbose
```

Enable stack traces:

```bash
npx hardhat test --show-stack-traces
```

## Best Practices

### DO:
- ✅ Write descriptive test names
- ✅ Test both success and failure cases
- ✅ Use beforeEach for test isolation
- ✅ Test edge cases and boundary conditions
- ✅ Measure gas usage for critical operations
- ✅ Test event emissions
- ✅ Verify state changes

### DON'T:
- ❌ Write tests that depend on each other
- ❌ Use hardcoded addresses
- ❌ Skip error case testing
- ❌ Ignore gas costs
- ❌ Test implementation details
- ❌ Use setTimeout or arbitrary delays

## Performance Benchmarks

| Operation | Average Gas | Max Gas | Target |
|-----------|-------------|---------|--------|
| Deploy Contract | ~2.5M | 3M | ✅ |
| Submit Project | ~150k | 300k | ✅ |
| Submit Evaluation | ~480k | 500k | ✅ |
| Authorize Evaluator | ~50k | 100k | ✅ |

## Resources

### Documentation
- [Hardhat Testing Guide](https://hardhat.org/hardhat-runner/docs/guides/test-contracts)
- [Chai Assertions](https://www.chaijs.com/api/bdd/)
- [Ethers.js Testing](https://docs.ethers.org/v6/)

### Tools
- [Hardhat](https://hardhat.org/) - Development environment
- [Mocha](https://mochajs.org/) - Test framework
- [Chai](https://www.chaijs.com/) - Assertion library

## Changelog

### Version 1.0.0 (2025-01-15)
- Initial test suite with 58 comprehensive tests
- 100% code coverage
- Full integration test scenarios
- Gas optimization tests
- Edge case coverage

---

For questions or issues with testing, please refer to the main [README.md](./README.md) or open an issue on GitHub.
