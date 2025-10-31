const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Main deployment script for the Privacy Evaluation Platform
 * Deploys the contract and saves deployment information
 */
async function main() {
  console.log("\n========================================");
  console.log("Privacy Evaluation Platform Deployment");
  console.log("========================================\n");

  // Get deployment information
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("Network Information:");
  console.log("-------------------");
  console.log("Network Name:", network.name);
  console.log("Chain ID:", network.config.chainId);
  console.log("RPC URL:", network.config.url || "default");
  console.log();

  console.log("Deployer Information:");
  console.log("--------------------");
  console.log("Address:", deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");
  console.log();

  // Check if deployer has sufficient balance
  if (balance === 0n) {
    console.error("Error: Deployer account has no balance!");
    console.error("Please fund the account with test ETH before deploying.");
    process.exit(1);
  }

  // Get contract factory
  console.log("Preparing Contract Deployment...");
  console.log("--------------------------------");

  const ContractFactory = await ethers.getContractFactory("AnonymousInnovationEvaluation");
  console.log("Contract Factory Created: AnonymousInnovationEvaluation");
  console.log();

  // Deploy contract
  console.log("Deploying Contract...");
  console.log("Please wait for transaction confirmation...");

  const deploymentStartTime = Date.now();
  const contract = await ContractFactory.deploy();

  console.log("Transaction Hash:", contract.deploymentTransaction().hash);
  console.log("Waiting for confirmation...");

  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  const deploymentEndTime = Date.now();

  console.log();
  console.log("========================================");
  console.log("Deployment Successful!");
  console.log("========================================\n");

  // Display deployment results
  console.log("Contract Information:");
  console.log("--------------------");
  console.log("Contract Address:", contractAddress);
  console.log("Deployer Address:", deployer.address);
  console.log("Network:", network.name);
  console.log("Chain ID:", network.config.chainId);
  console.log("Deployment Time:", ((deploymentEndTime - deploymentStartTime) / 1000).toFixed(2), "seconds");
  console.log();

  // Get transaction receipt for gas information
  const receipt = await contract.deploymentTransaction().wait();
  console.log("Gas Information:");
  console.log("----------------");
  console.log("Gas Used:", receipt.gasUsed.toString());
  console.log("Gas Price:", ethers.formatUnits(receipt.gasPrice || 0, "gwei"), "gwei");
  console.log("Total Cost:", ethers.formatEther(receipt.gasUsed * (receipt.gasPrice || 0n)), "ETH");
  console.log();

  // Display Etherscan link for Sepolia
  if (network.name === "sepolia") {
    console.log("Verification:");
    console.log("-------------");
    console.log("Etherscan URL:", `https://sepolia.etherscan.io/address/${contractAddress}`);
    console.log("Transaction URL:", `https://sepolia.etherscan.io/tx/${contract.deploymentTransaction().hash}`);
    console.log();
    console.log("To verify on Etherscan, run:");
    console.log(`npm run verify -- ${contractAddress}`);
    console.log();
  }

  // Save deployment information
  const deploymentInfo = {
    network: network.name,
    chainId: network.config.chainId,
    contractAddress: contractAddress,
    deployerAddress: deployer.address,
    deploymentTransaction: contract.deploymentTransaction().hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    gasPrice: receipt.gasPrice ? receipt.gasPrice.toString() : "0",
    timestamp: new Date().toISOString(),
    contractName: "AnonymousInnovationEvaluation",
  };

  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save deployment info to file
  const deploymentFile = path.join(
    deploymentsDir,
    `${network.name}-${Date.now()}.json`
  );
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

  // Also save as latest
  const latestFile = path.join(deploymentsDir, `${network.name}-latest.json`);
  fs.writeFileSync(latestFile, JSON.stringify(deploymentInfo, null, 2));

  console.log("Deployment Information Saved:");
  console.log("----------------------------");
  console.log("File:", deploymentFile);
  console.log("Latest:", latestFile);
  console.log();

  // Test basic contract functionality
  console.log("Testing Contract Functions...");
  console.log("-----------------------------");

  try {
    const owner = await contract.owner();
    console.log("Contract Owner:", owner);
    console.log("Owner Match:", owner === deployer.address ? "✓ Correct" : "✗ Mismatch");

    const currentPeriod = await contract.getCurrentEvaluationPeriod();
    console.log("Current Evaluation Period:", currentPeriod.toString());

    const nextProjectId = await contract.nextProjectId();
    console.log("Next Project ID:", nextProjectId.toString());

    console.log();
    console.log("✓ All basic checks passed");
  } catch (error) {
    console.error("✗ Error testing contract:", error.message);
  }

  console.log();
  console.log("========================================");
  console.log("Deployment Complete!");
  console.log("========================================\n");

  return {
    contract,
    contractAddress,
    deploymentInfo,
  };
}

// Execute deployment
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("\n========================================");
      console.error("Deployment Failed!");
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
