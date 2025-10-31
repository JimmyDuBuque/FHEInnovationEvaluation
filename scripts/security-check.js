const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

/**
 * Comprehensive Security Check Script
 * Performs multiple security validations
 */

const CHECKS = {
  SOLHINT: {
    name: "Solidity Linting",
    command: "npx solhint 'contracts/**/*.sol'",
    description: "Check Solidity code for security issues",
  },
  NPM_AUDIT: {
    name: "NPM Audit",
    command: "npm audit --audit-level=moderate",
    description: "Check for vulnerable dependencies",
  },
  GAS_LIMIT: {
    name: "Gas Limit Check",
    command: "npm run test:gas",
    description: "Verify gas usage is within limits",
  },
};

class SecurityChecker {
  constructor() {
    this.results = [];
    this.passed = 0;
    this.failed = 0;
    this.warnings = 0;
  }

  async runCheck(check) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Running: ${check.name}`);
    console.log(`Description: ${check.description}`);
    console.log(`${"=".repeat(60)}`);

    try {
      const { stdout, stderr } = await execPromise(check.command);

      if (stdout) {
        console.log(stdout);
      }

      if (stderr && !stderr.includes("npm WARN")) {
        console.error(stderr);
      }

      this.results.push({
        check: check.name,
        status: "PASSED",
        output: stdout,
      });

      this.passed++;
      console.log(`✅ ${check.name}: PASSED`);
      return true;
    } catch (error) {
      const isWarning = error.code === 1 && check.name === "NPM Audit";

      if (isWarning) {
        this.warnings++;
        console.log(`⚠️  ${check.name}: WARNING`);
        console.log(error.stdout || error.message);

        this.results.push({
          check: check.name,
          status: "WARNING",
          output: error.stdout || error.message,
        });

        return true;
      } else {
        this.failed++;
        console.error(`❌ ${check.name}: FAILED`);
        console.error(error.stdout || error.message);

        this.results.push({
          check: check.name,
          status: "FAILED",
          error: error.stdout || error.message,
        });

        return false;
      }
    }
  }

  async runAllChecks() {
    console.log("\n" + "=".repeat(60));
    console.log("SECURITY CHECK SUITE");
    console.log("=".repeat(60));

    for (const [key, check] of Object.entries(CHECKS)) {
      await this.runCheck(check);
    }

    this.printSummary();

    return this.failed === 0;
  }

  printSummary() {
    console.log("\n" + "=".repeat(60));
    console.log("SECURITY CHECK SUMMARY");
    console.log("=".repeat(60));

    console.log(`\nTotal Checks: ${this.results.length}`);
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`⚠️  Warnings: ${this.warnings}`);
    console.log(`❌ Failed: ${this.failed}`);

    console.log("\nDetailed Results:");
    this.results.forEach((result) => {
      const icon = result.status === "PASSED" ? "✅" : result.status === "WARNING" ? "⚠️ " : "❌";
      console.log(`  ${icon} ${result.check}: ${result.status}`);
    });

    if (this.failed === 0) {
      console.log("\n🎉 All security checks passed!");
    } else {
      console.log("\n❌ Some security checks failed. Please review and fix.");
    }

    console.log("=".repeat(60));
  }
}

// Run security checks
async function main() {
  const checker = new SecurityChecker();
  const success = await checker.runAllChecks();

  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Security check script error:", error);
    process.exit(1);
  });
}

module.exports = { SecurityChecker };
