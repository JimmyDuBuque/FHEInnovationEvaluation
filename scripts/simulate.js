const hre = require("hardhat");

/**
 * Simulation script for testing the Confidential Waste Recycling Platform
 * This script simulates a complete workflow with multiple reporters and periods
 */

async function deployContract() {
  console.log("🚀 Deploying contract for simulation...\n");

  const ConfidentialWasteRecycling = await hre.ethers.getContractFactory("ConfidentialWasteRecycling");
  const contract = await ConfidentialWasteRecycling.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log("✅ Contract deployed at:", contractAddress, "\n");

  return contract;
}

async function setupReporters(contract, signers) {
  console.log("👥 Setting up reporters...\n");

  const reporters = [];

  for (let i = 1; i <= 3; i++) {
    const reporter = signers[i];
    console.log(`🔐 Authorizing reporter ${i}: ${reporter.address}`);

    const tx = await contract.authorizeReporter(reporter.address);
    await tx.wait();

    reporters.push(reporter);
    console.log(`✅ Reporter ${i} authorized\n`);
  }

  return reporters;
}

async function setupVerifiers(contract, signers) {
  console.log("🔍 Setting up verifiers...\n");

  const verifier = signers[4];
  console.log(`🔐 Adding verifier: ${verifier.address}`);

  const tx = await contract.addVerifier(verifier.address);
  await tx.wait();

  console.log(`✅ Verifier added\n`);

  return verifier;
}

function generateRandomReportData() {
  return {
    plasticWeight: Math.floor(Math.random() * 500) + 100,    // 100-600 kg
    paperWeight: Math.floor(Math.random() * 400) + 100,      // 100-500 kg
    glassWeight: Math.floor(Math.random() * 300) + 50,       // 50-350 kg
    metalWeight: Math.floor(Math.random() * 200) + 50,       // 50-250 kg
    organicWeight: Math.floor(Math.random() * 600) + 200,    // 200-800 kg
    energyGenerated: Math.floor(Math.random() * 1000) + 500, // 500-1500 kWh
    carbonReduced: Math.floor(Math.random() * 800) + 200     // 200-1000 kg
  };
}

async function simulateReportingPeriod(contract, reporters, verifier, periodNumber) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`📅 PERIOD ${periodNumber} - Reporting Phase`);
  console.log(`${"═".repeat(60)}\n`);

  const reportIds = [];

  // Each reporter submits a report
  for (let i = 0; i < reporters.length; i++) {
    const reporter = reporters[i];
    const reportData = generateRandomReportData();

    console.log(`\n📝 Reporter ${i + 1} submitting report...`);
    console.log(`   Plastic: ${reportData.plasticWeight} kg`);
    console.log(`   Paper: ${reportData.paperWeight} kg`);
    console.log(`   Glass: ${reportData.glassWeight} kg`);
    console.log(`   Metal: ${reportData.metalWeight} kg`);
    console.log(`   Organic: ${reportData.organicWeight} kg`);
    console.log(`   Energy Generated: ${reportData.energyGenerated} kWh`);
    console.log(`   Carbon Reduced: ${reportData.carbonReduced} kg`);

    const tx = await contract.connect(reporter).submitReport(
      reportData.plasticWeight,
      reportData.paperWeight,
      reportData.glassWeight,
      reportData.metalWeight,
      reportData.organicWeight,
      reportData.energyGenerated,
      reportData.carbonReduced
    );

    const receipt = await tx.wait();
    console.log(`   ✅ Report submitted (Gas: ${receipt.gasUsed.toString()})`);

    // Extract report ID from event
    const event = receipt.logs.find(log => {
      try {
        return contract.interface.parseLog(log).name === "ReportSubmitted";
      } catch {
        return false;
      }
    });

    if (event) {
      const parsedEvent = contract.interface.parseLog(event);
      const reportId = parsedEvent.args.reportId;
      reportIds.push(reportId);
      console.log(`   📋 Report ID: ${reportId}`);
    }
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log(`📅 PERIOD ${periodNumber} - Verification Phase`);
  console.log(`${"─".repeat(60)}\n`);

  // Verify all reports
  for (const reportId of reportIds) {
    console.log(`✅ Verifying report #${reportId}...`);

    const tx = await contract.connect(verifier).verifyReport(reportId);
    const receipt = await tx.wait();

    console.log(`   ✓ Verified (Gas: ${receipt.gasUsed.toString()})`);
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log(`📅 PERIOD ${periodNumber} - Period Summary`);
  console.log(`${"─".repeat(60)}\n`);

  const periodInfo = await contract.getPeriodInfo(periodNumber);
  console.log(`📊 Period Statistics:`);
  console.log(`   Total Reports: ${periodInfo[0]}`);
  console.log(`   Start Time: ${new Date(Number(periodInfo[1]) * 1000).toISOString()}`);
  console.log(`   Status: ${periodInfo[3] ? "Finalized" : "Active"}`);

  return reportIds;
}

async function displayFinalStats(contract) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`📊 FINAL SIMULATION STATISTICS`);
  console.log(`${"═".repeat(60)}\n`);

  const totalReports = await contract.totalReports();
  const currentPeriod = await contract.currentPeriod();

  console.log(`Total Reports Submitted: ${totalReports}`);
  console.log(`Total Periods: ${currentPeriod}`);
  console.log();

  for (let i = 1; i <= currentPeriod; i++) {
    const periodInfo = await contract.getPeriodInfo(i);

    console.log(`Period ${i}:`);
    console.log(`   Reports: ${periodInfo[0]}`);
    console.log(`   Start: ${new Date(Number(periodInfo[1]) * 1000).toISOString()}`);

    if (periodInfo[2] > 0) {
      console.log(`   End: ${new Date(Number(periodInfo[2]) * 1000).toISOString()}`);
    }

    console.log(`   Finalized: ${periodInfo[3]}`);
    console.log();
  }

  console.log(`${"═".repeat(60)}\n`);
}

async function main() {
  console.log("\n🎬 Starting Confidential Waste Recycling Platform Simulation");
  console.log("═".repeat(60), "\n");

  // Get signers
  const signers = await hre.ethers.getSigners();
  console.log(`👤 Available signers: ${signers.length}\n`);

  if (signers.length < 5) {
    throw new Error("❌ Need at least 5 signers for simulation. Please run on localhost network.");
  }

  // Deploy contract
  const contract = await deployContract();

  // Setup
  const reporters = await setupReporters(contract, signers);
  const verifier = await setupVerifiers(contract, signers);

  // Simulate multiple reporting periods
  const numberOfPeriods = 2;

  for (let period = 1; period <= numberOfPeriods; period++) {
    await simulateReportingPeriod(contract, reporters, verifier, period);

    // Finalize period (except the last one to show active period)
    if (period < numberOfPeriods) {
      console.log(`\n🔒 Finalizing period ${period}...`);
      const tx = await contract.finalizePeriod();
      await tx.wait();
      console.log(`✅ Period ${period} finalized\n`);

      // Wait a bit before next period
      console.log("⏳ Waiting before next period...\n");
    }
  }

  // Display final statistics
  await displayFinalStats(contract);

  console.log("🎉 Simulation completed successfully!");
  console.log("\n💡 Key Features Demonstrated:");
  console.log("   ✓ Reporter authorization");
  console.log("   ✓ Verifier management");
  console.log("   ✓ Confidential report submission");
  console.log("   ✓ Report verification");
  console.log("   ✓ Period management");
  console.log("   ✓ Statistics aggregation");
  console.log("\n");
}

// Execute simulation
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("\n❌ Simulation failed:");
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main };
