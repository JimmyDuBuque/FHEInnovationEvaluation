const { expect } = require("chai");
const { ethers, network } = require("hardhat");

/**
 * Comprehensive Test Suite for Privacy Evaluation Platform
 * Following FHE best practices and testing patterns
 *
 * Test Coverage:
 * - Deployment and Initialization
 * - Project Submission
 * - Evaluation System
 * - Access Control
 * - Edge Cases
 * - Gas Optimization
 */

describe("Privacy Evaluation Platform - Comprehensive Tests", function () {
  let contract;
  let contractAddress;
  let deployer, alice, bob, charlie;

  // Deploy fresh contract before each test
  async function deployFixture() {
    const ContractFactory = await ethers.getContractFactory("AnonymousInnovationEvaluation");
    const deployedContract = await ContractFactory.deploy();
    await deployedContract.waitForDeployment();
    const address = await deployedContract.getAddress();

    return { contract: deployedContract, contractAddress: address };
  }

  before(async function () {
    const signers = await ethers.getSigners();
    deployer = signers[0];
    alice = signers[1];
    bob = signers[2];
    charlie = signers[3];
  });

  beforeEach(async function () {
    ({ contract, contractAddress } = await deployFixture());
  });

  // ============================================
  // 1. DEPLOYMENT AND INITIALIZATION TESTS (8)
  // ============================================
  describe("Deployment and Initialization", function () {
    it("should deploy successfully with valid address", async function () {
      expect(contractAddress).to.be.properAddress;
      expect(contractAddress).to.not.equal(ethers.ZeroAddress);
    });

    it("should set deployer as contract owner", async function () {
      const owner = await contract.owner();
      expect(owner).to.equal(deployer.address);
    });

    it("should initialize with nextProjectId as 1", async function () {
      const nextId = await contract.nextProjectId();
      expect(nextId).to.equal(1);
    });

    it("should initialize with evaluationPeriod as 1", async function () {
      const period = await contract.getCurrentEvaluationPeriod();
      expect(period).to.equal(1);
    });

    it("should have first evaluation period active", async function () {
      const periodInfo = await contract.getEvaluationPeriodInfo(1);
      expect(periodInfo[2]).to.be.true; // isActive
    });

    it("should have zero projects initially", async function () {
      const periodInfo = await contract.getEvaluationPeriodInfo(1);
      expect(periodInfo[3]).to.equal(0); // totalProjects
    });

    it("should initialize evaluation period with correct duration", async function () {
      const periodInfo = await contract.getEvaluationPeriodInfo(1);
      const startTime = periodInfo[0];
      const endTime = periodInfo[1];
      const duration = endTime - startTime;

      // Should be approximately 30 days (allowing for block time variance)
      expect(duration).to.be.closeTo(30 * 24 * 60 * 60, 100);
    });

    it("should have no authorized evaluators initially", async function () {
      const isAliceAuthorized = await contract.authorizedEvaluators(alice.address);
      const isBobAuthorized = await contract.authorizedEvaluators(bob.address);

      expect(isAliceAuthorized).to.be.false;
      expect(isBobAuthorized).to.be.false;
    });
  });

  // ============================================
  // 2. PROJECT SUBMISSION TESTS (10)
  // ============================================
  describe("Project Submission", function () {
    it("should allow any user to submit a project", async function () {
      await expect(
        contract.connect(alice).submitProject("Test Project", "Description")
      ).to.not.be.reverted;
    });

    it("should emit ProjectSubmitted event on submission", async function () {
      await expect(
        contract.connect(alice).submitProject("Test Project", "Description")
      )
        .to.emit(contract, "ProjectSubmitted")
        .withArgs(1, alice.address, "Test Project");
    });

    it("should increment nextProjectId after submission", async function () {
      await contract.connect(alice).submitProject("Project 1", "Desc 1");
      const nextId = await contract.nextProjectId();
      expect(nextId).to.equal(2);
    });

    it("should store project with correct submitter", async function () {
      await contract.connect(alice).submitProject("Project", "Description");

      const projectInfo = await contract.getProjectInfo(1);
      expect(projectInfo[2]).to.equal(alice.address); // submitter
    });

    it("should store project with correct title and description", async function () {
      const title = "Innovative Solution";
      const desc = "A revolutionary approach";

      await contract.connect(alice).submitProject(title, desc);

      const projectInfo = await contract.getProjectInfo(1);
      expect(projectInfo[0]).to.equal(title);
      expect(projectInfo[1]).to.equal(desc);
    });

    it("should mark project as active after submission", async function () {
      await contract.connect(alice).submitProject("Project", "Description");

      const projectInfo = await contract.getProjectInfo(1);
      expect(projectInfo[3]).to.be.true; // isActive
    });

    it("should initialize project with zero evaluations", async function () {
      await contract.connect(alice).submitProject("Project", "Description");

      const projectInfo = await contract.getProjectInfo(1);
      expect(projectInfo[5]).to.equal(0); // totalEvaluations
    });

    it("should initialize project with results not revealed", async function () {
      await contract.connect(alice).submitProject("Project", "Description");

      const projectInfo = await contract.getProjectInfo(1);
      expect(projectInfo[6]).to.be.false; // resultsRevealed
    });

    it("should add project to current evaluation period", async function () {
      await contract.connect(alice).submitProject("Project 1", "Desc");
      await contract.connect(bob).submitProject("Project 2", "Desc");

      const periodInfo = await contract.getEvaluationPeriodInfo(1);
      expect(periodInfo[3]).to.equal(2); // totalProjects
    });

    it("should allow multiple users to submit projects", async function () {
      await contract.connect(alice).submitProject("Alice Project", "Desc");
      await contract.connect(bob).submitProject("Bob Project", "Desc");
      await contract.connect(charlie).submitProject("Charlie Project", "Desc");

      const nextId = await contract.nextProjectId();
      expect(nextId).to.equal(4);
    });
  });

  // ============================================
  // 3. EVALUATION SUBMISSION TESTS (12)
  // ============================================
  describe("Evaluation Submission", function () {
    beforeEach(async function () {
      // Submit a test project
      await contract.connect(alice).submitProject("Test Project", "Description");
    });

    it("should allow users to submit evaluation for active project", async function () {
      await expect(
        contract.connect(bob).submitEvaluation(1, 8, 7, 9, 8)
      ).to.not.be.reverted;
    });

    it("should emit EvaluationSubmitted event", async function () {
      await expect(
        contract.connect(bob).submitEvaluation(1, 8, 7, 9, 8)
      )
        .to.emit(contract, "EvaluationSubmitted")
        .withArgs(1, bob.address, 1);
    });

    it("should accept all scores in valid range (0-10)", async function () {
      await expect(
        contract.connect(bob).submitEvaluation(1, 0, 5, 10, 7)
      ).to.not.be.reverted;
    });

    it("should reject evaluation with innovation score > 10", async function () {
      await expect(
        contract.connect(bob).submitEvaluation(1, 11, 7, 9, 8)
      ).to.be.reverted;
    });

    it("should reject evaluation with feasibility score > 10", async function () {
      await expect(
        contract.connect(bob).submitEvaluation(1, 8, 11, 9, 8)
      ).to.be.reverted;
    });

    it("should reject evaluation with impact score > 10", async function () {
      await expect(
        contract.connect(bob).submitEvaluation(1, 8, 7, 11, 8)
      ).to.be.reverted;
    });

    it("should reject evaluation with technical score > 10", async function () {
      await expect(
        contract.connect(bob).submitEvaluation(1, 8, 7, 9, 11)
      ).to.be.reverted;
    });

    it("should prevent duplicate evaluation from same address", async function () {
      await contract.connect(bob).submitEvaluation(1, 8, 7, 9, 8);

      await expect(
        contract.connect(bob).submitEvaluation(1, 9, 8, 8, 9)
      ).to.be.reverted;
    });

    it("should increment totalEvaluations count", async function () {
      await contract.connect(bob).submitEvaluation(1, 8, 7, 9, 8);

      const projectInfo = await contract.getProjectInfo(1);
      expect(projectInfo[5]).to.equal(1); // totalEvaluations
    });

    it("should allow multiple different users to evaluate", async function () {
      await contract.connect(bob).submitEvaluation(1, 8, 7, 9, 8);
      await contract.connect(charlie).submitEvaluation(1, 9, 8, 8, 9);

      const projectInfo = await contract.getProjectInfo(1);
      expect(projectInfo[5]).to.equal(2);
    });

    it("should correctly track evaluation status", async function () {
      const beforeEval = await contract.hasEvaluated(1, bob.address);
      expect(beforeEval).to.be.false;

      await contract.connect(bob).submitEvaluation(1, 8, 7, 9, 8);

      const afterEval = await contract.hasEvaluated(1, bob.address);
      expect(afterEval).to.be.true;
    });

    it("should reject evaluation for non-existent project", async function () {
      await expect(
        contract.connect(bob).submitEvaluation(999, 8, 7, 9, 8)
      ).to.be.reverted;
    });
  });

  // ============================================
  // 4. ACCESS CONTROL TESTS (9)
  // ============================================
  describe("Access Control", function () {
    it("should allow owner to authorize evaluator", async function () {
      await expect(
        contract.connect(deployer).authorizeEvaluator(alice.address)
      ).to.not.be.reverted;
    });

    it("should emit EvaluatorAuthorized event", async function () {
      await expect(
        contract.connect(deployer).authorizeEvaluator(alice.address)
      )
        .to.emit(contract, "EvaluatorAuthorized")
        .withArgs(alice.address);
    });

    it("should prevent non-owner from authorizing evaluator", async function () {
      await expect(
        contract.connect(alice).authorizeEvaluator(bob.address)
      ).to.be.reverted;
    });

    it("should allow owner to revoke evaluator", async function () {
      await contract.connect(deployer).authorizeEvaluator(alice.address);

      await expect(
        contract.connect(deployer).revokeEvaluator(alice.address)
      ).to.not.be.reverted;
    });

    it("should emit EvaluatorRevoked event", async function () {
      await contract.connect(deployer).authorizeEvaluator(alice.address);

      await expect(
        contract.connect(deployer).revokeEvaluator(alice.address)
      )
        .to.emit(contract, "EvaluatorRevoked")
        .withArgs(alice.address);
    });

    it("should prevent non-owner from revoking evaluator", async function () {
      await contract.connect(deployer).authorizeEvaluator(alice.address);

      await expect(
        contract.connect(bob).revokeEvaluator(alice.address)
      ).to.be.reverted;
    });

    it("should allow only owner to start evaluation period", async function () {
      await expect(
        contract.connect(alice).startEvaluationPeriod(7 * 24 * 60 * 60)
      ).to.be.reverted;
    });

    it("should allow only owner to end evaluation period", async function () {
      await expect(
        contract.connect(alice).endEvaluationPeriod()
      ).to.be.reverted;
    });

    it("should allow only owner to reveal results", async function () {
      await contract.connect(alice).submitProject("Project", "Desc");
      await contract.connect(bob).submitEvaluation(1, 8, 7, 9, 8);

      await expect(
        contract.connect(alice).revealResults(1)
      ).to.be.reverted;
    });
  });

  // ============================================
  // 5. VIEW FUNCTIONS TESTS (4)
  // ============================================
  describe("View Functions", function () {
    beforeEach(async function () {
      await contract.connect(alice).submitProject("Project 1", "Description 1");
      await contract.connect(bob).submitProject("Project 2", "Description 2");
    });

    it("should return correct project information", async function () {
      const info = await contract.getProjectInfo(1);

      expect(info[0]).to.equal("Project 1");
      expect(info[1]).to.equal("Description 1");
      expect(info[2]).to.equal(alice.address);
      expect(info[3]).to.be.true; // isActive
    });

    it("should return current evaluation period", async function () {
      const currentPeriod = await contract.getCurrentEvaluationPeriod();
      expect(currentPeriod).to.equal(1);
    });

    it("should return projects by period", async function () {
      const projects = await contract.getProjectsByPeriod(1);

      expect(projects.length).to.equal(2);
      expect(projects[0]).to.equal(1);
      expect(projects[1]).to.equal(2);
    });

    it("should correctly report evaluation status", async function () {
      await contract.connect(charlie).submitEvaluation(1, 8, 7, 9, 8);

      const hasEvaluated = await contract.hasEvaluated(1, charlie.address);
      const hasNotEvaluated = await contract.hasEvaluated(1, bob.address);

      expect(hasEvaluated).to.be.true;
      expect(hasNotEvaluated).to.be.false;
    });
  });

  // ============================================
  // 6. EDGE CASES TESTS (7)
  // ============================================
  describe("Edge Cases", function () {
    it("should handle evaluation with all zeros", async function () {
      await contract.connect(alice).submitProject("Project", "Desc");

      await expect(
        contract.connect(bob).submitEvaluation(1, 0, 0, 0, 0)
      ).to.not.be.reverted;
    });

    it("should handle evaluation with all maximum values", async function () {
      await contract.connect(alice).submitProject("Project", "Desc");

      await expect(
        contract.connect(bob).submitEvaluation(1, 10, 10, 10, 10)
      ).to.not.be.reverted;
    });

    it("should handle project with empty title", async function () {
      await expect(
        contract.connect(alice).submitProject("", "Description")
      ).to.not.be.reverted;
    });

    it("should handle project with empty description", async function () {
      await expect(
        contract.connect(alice).submitProject("Title", "")
      ).to.not.be.reverted;
    });

    it("should handle project with very long title", async function () {
      const longTitle = "A".repeat(1000);

      await expect(
        contract.connect(alice).submitProject(longTitle, "Desc")
      ).to.not.be.reverted;
    });

    it("should handle multiple evaluations from different users", async function () {
      await contract.connect(alice).submitProject("Project", "Desc");

      const signers = await ethers.getSigners();
      for (let i = 1; i <= 5; i++) {
        await contract.connect(signers[i]).submitEvaluation(1, 8, 7, 9, 8);
      }

      const projectInfo = await contract.getProjectInfo(1);
      expect(projectInfo[5]).to.equal(5);
    });

    it("should handle querying non-existent project", async function () {
      await expect(
        contract.getProjectInfo(999)
      ).to.not.be.reverted;
    });
  });

  // ============================================
  // 7. GAS OPTIMIZATION TESTS (3)
  // ============================================
  describe("Gas Optimization", function () {
    it("should deploy within reasonable gas limits", async function () {
      const receipt = await (await contract.deploymentTransaction()).wait();

      // Deployment should be under 3M gas
      expect(receipt.gasUsed).to.be.lt(3000000);
    });

    it("should submit project efficiently", async function () {
      const tx = await contract.connect(alice).submitProject("Project", "Description");
      const receipt = await tx.wait();

      // Project submission should be under 300k gas
      expect(receipt.gasUsed).to.be.lt(300000);
    });

    it("should submit evaluation efficiently", async function () {
      await contract.connect(alice).submitProject("Project", "Desc");

      const tx = await contract.connect(bob).submitEvaluation(1, 8, 7, 9, 8);
      const receipt = await tx.wait();

      // Evaluation with FHE should be under 500k gas
      expect(receipt.gasUsed).to.be.lt(500000);
    });
  });

  // ============================================
  // 8. INTEGRATION TESTS (5)
  // ============================================
  describe("Integration Scenarios", function () {
    it("should handle complete evaluation workflow", async function () {
      // Submit project
      await contract.connect(alice).submitProject("Innovation", "Revolutionary idea");

      // Multiple evaluations
      await contract.connect(bob).submitEvaluation(1, 9, 8, 9, 8);
      await contract.connect(charlie).submitEvaluation(1, 8, 9, 8, 9);
      await contract.connect(deployer).submitEvaluation(1, 10, 9, 9, 9);

      // Verify state
      const projectInfo = await contract.getProjectInfo(1);
      expect(projectInfo[5]).to.equal(3);
      expect(projectInfo[6]).to.be.false; // Not yet revealed
    });

    it("should handle multiple projects and evaluations", async function () {
      // Multiple projects
      await contract.connect(alice).submitProject("Project A", "Desc A");
      await contract.connect(bob).submitProject("Project B", "Desc B");
      await contract.connect(charlie).submitProject("Project C", "Desc C");

      // Cross evaluations
      await contract.connect(bob).submitEvaluation(1, 8, 7, 9, 8);
      await contract.connect(charlie).submitEvaluation(1, 9, 8, 8, 9);

      await contract.connect(alice).submitEvaluation(2, 7, 8, 8, 7);
      await contract.connect(charlie).submitEvaluation(2, 8, 8, 9, 8);

      await contract.connect(alice).submitEvaluation(3, 9, 9, 8, 9);
      await contract.connect(bob).submitEvaluation(3, 8, 9, 9, 8);

      // Verify all projects have evaluations
      const project1 = await contract.getProjectInfo(1);
      const project2 = await contract.getProjectInfo(2);
      const project3 = await contract.getProjectInfo(3);

      expect(project1[5]).to.equal(2);
      expect(project2[5]).to.equal(2);
      expect(project3[5]).to.equal(2);
    });

    it("should maintain evaluation period state correctly", async function () {
      const periodBefore = await contract.getCurrentEvaluationPeriod();
      expect(periodBefore).to.equal(1);

      const periodInfo = await contract.getEvaluationPeriodInfo(1);
      expect(periodInfo[2]).to.be.true; // isActive
    });

    it("should track evaluator authorization correctly", async function () {
      // Authorize multiple evaluators
      await contract.connect(deployer).authorizeEvaluator(alice.address);
      await contract.connect(deployer).authorizeEvaluator(bob.address);

      expect(await contract.authorizedEvaluators(alice.address)).to.be.true;
      expect(await contract.authorizedEvaluators(bob.address)).to.be.true;

      // Revoke one
      await contract.connect(deployer).revokeEvaluator(alice.address);

      expect(await contract.authorizedEvaluators(alice.address)).to.be.false;
      expect(await contract.authorizedEvaluators(bob.address)).to.be.true;
    });

    it("should handle sequential project submissions correctly", async function () {
      const projectCount = 10;

      for (let i = 0; i < projectCount; i++) {
        await contract.connect(alice).submitProject(`Project ${i}`, `Description ${i}`);
      }

      const nextId = await contract.nextProjectId();
      expect(nextId).to.equal(projectCount + 1);

      const periodInfo = await contract.getEvaluationPeriodInfo(1);
      expect(periodInfo[3]).to.equal(projectCount);
    });
  });
});
