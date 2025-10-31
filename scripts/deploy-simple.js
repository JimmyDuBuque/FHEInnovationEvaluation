const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying Anonymous Innovation Evaluation Simple contract...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  const AnonymousInnovationEvaluationSimple = await ethers.getContractFactory("AnonymousInnovationEvaluationSimple");
  const contract = await AnonymousInnovationEvaluationSimple.deploy();

  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log("AnonymousInnovationEvaluationSimple deployed to:", contractAddress);

  console.log("\nContract deployment completed!");
  console.log("Contract Address:", contractAddress);
  console.log("Deployer Address:", deployer.address);
  console.log("Network:", network.name);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
