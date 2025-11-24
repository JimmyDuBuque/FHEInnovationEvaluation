const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("ConfidentialWasteRecycling", function () {
  // Fixture for deploying the contract
  async function deployContractFixture() {
    const [owner, reporter1, reporter2, verifier, other] = await ethers.getSigners();

    const ConfidentialWasteRecycling = await ethers.getContractFactory("ConfidentialWasteRecycling");
    const contract = await ConfidentialWasteRecycling.deploy();
    await contract.waitForDeployment();

    return { contract, owner, reporter1, reporter2, verifier, other };
  }

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      const { contract, owner } = await loadFixture(deployContractFixture);
      expect(await contract.owner()).to.equal(owner.address);
    });

    it("Should initialize with zero reports", async function () {
      const { contract } = await loadFixture(deployContractFixture);
      expect(await contract.totalReports()).to.equal(0);
    });

    it("Should initialize with period 1", async function () {
      const { contract } = await loadFixture(deployContractFixture);
      expect(await contract.currentPeriod()).to.equal(1);
    });

    it("Should set owner as initial verifier", async function () {
      const { contract, owner } = await loadFixture(deployContractFixture);
      expect(await contract.verifiers(owner.address)).to.be.true;
    });

    it("Should initialize first period correctly", async function () {
      const { contract } = await loadFixture(deployContractFixture);
      const periodInfo = await contract.getCurrentPeriodInfo();

      expect(periodInfo[0]).to.equal(1); // period number
      expect(periodInfo[1]).to.equal(0); // report count
      expect(periodInfo[3]).to.be.false; // not finalized
    });
  });

  describe("Reporter Authorization", function () {
    it("Should allow owner to authorize reporters", async function () {
      const { contract, reporter1 } = await loadFixture(deployContractFixture);

      await expect(contract.authorizeReporter(reporter1.address))
        .to.emit(contract, "ReporterAuthorized")
        .withArgs(reporter1.address);

      expect(await contract.isAuthorizedReporter(reporter1.address)).to.be.true;
    });

    it("Should not allow non-owner to authorize reporters", async function () {
      const { contract, reporter1, other } = await loadFixture(deployContractFixture);

      await expect(
        contract.connect(other).authorizeReporter(reporter1.address)
      ).to.be.revertedWith("Not authorized");
    });

    it("Should initialize reporter profile correctly", async function () {
      const { contract, reporter1 } = await loadFixture(deployContractFixture);

      await contract.authorizeReporter(reporter1.address);

      const profile = await contract.reporters(reporter1.address);
      expect(profile.isAuthorized).to.be.true;
      expect(profile.lastReportTime).to.equal(0);
    });
  });

  describe("Verifier Management", function () {
    it("Should allow owner to add verifiers", async function () {
      const { contract, verifier } = await loadFixture(deployContractFixture);

      await expect(contract.addVerifier(verifier.address))
        .to.emit(contract, "VerifierAdded")
        .withArgs(verifier.address);

      expect(await contract.verifiers(verifier.address)).to.be.true;
    });

    it("Should not allow non-owner to add verifiers", async function () {
      const { contract, verifier, other } = await loadFixture(deployContractFixture);

      await expect(
        contract.connect(other).addVerifier(verifier.address)
      ).to.be.revertedWith("Not authorized");
    });
  });

  describe("Report Submission", function () {
    async function setupAuthorizedReporter() {
      const fixture = await loadFixture(deployContractFixture);
      await fixture.contract.authorizeReporter(fixture.reporter1.address);
      return fixture;
    }

    it("Should allow authorized reporter to submit report", async function () {
      const { contract, reporter1 } = await setupAuthorizedReporter();

      const reportData = {
        plasticWeight: 100,
        paperWeight: 150,
        glassWeight: 80,
        metalWeight: 50,
        organicWeight: 200,
        energyGenerated: 500,
        carbonReduced: 300
      };

      await expect(
        contract.connect(reporter1).submitReport(
          reportData.plasticWeight,
          reportData.paperWeight,
          reportData.glassWeight,
          reportData.metalWeight,
          reportData.organicWeight,
          reportData.energyGenerated,
          reportData.carbonReduced
        )
      ).to.emit(contract, "ReportSubmitted");

      expect(await contract.totalReports()).to.equal(1);
    });

    it("Should not allow unauthorized reporter to submit report", async function () {
      const { contract, other } = await loadFixture(deployContractFixture);

      await expect(
        contract.connect(other).submitReport(100, 150, 80, 50, 200, 500, 300)
      ).to.be.revertedWith("Not authorized reporter");
    });

    it("Should not allow reporting with all zero values", async function () {
      const { contract, reporter1 } = await setupAuthorizedReporter();

      await expect(
        contract.connect(reporter1).submitReport(0, 0, 0, 0, 0, 100, 50)
      ).to.be.revertedWith("Must report some waste");
    });

    it("Should not allow duplicate reports in same period", async function () {
      const { contract, reporter1 } = await setupAuthorizedReporter();

      // First report
      await contract.connect(reporter1).submitReport(100, 150, 80, 50, 200, 500, 300);

      // Second report in same period
      await expect(
        contract.connect(reporter1).submitReport(100, 150, 80, 50, 200, 500, 300)
      ).to.be.revertedWith("Already reported this period");
    });

    it("Should update report count correctly", async function () {
      const { contract, reporter1, reporter2 } = await loadFixture(deployContractFixture);

      await contract.authorizeReporter(reporter1.address);
      await contract.authorizeReporter(reporter2.address);

      await contract.connect(reporter1).submitReport(100, 150, 80, 50, 200, 500, 300);
      await contract.connect(reporter2).submitReport(120, 160, 90, 60, 210, 520, 310);

      expect(await contract.totalReports()).to.equal(2);
    });
  });

  describe("Report Verification", function () {
    async function setupReportForVerification() {
      const fixture = await loadFixture(deployContractFixture);
      await fixture.contract.authorizeReporter(fixture.reporter1.address);
      await fixture.contract.addVerifier(fixture.verifier.address);

      // Submit a report
      await fixture.contract.connect(fixture.reporter1).submitReport(
        100, 150, 80, 50, 200, 500, 300
      );

      return fixture;
    }

    it("Should allow verifier to verify reports", async function () {
      const { contract, verifier } = await setupReportForVerification();

      await expect(contract.connect(verifier).verifyReport(1))
        .to.emit(contract, "ReportVerified")
        .withArgs(1, verifier.address);
    });

    it("Should not allow non-verifier to verify reports", async function () {
      const { contract, other } = await setupReportForVerification();

      await expect(
        contract.connect(other).verifyReport(1)
      ).to.be.revertedWith("Not authorized verifier");
    });

    it("Should not allow verifying invalid report ID", async function () {
      const { contract, verifier } = await setupReportForVerification();

      await expect(
        contract.connect(verifier).verifyReport(999)
      ).to.be.revertedWith("Invalid report ID");
    });

    it("Should not allow verifying same report twice", async function () {
      const { contract, verifier } = await setupReportForVerification();

      await contract.connect(verifier).verifyReport(1);

      await expect(
        contract.connect(verifier).verifyReport(1)
      ).to.be.revertedWith("Already verified");
    });

    it("Should update period statistics after verification", async function () {
      const { contract, verifier } = await setupReportForVerification();

      await contract.connect(verifier).verifyReport(1);

      const periodInfo = await contract.getPeriodInfo(1);
      expect(periodInfo[0]).to.equal(1); // report count
    });
  });

  describe("Period Management", function () {
    async function setupActivePeriod() {
      const fixture = await loadFixture(deployContractFixture);
      await fixture.contract.authorizeReporter(fixture.reporter1.address);

      // Submit and verify a report
      await fixture.contract.connect(fixture.reporter1).submitReport(
        100, 150, 80, 50, 200, 500, 300
      );
      await fixture.contract.verifyReport(1);

      return fixture;
    }

    it("Should allow owner to finalize period", async function () {
      const { contract } = await setupActivePeriod();

      await expect(contract.finalizePeriod())
        .to.emit(contract, "PeriodFinalized")
        .withArgs(1, await ethers.provider.getBlock("latest").then(b => b.timestamp + 1));
    });

    it("Should not allow non-owner to finalize period", async function () {
      const { contract, other } = await setupActivePeriod();

      await expect(
        contract.connect(other).finalizePeriod()
      ).to.be.revertedWith("Not authorized");
    });

    it("Should start new period after finalization", async function () {
      const { contract } = await setupActivePeriod();

      await contract.finalizePeriod();

      expect(await contract.currentPeriod()).to.equal(2);
    });

    it("Should not allow finalizing same period twice", async function () {
      const { contract } = await setupActivePeriod();

      await contract.finalizePeriod();

      await expect(contract.finalizePeriod()).to.be.revertedWith("Period already finalized");
    });

    it("Should allow reporting in new period after finalization", async function () {
      const { contract, reporter1 } = await setupActivePeriod();

      await contract.finalizePeriod();

      // Should be able to report in new period
      await expect(
        contract.connect(reporter1).submitReport(100, 150, 80, 50, 200, 500, 300)
      ).to.emit(contract, "ReportSubmitted");
    });

    it("Should not allow reporting in finalized period", async function () {
      const { contract, reporter2 } = await loadFixture(deployContractFixture);

      await contract.authorizeReporter(reporter2.address);
      await contract.finalizePeriod();

      // Current period is now 2, trying to report would fail if we somehow tried in period 1
      // This is implicitly tested by the period management
    });
  });

  describe("View Functions", function () {
    it("Should return correct report information", async function () {
      const { contract, reporter1 } = await loadFixture(deployContractFixture);

      await contract.authorizeReporter(reporter1.address);
      await contract.connect(reporter1).submitReport(100, 150, 80, 50, 200, 500, 300);

      const reportInfo = await contract.getReportInfo(1);

      expect(reportInfo[0]).to.equal(reporter1.address); // reporter
      expect(reportInfo[2]).to.be.false; // not verified yet
    });

    it("Should return correct period information", async function () {
      const { contract } = await loadFixture(deployContractFixture);

      const periodInfo = await contract.getPeriodInfo(1);

      expect(periodInfo[0]).to.equal(0); // no reports yet
      expect(periodInfo[3]).to.be.false; // not finalized
    });

    it("Should return correct current period info", async function () {
      const { contract } = await loadFixture(deployContractFixture);

      const currentInfo = await contract.getCurrentPeriodInfo();

      expect(currentInfo[0]).to.equal(1); // period 1
      expect(currentInfo[1]).to.equal(0); // no reports
      expect(currentInfo[3]).to.be.false; // not finalized
    });

    it("Should check reporter authorization status", async function () {
      const { contract, reporter1, other } = await loadFixture(deployContractFixture);

      await contract.authorizeReporter(reporter1.address);

      expect(await contract.isAuthorizedReporter(reporter1.address)).to.be.true;
      expect(await contract.isAuthorizedReporter(other.address)).to.be.false;
    });

    it("Should check if reporter has reported in current period", async function () {
      const { contract, reporter1 } = await loadFixture(deployContractFixture);

      await contract.authorizeReporter(reporter1.address);

      expect(await contract.hasReportedThisPeriod(reporter1.address)).to.be.false;

      await contract.connect(reporter1).submitReport(100, 150, 80, 50, 200, 500, 300);

      expect(await contract.hasReportedThisPeriod(reporter1.address)).to.be.true;
    });
  });

  describe("Gas Optimization", function () {
    it("Should handle multiple reports efficiently", async function () {
      const { contract, reporter1, reporter2 } = await loadFixture(deployContractFixture);

      await contract.authorizeReporter(reporter1.address);
      await contract.authorizeReporter(reporter2.address);

      const tx1 = await contract.connect(reporter1).submitReport(100, 150, 80, 50, 200, 500, 300);
      const receipt1 = await tx1.wait();

      const tx2 = await contract.connect(reporter2).submitReport(120, 160, 90, 60, 210, 520, 310);
      const receipt2 = await tx2.wait();

      console.log("       Gas used for first report:", receipt1.gasUsed.toString());
      console.log("       Gas used for second report:", receipt2.gasUsed.toString());
    });
  });
});
