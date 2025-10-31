const { run, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Contract verification script for Etherscan
 * Verifies the deployed contract on Etherscan block explorer
 */
async function main() {
  console.log("\n========================================");
  console.log("Contract Verification");
  console.log("========================================\n");

  // Check network
  if (network.name === "hardhat" || network.name === "localhost") {
    console.log("Verification is not needed for local networks");
    console.log("Exiting...");
    return;
  }

  // Get contract address from command line or deployment file
  let contractAddress = process.argv[2];

  if (!contractAddress) {
    // Try to read from latest deployment file
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    const latestFile = path.join(deploymentsDir, `${network.name}-latest.json`);

    if (fs.existsSync(latestFile)) {
      const deploymentData = JSON.parse(fs.readFileSync(latestFile, "utf8"));
      contractAddress = deploymentData.contractAddress;
      console.log("Contract address loaded from deployment file");
    } else {
      console.error("Error: Contract address not provided and no deployment file found");
      console.log("\nUsage:");
      console.log("  npm run verify -- <CONTRACT_ADDRESS>");
      console.log("  or deploy first to generate deployment file");
      process.exit(1);
    }
  }

  console.log("Verification Information:");
  console.log("------------------------");
  console.log("Network:", network.name);
  console.log("Contract Address:", contractAddress);
  console.log("Contract Name: AnonymousInnovationEvaluation");
  console.log();

  // Verify on Etherscan
  console.log("Starting Etherscan verification...");
  console.log("This may take a few minutes...");
  console.log();

  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: [],
      contract: "contracts/AnonymousInnovationEvaluation.sol:AnonymousInnovationEvaluation",
    });

    console.log();
    console.log("========================================");
    console.log("Verification Successful!");
    console.log("========================================\n");

    console.log("Contract verified on Etherscan:");
    if (network.name === "sepolia") {
      console.log(`https://sepolia.etherscan.io/address/${contractAddress}#code`);
    } else if (network.name === "mainnet") {
      console.log(`https://etherscan.io/address/${contractAddress}#code`);
    }
    console.log();

  } catch (error) {
    if (error.message.toLowerCase().includes("already verified")) {
      console.log();
      console.log("========================================");
      console.log("Contract Already Verified");
      console.log("========================================\n");

      console.log("This contract has already been verified on Etherscan");
      if (network.name === "sepolia") {
        console.log(`View at: https://sepolia.etherscan.io/address/${contractAddress}#code`);
      } else if (network.name === "mainnet") {
        console.log(`View at: https://etherscan.io/address/${contractAddress}#code`);
      }
      console.log();
    } else {
      console.error("\n========================================");
      console.error("Verification Failed!");
      console.error("========================================\n");
      console.error("Error:", error.message);
      console.log();
      console.log("Common issues:");
      console.log("1. Make sure ETHERSCAN_API_KEY is set in .env file");
      console.log("2. Wait a few blocks after deployment before verifying");
      console.log("3. Check that the contract address is correct");
      console.log("4. Ensure the network is correctly configured");
      console.log();
      process.exit(1);
    }
  }

  console.log("Verification process completed!");
  console.log();
}

// Execute verification
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("\n========================================");
      console.error("Verification Script Failed!");
      console.error("========================================\n");
      console.error("Error:", error.message);
      if (error.stack) {
        console.error("\nStack Trace:");
        console.error(error.stack);
      }
      process.exit(1);
    });
}

module.exports = main;
