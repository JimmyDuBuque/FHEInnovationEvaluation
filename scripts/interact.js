const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

/**
 * Interactive script for contract interaction
 * Allows testing and interacting with deployed contract functions
 */

// Setup readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

let contract;
let signer;

async function loadContract() {
  console.log("\n========================================");
  console.log("Contract Interaction Script");
  console.log("========================================\n");

  // Get contract address
  let contractAddress = process.argv[2];

  if (!contractAddress) {
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    const latestFile = path.join(deploymentsDir, `${network.name}-latest.json`);

    if (fs.existsSync(latestFile)) {
      const deploymentData = JSON.parse(fs.readFileSync(latestFile, "utf8"));
      contractAddress = deploymentData.contractAddress;
      console.log("Contract address loaded from deployment file");
    } else {
      console.error("Error: Contract address not provided");
      console.log("\nUsage:");
      console.log("  npm run interact -- <CONTRACT_ADDRESS>");
      process.exit(1);
    }
  }

  console.log("Network:", network.name);
  console.log("Contract Address:", contractAddress);
  console.log();

  // Get signer
  [signer] = await ethers.getSigners();
  console.log("Signer Address:", signer.address);

  const balance = await ethers.provider.getBalance(signer.address);
  console.log("Signer Balance:", ethers.formatEther(balance), "ETH");
  console.log();

  // Connect to contract
  const ContractFactory = await ethers.getContractFactory("AnonymousInnovationEvaluation");
  contract = ContractFactory.attach(contractAddress);

  console.log("Contract connected successfully!");
  console.log();
}

async function displayMenu() {
  console.log("\n========================================");
  console.log("Available Actions:");
  console.log("========================================");
  console.log("1.  View Contract Information");
  console.log("2.  View Current Evaluation Period");
  console.log("3.  Submit New Project");
  console.log("4.  View Project Details");
  console.log("5.  Submit Evaluation");
  console.log("6.  Authorize Evaluator");
  console.log("7.  Revoke Evaluator");
  console.log("8.  Start Evaluation Period");
  console.log("9.  End Evaluation Period");
  console.log("10. Reveal Project Results");
  console.log("11. View All Projects in Period");
  console.log("12. Check Evaluation Status");
  console.log("0.  Exit");
  console.log("========================================\n");

  const choice = await question("Select an action (0-12): ");
  return choice.trim();
}

async function viewContractInfo() {
  console.log("\n--- Contract Information ---");
  try {
    const owner = await contract.owner();
    const nextProjectId = await contract.nextProjectId();
    const currentPeriod = await contract.getCurrentEvaluationPeriod();

    console.log("Owner:", owner);
    console.log("Next Project ID:", nextProjectId.toString());
    console.log("Current Evaluation Period:", currentPeriod.toString());

    const isOwner = owner.toLowerCase() === signer.address.toLowerCase();
    console.log("You are owner:", isOwner ? "Yes" : "No");
  } catch (error) {
    console.error("Error:", error.message);
  }
}

async function viewCurrentPeriod() {
  console.log("\n--- Current Evaluation Period ---");
  try {
    const periodId = await contract.getCurrentEvaluationPeriod();
    const periodInfo = await contract.getEvaluationPeriodInfo(periodId);

    console.log("Period ID:", periodId.toString());
    console.log("Start Time:", new Date(Number(periodInfo[0]) * 1000).toLocaleString());
    console.log("End Time:", new Date(Number(periodInfo[1]) * 1000).toLocaleString());
    console.log("Is Active:", periodInfo[2] ? "Yes" : "No");
    console.log("Total Projects:", periodInfo[3].toString());
  } catch (error) {
    console.error("Error:", error.message);
  }
}

async function submitProject() {
  console.log("\n--- Submit New Project ---");
  const title = await question("Enter project title: ");
  const description = await question("Enter project description: ");

  try {
    console.log("\nSubmitting project...");
    const tx = await contract.submitProject(title, description);
    console.log("Transaction Hash:", tx.hash);
    console.log("Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log("Project submitted successfully!");
    console.log("Block Number:", receipt.blockNumber);
    console.log("Gas Used:", receipt.gasUsed.toString());

    // Get project ID from event
    const event = receipt.logs.find((log) => {
      try {
        return contract.interface.parseLog(log).name === "ProjectSubmitted";
      } catch {
        return false;
      }
    });

    if (event) {
      const parsedEvent = contract.interface.parseLog(event);
      console.log("Project ID:", parsedEvent.args.projectId.toString());
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

async function viewProjectDetails() {
  const projectId = await question("\nEnter project ID: ");

  console.log("\n--- Project Details ---");
  try {
    const info = await contract.getProjectInfo(projectId);

    console.log("Title:", info[0]);
    console.log("Description:", info[1]);
    console.log("Submitter:", info[2]);
    console.log("Is Active:", info[3] ? "Yes" : "No");
    console.log("Submission Time:", new Date(Number(info[4]) * 1000).toLocaleString());
    console.log("Total Evaluations:", info[5].toString());
    console.log("Results Revealed:", info[6] ? "Yes" : "No");

    if (info[6]) {
      console.log("Final Score:", info[7].toString());
      console.log("Ranking:", info[8].toString());
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

async function submitEvaluation() {
  const projectId = await question("\nEnter project ID: ");

  console.log("\n--- Submit Evaluation (Score: 0-10) ---");
  const innovation = await question("Innovation score: ");
  const feasibility = await question("Feasibility score: ");
  const impact = await question("Impact score: ");
  const technical = await question("Technical score: ");

  try {
    console.log("\nSubmitting evaluation...");
    const tx = await contract.submitEvaluation(
      projectId,
      parseInt(innovation),
      parseInt(feasibility),
      parseInt(impact),
      parseInt(technical)
    );

    console.log("Transaction Hash:", tx.hash);
    console.log("Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log("Evaluation submitted successfully!");
    console.log("Block Number:", receipt.blockNumber);
    console.log("Gas Used:", receipt.gasUsed.toString());
  } catch (error) {
    console.error("Error:", error.message);
  }
}

async function authorizeEvaluator() {
  const address = await question("\nEnter evaluator address: ");

  try {
    console.log("\nAuthorizing evaluator...");
    const tx = await contract.authorizeEvaluator(address);
    console.log("Transaction Hash:", tx.hash);

    const receipt = await tx.wait();
    console.log("Evaluator authorized successfully!");
  } catch (error) {
    console.error("Error:", error.message);
  }
}

async function revokeEvaluator() {
  const address = await question("\nEnter evaluator address: ");

  try {
    console.log("\nRevoking evaluator...");
    const tx = await contract.revokeEvaluator(address);
    console.log("Transaction Hash:", tx.hash);

    const receipt = await tx.wait();
    console.log("Evaluator revoked successfully!");
  } catch (error) {
    console.error("Error:", error.message);
  }
}

async function startEvaluationPeriod() {
  const days = await question("\nEnter duration in days: ");
  const duration = parseInt(days) * 24 * 60 * 60; // Convert to seconds

  try {
    console.log("\nStarting evaluation period...");
    const tx = await contract.startEvaluationPeriod(duration);
    console.log("Transaction Hash:", tx.hash);

    const receipt = await tx.wait();
    console.log("Evaluation period started successfully!");
  } catch (error) {
    console.error("Error:", error.message);
  }
}

async function endEvaluationPeriod() {
  try {
    console.log("\nEnding evaluation period...");
    const tx = await contract.endEvaluationPeriod();
    console.log("Transaction Hash:", tx.hash);

    const receipt = await tx.wait();
    console.log("Evaluation period ended successfully!");
  } catch (error) {
    console.error("Error:", error.message);
  }
}

async function revealResults() {
  const projectId = await question("\nEnter project ID: ");

  try {
    console.log("\nRevealing results...");
    const tx = await contract.revealResults(projectId);
    console.log("Transaction Hash:", tx.hash);

    const receipt = await tx.wait();
    console.log("Results revelation initiated!");
    console.log("Note: Decryption is asynchronous and may take a few blocks");
  } catch (error) {
    console.error("Error:", error.message);
  }
}

async function viewAllProjects() {
  const periodId = await question("\nEnter period ID: ");

  console.log("\n--- Projects in Period ---");
  try {
    const projectIds = await contract.getProjectsByPeriod(periodId);

    if (projectIds.length === 0) {
      console.log("No projects found in this period");
      return;
    }

    console.log(`Found ${projectIds.length} project(s):\n`);

    for (const id of projectIds) {
      const info = await contract.getProjectInfo(id);
      console.log(`Project #${id}:`);
      console.log(`  Title: ${info[0]}`);
      console.log(`  Evaluations: ${info[5].toString()}`);
      console.log(`  Results Revealed: ${info[6] ? "Yes" : "No"}`);
      if (info[6]) {
        console.log(`  Final Score: ${info[7].toString()}`);
        console.log(`  Ranking: ${info[8].toString()}`);
      }
      console.log();
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

async function checkEvaluationStatus() {
  const projectId = await question("\nEnter project ID: ");
  const evaluatorAddress = await question("Enter evaluator address (press Enter for your address): ");

  const address = evaluatorAddress.trim() || signer.address;

  console.log("\n--- Evaluation Status ---");
  try {
    const hasEvaluated = await contract.hasEvaluated(projectId, address);
    console.log("Evaluator:", address);
    console.log("Has Evaluated:", hasEvaluated ? "Yes" : "No");
  } catch (error) {
    console.error("Error:", error.message);
  }
}

async function main() {
  await loadContract();

  let running = true;

  while (running) {
    const choice = await displayMenu();

    switch (choice) {
      case "1":
        await viewContractInfo();
        break;
      case "2":
        await viewCurrentPeriod();
        break;
      case "3":
        await submitProject();
        break;
      case "4":
        await viewProjectDetails();
        break;
      case "5":
        await submitEvaluation();
        break;
      case "6":
        await authorizeEvaluator();
        break;
      case "7":
        await revokeEvaluator();
        break;
      case "8":
        await startEvaluationPeriod();
        break;
      case "9":
        await endEvaluationPeriod();
        break;
      case "10":
        await revealResults();
        break;
      case "11":
        await viewAllProjects();
        break;
      case "12":
        await checkEvaluationStatus();
        break;
      case "0":
        console.log("\nExiting...");
        running = false;
        break;
      default:
        console.log("\nInvalid choice. Please try again.");
    }

    if (running) {
      await question("\nPress Enter to continue...");
    }
  }

  rl.close();
  console.log("\nGoodbye!\n");
}

// Execute script
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("\n========================================");
      console.error("Interaction Script Failed!");
      console.error("========================================\n");
      console.error("Error:", error.message);
      rl.close();
      process.exit(1);
    });
}

module.exports = main;
