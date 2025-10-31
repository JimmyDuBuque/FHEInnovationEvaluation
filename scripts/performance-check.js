const { exec } = require("child_process");
const util = require("util");
const fs = require("fs");
const path = require("path");
const execPromise = util.promisify(exec);

/**
 * Performance Optimization Check Script
 * Analyzes contract performance and gas efficiency
 */

const GAS_LIMITS = {
  DEPLOYMENT: 3000000,
  PROJECT_SUBMISSION: 300000,
  EVALUATION_SUBMISSION: 500000,
  OWNER_FUNCTIONS: 200000,
};

class PerformanceChecker {
  constructor() {
    this.metrics = {
      gasUsage: {},
      contractSize: {},
      optimizationSuggestions: [],
    };
  }

  async checkContractSize() {
    console.log("\n" + "=".repeat(60));
    console.log("CONTRACT SIZE ANALYSIS");
    console.log("=".repeat(60));

    try {
      const artifactsPath = path.join(__dirname, "..", "artifacts", "contracts");

      if (!fs.existsSync(artifactsPath)) {
        console.log("⚠️  Artifacts not found. Run 'npm run compile' first.");
        return;
      }

      const contracts = this.findContracts(artifactsPath);

      contracts.forEach((contract) => {
        const artifact = JSON.parse(fs.readFileSync(contract.path, "utf8"));
        const bytecodeSize = artifact.deployedBytecode ? artifact.deployedBytecode.length / 2 : 0;
        const maxSize = 24576; // 24KB limit

        this.metrics.contractSize[contract.name] = {
          size: bytecodeSize,
          maxSize: maxSize,
          percentage: ((bytecodeSize / maxSize) * 100).toFixed(2),
        };

        console.log(`\n📦 ${contract.name}`);
        console.log(`   Size: ${bytecodeSize} bytes`);
        console.log(`   Limit: ${maxSize} bytes`);
        console.log(`   Usage: ${this.metrics.contractSize[contract.name].percentage}%`);

        if (bytecodeSize > maxSize) {
          console.log(`   ❌ EXCEEDS LIMIT!`);
          this.metrics.optimizationSuggestions.push(
            `${contract.name}: Contract size exceeds 24KB limit. Consider splitting into multiple contracts.`
          );
        } else if (bytecodeSize > maxSize * 0.9) {
          console.log(`   ⚠️  Near limit (>90%)`);
          this.metrics.optimizationSuggestions.push(
            `${contract.name}: Contract size is near limit. Consider optimization.`
          );
        } else {
          console.log(`   ✅ Within limits`);
        }
      });
    } catch (error) {
      console.error("Error checking contract size:", error.message);
    }
  }

  findContracts(dir) {
    const contracts = [];

    const files = fs.readdirSync(dir);
    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        contracts.push(...this.findContracts(filePath));
      } else if (file.endsWith(".json") && !file.endsWith(".dbg.json")) {
        contracts.push({
          name: file.replace(".json", ""),
          path: filePath,
        });
      }
    });

    return contracts;
  }

  async analyzeGasUsage() {
    console.log("\n" + "=".repeat(60));
    console.log("GAS USAGE ANALYSIS");
    console.log("=".repeat(60));

    try {
      console.log("\nRunning tests with gas reporting...");
      const { stdout } = await execPromise("REPORT_GAS=true npm test", {
        env: { ...process.env, REPORT_GAS: "true" },
      });

      // Parse gas report from test output
      const gasLines = stdout.split("\n").filter((line) => line.includes("gas"));

      if (gasLines.length > 0) {
        console.log("\nGas Usage Report:");
        gasLines.forEach((line) => {
          console.log(`  ${line}`);
        });
      }

      console.log("\n✅ Gas analysis complete");
    } catch (error) {
      console.error("⚠️  Could not analyze gas usage:", error.message);
    }
  }

  async checkOptimizationSettings() {
    console.log("\n" + "=".repeat(60));
    console.log("OPTIMIZATION SETTINGS");
    console.log("=".repeat(60));

    try {
      const configPath = path.join(__dirname, "..", "hardhat.config.js");
      const config = fs.readFileSync(configPath, "utf8");

      const optimizerEnabled = config.includes('enabled: true');
      const runsMatch = config.match(/runs:\s*(\d+)/);
      const runs = runsMatch ? parseInt(runsMatch[1]) : 0;

      console.log("\nCurrent Settings:");
      console.log(`  Optimizer Enabled: ${optimizerEnabled ? "✅ Yes" : "❌ No"}`);
      console.log(`  Optimization Runs: ${runs}`);

      if (!optimizerEnabled) {
        this.metrics.optimizationSuggestions.push("Enable Solidity optimizer for better gas efficiency");
      }

      if (runs < 200) {
        this.metrics.optimizationSuggestions.push(
          "Increase optimization runs (200-1000) for frequently called functions"
        );
      } else if (runs > 1000) {
        console.log("  ⚠️  High optimization runs may increase deployment cost");
      } else {
        console.log("  ✅ Optimization settings are balanced");
      }
    } catch (error) {
      console.error("Error checking optimization settings:", error.message);
    }
  }

  printSummary() {
    console.log("\n" + "=".repeat(60));
    console.log("PERFORMANCE SUMMARY");
    console.log("=".repeat(60));

    if (this.metrics.optimizationSuggestions.length > 0) {
      console.log("\n💡 Optimization Suggestions:");
      this.metrics.optimizationSuggestions.forEach((suggestion, index) => {
        console.log(`  ${index + 1}. ${suggestion}`);
      });
    } else {
      console.log("\n✅ No optimization suggestions - code is well optimized!");
    }

    console.log("\n" + "=".repeat(60));
  }

  async runAllChecks() {
    console.log("\n" + "=".repeat(60));
    console.log("PERFORMANCE CHECK SUITE");
    console.log("=".repeat(60));

    await this.checkContractSize();
    await this.checkOptimizationSettings();
    await this.analyzeGasUsage();
    this.printSummary();

    return this.metrics;
  }
}

// Run performance checks
async function main() {
  const checker = new PerformanceChecker();
  await checker.runAllChecks();
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Performance check script error:", error);
    process.exit(1);
  });
}

module.exports = { PerformanceChecker };
