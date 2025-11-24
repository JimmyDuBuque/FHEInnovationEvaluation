const hre = require("hardhat");
const ethers = hre.ethers;
const fs = require("fs");
const path = require("path");

// Color codes for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function main() {
  log("\n=== DApp 150 Smart Contract Deployment ===\n", colors.bright);

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  log(`Deploying contracts from account: ${deployer.address}`, colors.cyan);

  // Get network information
  const network = await ethers.provider.getNetwork();
  log(`Network: ${network.name} (Chain ID: ${network.chainId})`, colors.cyan);

  // Get account balance
  const balance = await ethers.provider.getBalance(deployer.address);
  log(`Account balance: ${ethers.utils.formatEther(balance)} ETH\n`, colors.cyan);

  try {
    // ============== 1. Deploy SecurityValidator ==============
    log("Deploying SecurityValidator contract...", colors.yellow);
    const SecurityValidator = await ethers.getContractFactory("SecurityValidator");
    const securityValidator = await SecurityValidator.deploy();
    await securityValidator.deployed();

    log(`SecurityValidator deployed at: ${securityValidator.address}`, colors.green);
    log(`Deployment transaction: ${securityValidator.deployTransaction.hash}\n`, colors.blue);

    // ============== 2. Deploy PrivacyPreservingDivision ==============
    log("Deploying PrivacyPreservingDivision contract...", colors.yellow);
    const PrivacyPreservingDivision = await ethers.getContractFactory(
      "PrivacyPreservingDivision"
    );
    const privacyPreservingDivision = await PrivacyPreservingDivision.deploy();
    await privacyPreservingDivision.deployed();

    log(
      `PrivacyPreservingDivision deployed at: ${privacyPreservingDivision.address}`,
      colors.green
    );
    log(
      `Deployment transaction: ${privacyPreservingDivision.deployTransaction.hash}\n`,
      colors.blue
    );

    // ============== 3. Deploy PriceObfuscation ==============
    log("Deploying PriceObfuscation contract...", colors.yellow);
    const PriceObfuscation = await ethers.getContractFactory("PriceObfuscation");
    const priceObfuscation = await PriceObfuscation.deploy();
    await priceObfuscation.deployed();

    log(`PriceObfuscation deployed at: ${priceObfuscation.address}`, colors.green);
    log(`Deployment transaction: ${priceObfuscation.deployTransaction.hash}\n`, colors.blue);

    // ============== 4. Deploy GatewayTransaction ==============
    log("Deploying GatewayTransaction contract...", colors.yellow);

    // Use deployer as gateway address (can be changed later)
    const gatewayAddress = deployer.address;
    log(`Using gateway address: ${gatewayAddress}`, colors.cyan);

    const GatewayTransaction = await ethers.getContractFactory("GatewayTransaction");
    const gatewayTransaction = await GatewayTransaction.deploy(gatewayAddress);
    await gatewayTransaction.deployed();

    log(`GatewayTransaction deployed at: ${gatewayTransaction.address}`, colors.green);
    log(`Deployment transaction: ${gatewayTransaction.deployTransaction.hash}\n`, colors.blue);

    // ============== 5. Setup Initial Configuration ==============
    log("Setting up initial configuration...", colors.yellow);

    // Set default timeout to 1 hour (3600 seconds)
    const DEFAULT_TIMEOUT = 3600;
    log(`Setting request timeout to ${DEFAULT_TIMEOUT} seconds...`, colors.cyan);

    const timeoutTx = await gatewayTransaction.setRequestTimeout(DEFAULT_TIMEOUT);
    await timeoutTx.wait();
    log(`Timeout set successfully. Transaction: ${timeoutTx.hash}`, colors.green);

    // Verify timeout was set
    const timeout = await gatewayTransaction.requestTimeout();
    log(`Verified timeout: ${timeout.toString()} seconds\n`, colors.green);

    // ============== 6. Verify Ownership and Permissions ==============
    log("Verifying ownership and permissions...", colors.yellow);

    const owner = await gatewayTransaction.owner();
    const gateway = await gatewayTransaction.gatewayAddress();

    log(`Contract owner: ${owner}`, colors.cyan);
    log(`Gateway address: ${gateway}`, colors.cyan);

    if (owner === deployer.address) {
      log("Owner verification: PASSED", colors.green);
    } else {
      log("Owner verification: FAILED", colors.yellow);
    }

    if (gateway === gatewayAddress) {
      log("Gateway verification: PASSED\n", colors.green);
    } else {
      log("Gateway verification: FAILED\n", colors.yellow);
    }

    // ============== 7. Log Deployment Summary ==============
    log("\n=== Deployment Summary ===\n", colors.bright);

    const deploymentSummary = {
      network: network.name,
      chainId: network.chainId,
      deployer: deployer.address,
      deploymentDate: new Date().toISOString(),
      contracts: {
        SecurityValidator: {
          address: securityValidator.address,
          txHash: securityValidator.deployTransaction.hash,
          blockNumber: securityValidator.deployTransaction.blockNumber,
        },
        PrivacyPreservingDivision: {
          address: privacyPreservingDivision.address,
          txHash: privacyPreservingDivision.deployTransaction.hash,
          blockNumber: privacyPreservingDivision.deployTransaction.blockNumber,
        },
        PriceObfuscation: {
          address: priceObfuscation.address,
          txHash: priceObfuscation.deployTransaction.hash,
          blockNumber: priceObfuscation.deployTransaction.blockNumber,
        },
        GatewayTransaction: {
          address: gatewayTransaction.address,
          txHash: gatewayTransaction.deployTransaction.hash,
          blockNumber: gatewayTransaction.deployTransaction.blockNumber,
          owner: owner,
          gatewayAddress: gateway,
          requestTimeout: timeout.toString(),
        },
      },
    };

    // Log to console
    log("SecurityValidator", colors.cyan);
    log(`  Address: ${deploymentSummary.contracts.SecurityValidator.address}`, colors.blue);
    log(
      `  Transaction: ${deploymentSummary.contracts.SecurityValidator.txHash}`,
      colors.blue
    );

    log("\nPrivacyPreservingDivision", colors.cyan);
    log(
      `  Address: ${deploymentSummary.contracts.PrivacyPreservingDivision.address}`,
      colors.blue
    );
    log(
      `  Transaction: ${deploymentSummary.contracts.PrivacyPreservingDivision.txHash}`,
      colors.blue
    );

    log("\nPriceObfuscation", colors.cyan);
    log(`  Address: ${deploymentSummary.contracts.PriceObfuscation.address}`, colors.blue);
    log(`  Transaction: ${deploymentSummary.contracts.PriceObfuscation.txHash}`, colors.blue);

    log("\nGatewayTransaction (Primary Contract)", colors.cyan);
    log(`  Address: ${deploymentSummary.contracts.GatewayTransaction.address}`, colors.blue);
    log(`  Transaction: ${deploymentSummary.contracts.GatewayTransaction.txHash}`, colors.blue);
    log(`  Owner: ${deploymentSummary.contracts.GatewayTransaction.owner}`, colors.blue);
    log(
      `  Gateway: ${deploymentSummary.contracts.GatewayTransaction.gatewayAddress}`,
      colors.blue
    );
    log(`  Timeout: ${deploymentSummary.contracts.GatewayTransaction.requestTimeout}s`, colors.blue);

    // ============== 8. Save Deployment Info to File ==============
    log("\n\nSaving deployment information...", colors.yellow);

    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const deploymentFileName = `deployment-${network.name}-${Date.now()}.json`;
    const deploymentFilePath = path.join(deploymentsDir, deploymentFileName);

    fs.writeFileSync(deploymentFilePath, JSON.stringify(deploymentSummary, null, 2));
    log(`Deployment info saved to: ${deploymentFilePath}`, colors.green);

    // Also save latest deployment
    const latestFilePath = path.join(deploymentsDir, "latest.json");
    fs.writeFileSync(latestFilePath, JSON.stringify(deploymentSummary, null, 2));
    log(`Latest deployment saved to: ${latestFilePath}`, colors.green);

    // ============== 9. Post-Deployment Instructions ==============
    log("\n\n=== Post-Deployment Instructions ===\n", colors.bright);

    log("1. VERIFY CONTRACTS ON BLOCK EXPLORER", colors.yellow);
    const explorerUrl =
      network.chainId === 11155111
        ? "https://sepolia.etherscan.io"
        : `https://explorer.${network.name}.io`;
    log(`   Go to: ${explorerUrl}`, colors.cyan);
    log(
      `   Verify each contract with its deployment transaction hash`,
      colors.cyan
    );

    log("\n2. UPDATE ENVIRONMENT VARIABLES", colors.yellow);
    log(`   GATEWAY_ADDRESS=${deploymentSummary.contracts.GatewayTransaction.address}`, colors.cyan);
    log(`   OWNER_ADDRESS=${deploymentSummary.contracts.GatewayTransaction.owner}`, colors.cyan);

    log("\n3. CONFIGURE GATEWAY SERVICE", colors.yellow);
    log(`   Update your gateway service with these addresses:`, colors.cyan);
    log(`   - GatewayTransaction: ${deploymentSummary.contracts.GatewayTransaction.address}`, colors.cyan);
    log(`   - SecurityValidator: ${deploymentSummary.contracts.SecurityValidator.address}`, colors.cyan);

    log("\n4. RUN INTEGRATION TESTS", colors.yellow);
    log(`   npm test`, colors.cyan);

    log("\n5. MONITOR DEPLOYMENTS", colors.yellow);
    log(`   Check deployments/latest.json for latest deployment info`, colors.cyan);

    // ============== 10. Summary ==============
    log("\n\n=== Deployment Complete ===\n", colors.bright);
    log(`All contracts deployed successfully!`, colors.green);
    log(`Total contracts deployed: 4`, colors.green);
    log(`Network: ${network.name}`, colors.green);
    log(`Block number: ${await ethers.provider.getBlockNumber()}`, colors.green);

    return deploymentSummary;
  } catch (error) {
    log("\n\nDeployment failed with error:", colors.yellow);
    console.error(error);
    process.exitCode = 1;
  }
}

// Execute deployment
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

module.exports = { main };
