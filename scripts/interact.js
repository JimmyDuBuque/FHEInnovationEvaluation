const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function loadContract() {
  const network = hre.network.name;
  const deploymentFile = path.join(__dirname, "..", "deployments", `${network}-deployment.json`);

  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`❌ Deployment file not found for network: ${network}\nPlease deploy the contract first using: npm run deploy`);
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const contractAddress = deploymentInfo.contractAddress;

  const contract = await hre.ethers.getContractAt("ConfidentialWasteRecycling", contractAddress);
  return { contract, contractAddress, deploymentInfo };
}

async function getContractState(contract) {
  console.log("\n📊 Current Contract State:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const owner = await contract.owner();
  const totalReports = await contract.totalReports();
  const currentPeriod = await contract.currentPeriod();

  console.log("👑 Owner:", owner);
  console.log("📝 Total Reports:", totalReports.toString());
  console.log("📅 Current Period:", currentPeriod.toString());

  const periodInfo = await contract.getCurrentPeriodInfo();
  console.log("\n📆 Current Period Details:");
  console.log("   Period Number:", periodInfo[0].toString());
  console.log("   Report Count:", periodInfo[1].toString());
  console.log("   Start Time:", new Date(Number(periodInfo[2]) * 1000).toISOString());
  console.log("   Is Finalized:", periodInfo[3]);

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

async function authorizeReporter(contract, reporterAddress) {
  console.log(`\n🔐 Authorizing reporter: ${reporterAddress}`);

  const tx = await contract.authorizeReporter(reporterAddress);
  console.log("⏳ Transaction sent:", tx.hash);

  const receipt = await tx.wait();
  console.log("✅ Reporter authorized! Gas used:", receipt.gasUsed.toString());

  // Verify authorization
  const isAuthorized = await contract.isAuthorizedReporter(reporterAddress);
  console.log("✓ Authorization status:", isAuthorized);
}

async function addVerifier(contract, verifierAddress) {
  console.log(`\n🔐 Adding verifier: ${verifierAddress}`);

  const tx = await contract.addVerifier(verifierAddress);
  console.log("⏳ Transaction sent:", tx.hash);

  const receipt = await tx.wait();
  console.log("✅ Verifier added! Gas used:", receipt.gasUsed.toString());

  // Verify
  const isVerifier = await contract.verifiers(verifierAddress);
  console.log("✓ Verifier status:", isVerifier);
}

async function submitReport(contract, reportData) {
  console.log("\n📝 Submitting recycling report...");
  console.log("Report data:", reportData);

  const tx = await contract.submitReport(
    reportData.plasticWeight,
    reportData.paperWeight,
    reportData.glassWeight,
    reportData.metalWeight,
    reportData.organicWeight,
    reportData.energyGenerated,
    reportData.carbonReduced
  );

  console.log("⏳ Transaction sent:", tx.hash);

  const receipt = await tx.wait();
  console.log("✅ Report submitted! Gas used:", receipt.gasUsed.toString());

  // Get the report ID from events
  const event = receipt.logs.find(log => {
    try {
      return contract.interface.parseLog(log).name === "ReportSubmitted";
    } catch {
      return false;
    }
  });

  if (event) {
    const parsedEvent = contract.interface.parseLog(event);
    console.log("📋 Report ID:", parsedEvent.args.reportId.toString());
    return parsedEvent.args.reportId;
  }
}

async function verifyReport(contract, reportId) {
  console.log(`\n✅ Verifying report #${reportId}...`);

  const tx = await contract.verifyReport(reportId);
  console.log("⏳ Transaction sent:", tx.hash);

  const receipt = await tx.wait();
  console.log("✅ Report verified! Gas used:", receipt.gasUsed.toString());
}

async function getReportInfo(contract, reportId) {
  console.log(`\n📄 Fetching report #${reportId} information...`);

  const reportInfo = await contract.getReportInfo(reportId);

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("👤 Reporter:", reportInfo[0]);
  console.log("🕐 Timestamp:", new Date(Number(reportInfo[1]) * 1000).toISOString());
  console.log("✓ Verified:", reportInfo[2]);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

async function finalizePeriod(contract) {
  console.log("\n🔒 Finalizing current period...");

  const tx = await contract.finalizePeriod();
  console.log("⏳ Transaction sent:", tx.hash);

  const receipt = await tx.wait();
  console.log("✅ Period finalized! Gas used:", receipt.gasUsed.toString());
}

async function getPeriodInfo(contract, periodNumber) {
  console.log(`\n📊 Fetching period #${periodNumber} information...`);

  const periodInfo = await contract.getPeriodInfo(periodNumber);

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📝 Report Count:", periodInfo[0].toString());
  console.log("🕐 Start Time:", new Date(Number(periodInfo[1]) * 1000).toISOString());
  console.log("🕐 End Time:", periodInfo[2] > 0 ? new Date(Number(periodInfo[2]) * 1000).toISOString() : "Not ended");
  console.log("✓ Finalized:", periodInfo[3]);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

async function interactiveMode() {
  console.log("🎯 Interactive Mode - Confidential Waste Recycling Platform");
  console.log("═══════════════════════════════════════════════════════════\n");

  const { contract, contractAddress } = await loadContract();
  const [signer] = await hre.ethers.getSigners();

  console.log("📍 Contract:", contractAddress);
  console.log("👤 Signer:", signer.address);

  await getContractState(contract);

  console.log("\n📋 Available Actions:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("1. View contract state");
  console.log("2. Authorize reporter");
  console.log("3. Add verifier");
  console.log("4. Submit report");
  console.log("5. Verify report");
  console.log("6. Get report info");
  console.log("7. Finalize period");
  console.log("8. Get period info");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Example: Authorize the signer as a reporter
  console.log("🎬 Example: Authorizing current signer as reporter...");
  const isAuthorized = await contract.isAuthorizedReporter(signer.address);

  if (!isAuthorized) {
    await authorizeReporter(contract, signer.address);
  } else {
    console.log("✓ Already authorized");
  }

  console.log("\n💡 You can now interact with the contract using the functions in this script");
  console.log("💡 Modify this script to perform different actions");
}

async function main() {
  await interactiveMode();
}

// Execute if run directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("\n❌ Error:");
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  loadContract,
  getContractState,
  authorizeReporter,
  addVerifier,
  submitReport,
  verifyReport,
  getReportInfo,
  finalizePeriod,
  getPeriodInfo
};
