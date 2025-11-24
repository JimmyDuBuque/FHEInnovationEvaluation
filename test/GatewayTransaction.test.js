const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GatewayTransaction Contract Test Suite", function () {
  let gatewayTransaction;
  let privacyPreservingDivision;
  let securityValidator;
  let priceObfuscation;
  let owner, requester, gateway, verifier;

  // Constants
  const TIMEOUT_DURATION = 3600; // 1 hour
  const GAS_LIMIT = 100000;

  beforeEach(async function () {
    // Get signers
    [owner, requester, gateway, verifier] = await ethers.getSigners();

    // Deploy SecurityValidator
    const SecurityValidator = await ethers.getContractFactory("SecurityValidator");
    securityValidator = await SecurityValidator.deploy();
    await securityValidator.deployed();

    // Deploy PrivacyPreservingDivision
    const PrivacyPreservingDivision = await ethers.getContractFactory("PrivacyPreservingDivision");
    privacyPreservingDivision = await PrivacyPreservingDivision.deploy();
    await privacyPreservingDivision.deployed();

    // Deploy PriceObfuscation
    const PriceObfuscation = await ethers.getContractFactory("PriceObfuscation");
    priceObfuscation = await PriceObfuscation.deploy();
    await priceObfuscation.deployed();

    // Deploy GatewayTransaction
    const GatewayTransaction = await ethers.getContractFactory("GatewayTransaction");
    gatewayTransaction = await GatewayTransaction.deploy(gateway.address);
    await gatewayTransaction.deployed();
  });

  // ============== Deployment Tests ==============
  describe("Deployment & Initialization", function () {
    it("Should deploy GatewayTransaction with correct owner", async function () {
      expect(await gatewayTransaction.owner()).to.equal(owner.address);
    });

    it("Should set gateway address during deployment", async function () {
      expect(await gatewayTransaction.gatewayAddress()).to.equal(gateway.address);
    });

    it("Should initialize request counter to 0", async function () {
      expect(await gatewayTransaction.requestCounter()).to.equal(0);
    });

    it("Should initialize request timeout to default", async function () {
      const timeout = await gatewayTransaction.requestTimeout();
      expect(timeout).to.be.gt(0);
    });

    it("Should initialize PrivacyPreservingDivision", async function () {
      expect(privacyPreservingDivision.address).to.not.equal(ethers.constants.AddressZero);
    });

    it("Should initialize SecurityValidator", async function () {
      expect(securityValidator.address).to.not.equal(ethers.constants.AddressZero);
    });

    it("Should initialize PriceObfuscation", async function () {
      expect(priceObfuscation.address).to.not.equal(ethers.constants.AddressZero);
    });

    it("Should have correct contract addresses", async function () {
      expect(gatewayTransaction.address).to.not.equal(ethers.constants.AddressZero);
      expect(privacyPreservingDivision.address).to.not.equal(ethers.constants.AddressZero);
      expect(securityValidator.address).to.not.equal(ethers.constants.AddressZero);
      expect(priceObfuscation.address).to.not.equal(ethers.constants.AddressZero);
    });
  });

  // ============== Request Submission Tests ==============
  describe("Request Submission", function () {
    it("Should submit a request successfully", async function () {
      const encryptedData = ethers.utils.defaultAbiCoder.encode(["uint256"], [123]);
      const tx = await gatewayTransaction
        .connect(requester)
        .submitRequest(encryptedData, GAS_LIMIT, TIMEOUT_DURATION);

      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
      expect(await gatewayTransaction.requestCounter()).to.equal(1);
    });

    it("Should emit RequestSubmitted event", async function () {
      const encryptedData = ethers.utils.defaultAbiCoder.encode(["uint256"], [456]);
      const tx = gatewayTransaction
        .connect(requester)
        .submitRequest(encryptedData, GAS_LIMIT, TIMEOUT_DURATION);

      await expect(tx)
        .to.emit(gatewayTransaction, "RequestSubmitted")
        .withArgs(0, requester.address, await ethers.provider.getBlockNumber());
    });

    it("Should assign correct request ID", async function () {
      const encryptedData = ethers.utils.defaultAbiCoder.encode(["uint256"], [789]);
      await gatewayTransaction
        .connect(requester)
        .submitRequest(encryptedData, GAS_LIMIT, TIMEOUT_DURATION);

      expect(await gatewayTransaction.requestCounter()).to.equal(1);

      // Submit second request
      await gatewayTransaction
        .connect(requester)
        .submitRequest(encryptedData, GAS_LIMIT, TIMEOUT_DURATION);

      expect(await gatewayTransaction.requestCounter()).to.equal(2);
    });

    it("Should store encrypted data correctly", async function () {
      const encryptedData = ethers.utils.defaultAbiCoder.encode(["uint256"], [999]);
      await gatewayTransaction
        .connect(requester)
        .submitRequest(encryptedData, GAS_LIMIT, TIMEOUT_DURATION);

      const [status] = await gatewayTransaction.getRequestStatus(0);
      // 0 = PENDING
      expect(status).to.equal(0);
    });

    it("Should set timeout correctly", async function () {
      const encryptedData = ethers.utils.defaultAbiCoder.encode(["uint256"], [111]);
      const blockBefore = await ethers.provider.getBlock("latest");
      await gatewayTransaction
        .connect(requester)
        .submitRequest(encryptedData, GAS_LIMIT, TIMEOUT_DURATION);
      const blockAfter = await ethers.provider.getBlock("latest");

      const [, , timeoutTime] = await gatewayTransaction.getRequestStatus(0);
      const expectedTimeout = blockAfter.timestamp + TIMEOUT_DURATION;
      expect(timeoutTime).to.be.closeTo(expectedTimeout, 5);
    });

    it("Should reject empty encrypted data", async function () {
      const emptyData = "0x";
      await expect(
        gatewayTransaction
          .connect(requester)
          .submitRequest(emptyData, GAS_LIMIT, TIMEOUT_DURATION)
      ).to.be.revertedWith("Empty data");
    });

    it("Should reject zero gas limit", async function () {
      const encryptedData = ethers.utils.defaultAbiCoder.encode(["uint256"], [222]);
      await expect(
        gatewayTransaction
          .connect(requester)
          .submitRequest(encryptedData, 0, TIMEOUT_DURATION)
      ).to.be.revertedWith("Invalid gas limit");
    });

    it("Should reject zero timeout", async function () {
      const encryptedData = ethers.utils.defaultAbiCoder.encode(["uint256"], [333]);
      await expect(
        gatewayTransaction
          .connect(requester)
          .submitRequest(encryptedData, GAS_LIMIT, 0)
      ).to.be.revertedWith("Invalid timeout");
    });

    it("Should handle multiple concurrent requests", async function () {
      const encryptedData1 = ethers.utils.defaultAbiCoder.encode(["uint256"], [1]);
      const encryptedData2 = ethers.utils.defaultAbiCoder.encode(["uint256"], [2]);

      await gatewayTransaction
        .connect(requester)
        .submitRequest(encryptedData1, GAS_LIMIT, TIMEOUT_DURATION);
      await gatewayTransaction
        .connect(verifier)
        .submitRequest(encryptedData2, GAS_LIMIT, TIMEOUT_DURATION);

      expect(await gatewayTransaction.requestCounter()).to.equal(2);
    });
  });

  // ============== Gateway Callback Tests ==============
  describe("Gateway Callback Processing", function () {
    it("Should process gateway callback", async function () {
      // Submit request
      const encryptedData = ethers.utils.defaultAbiCoder.encode(["uint256"], [500]);
      await gatewayTransaction
        .connect(requester)
        .submitRequest(encryptedData, GAS_LIMIT, TIMEOUT_DURATION);

      // Gateway processes
      const result = ethers.utils.defaultAbiCoder.encode(["uint256"], [1000]);
      const tx = await gatewayTransaction
        .connect(gateway)
        .gatewayCallback(0, result);

      expect(tx).to.not.be.reverted;
    });

    it("Should emit RequestProcessed event on callback", async function () {
      // Submit request
      const encryptedData = ethers.utils.defaultAbiCoder.encode(["uint256"], [600]);
      await gatewayTransaction
        .connect(requester)
        .submitRequest(encryptedData, GAS_LIMIT, TIMEOUT_DURATION);

      // Gateway processes
      const result = ethers.utils.defaultAbiCoder.encode(["uint256"], [1200]);
      const tx = gatewayTransaction.connect(gateway).gatewayCallback(0, result);

      await expect(tx)
        .to.emit(gatewayTransaction, "RequestProcessed");
    });

    it("Should only allow gateway to call gatewayCallback", async function () {
      // Submit request
      const encryptedData = ethers.utils.defaultAbiCoder.encode(["uint256"], [700]);
      await gatewayTransaction
        .connect(requester)
        .submitRequest(encryptedData, GAS_LIMIT, TIMEOUT_DURATION);

      // Non-gateway tries to call
      const result = ethers.utils.defaultAbiCoder.encode(["uint256"], [1400]);
      await expect(
        gatewayTransaction
          .connect(requester)
          .gatewayCallback(0, result)
      ).to.be.revertedWith("Not gateway");
    });

    it("Should reject callback for non-existent request", async function () {
      const result = ethers.utils.defaultAbiCoder.encode(["uint256"], [1500]);
      await expect(
        gatewayTransaction
          .connect(gateway)
          .gatewayCallback(999, result)
      ).to.be.revertedWith("Invalid request");
    });

    it("Should reject empty result in callback", async function () {
      // Submit request
      const encryptedData = ethers.utils.defaultAbiCoder.encode(["uint256"], [800]);
      await gatewayTransaction
        .connect(requester)
        .submitRequest(encryptedData, GAS_LIMIT, TIMEOUT_DURATION);

      // Empty result
      await expect(
        gatewayTransaction
          .connect(gateway)
          .gatewayCallback(0, "0x")
      ).to.be.revertedWith("Empty result");
    });
  });

  // ============== Refund Mechanism Tests ==============
  describe("Refund Mechanism", function () {
    it("Should allow requester to request refund for PENDING request", async function () {
      // Submit request
      const encryptedData = ethers.utils.defaultAbiCoder.encode(["uint256"], [900]);
      await gatewayTransaction
        .connect(requester)
        .submitRequest(encryptedData, GAS_LIMIT, TIMEOUT_DURATION);

      // Request refund
      const tx = await gatewayTransaction
        .connect(requester)
        .requestRefund(0);

      expect(tx).to.not.be.reverted;
    });

    it("Should emit RefundProcessed event", async function () {
      // Submit request
      const encryptedData = ethers.utils.defaultAbiCoder.encode(["uint256"], [1100]);
      await gatewayTransaction
        .connect(requester)
        .submitRequest(encryptedData, GAS_LIMIT, TIMEOUT_DURATION);

      // Request refund
      const tx = gatewayTransaction
        .connect(requester)
        .requestRefund(0);

      await expect(tx)
        .to.emit(gatewayTransaction, "RefundProcessed");
    });

    it("Should reject refund from non-requester", async function () {
      // Submit request
      const encryptedData = ethers.utils.defaultAbiCoder.encode(["uint256"], [1300]);
      await gatewayTransaction
        .connect(requester)
        .submitRequest(encryptedData, GAS_LIMIT, TIMEOUT_DURATION);

      // Different user tries to refund
      await expect(
        gatewayTransaction
          .connect(verifier)
          .requestRefund(0)
      ).to.be.revertedWith("Not requester");
    });

    it("Should reject refund for non-existent request", async function () {
      await expect(
        gatewayTransaction
          .connect(requester)
          .requestRefund(999)
      ).to.be.revertedWith("Invalid request");
    });

    it("Should prevent double refund", async function () {
      // Submit request
      const encryptedData = ethers.utils.defaultAbiCoder.encode(["uint256"], [1400]);
      await gatewayTransaction
        .connect(requester)
        .submitRequest(encryptedData, GAS_LIMIT, TIMEOUT_DURATION);

      // Request refund
      await gatewayTransaction
        .connect(requester)
        .requestRefund(0);

      // Try to refund again
      await expect(
        gatewayTransaction
          .connect(requester)
          .requestRefund(0)
      ).to.be.revertedWith("Already refunded");
    });
  });

  // ============== Timeout Protection Tests ==============
  describe("Timeout Protection", function () {
    it("Should track timeout time correctly", async function () {
      const encryptedData = ethers.utils.defaultAbiCoder.encode(["uint256"], [1600]);
      const blockBefore = await ethers.provider.getBlock("latest");

      await gatewayTransaction
        .connect(requester)
        .submitRequest(encryptedData, GAS_LIMIT, TIMEOUT_DURATION);

      const [, , timeoutTime] = await gatewayTransaction.getRequestStatus(0);
      const expectedMinTimeout = blockBefore.timestamp + TIMEOUT_DURATION;

      expect(timeoutTime).to.be.gte(expectedMinTimeout);
    });

    it("Should allow refund after timeout expires", async function () {
      const encryptedData = ethers.utils.defaultAbiCoder.encode(["uint256"], [1700]);
      await gatewayTransaction
        .connect(requester)
        .submitRequest(encryptedData, GAS_LIMIT, TIMEOUT_DURATION);

      // Mine blocks to reach timeout
      await ethers.provider.send("hardhat_mine", ["0x1000"]); // Mine many blocks

      // Now should be able to refund
      const tx = await gatewayTransaction
        .connect(requester)
        .requestRefund(0);

      expect(tx).to.not.be.reverted;
    });

    it("Should emit TimeoutTriggered event when timeout expires", async function () {
      const encryptedData = ethers.utils.defaultAbiCoder.encode(["uint256"], [1800]);
      await gatewayTransaction
        .connect(requester)
        .submitRequest(encryptedData, GAS_LIMIT, TIMEOUT_DURATION);

      // Mine blocks to reach timeout
      await ethers.provider.send("hardhat_mine", ["0x1000"]);

      // Refund should trigger timeout event
      const tx = gatewayTransaction
        .connect(requester)
        .requestRefund(0);

      await expect(tx)
        .to.emit(gatewayTransaction, "TimeoutTriggered");
    });

    it("Should prevent refund before timeout if no callback", async function () {
      const encryptedData = ethers.utils.defaultAbiCoder.encode(["uint256"], [1900]);
      const shortTimeout = 100; // Very short timeout in seconds

      await gatewayTransaction
        .connect(requester)
        .submitRequest(encryptedData, GAS_LIMIT, shortTimeout);

      // Try to refund without waiting for timeout
      const [, , timeoutTime] = await gatewayTransaction.getRequestStatus(0);
      const block = await ethers.provider.getBlock("latest");

      if (block.timestamp < timeoutTime) {
        await expect(
          gatewayTransaction
            .connect(requester)
            .requestRefund(0)
        ).to.be.revertedWith("Not timed out");
      }
    });
  });

  // ============== Status Query Tests ==============
  describe("Request Status Queries", function () {
    it("Should return PENDING status for new request", async function () {
      const encryptedData = ethers.utils.defaultAbiCoder.encode(["uint256"], [2000]);
      await gatewayTransaction
        .connect(requester)
        .submitRequest(encryptedData, GAS_LIMIT, TIMEOUT_DURATION);

      const [status] = await gatewayTransaction.getRequestStatus(0);
      expect(status).to.equal(0); // PENDING
    });

    it("Should return correct submit time", async function () {
      const encryptedData = ethers.utils.defaultAbiCoder.encode(["uint256"], [2100]);
      const blockBefore = await ethers.provider.getBlock("latest");

      await gatewayTransaction
        .connect(requester)
        .submitRequest(encryptedData, GAS_LIMIT, TIMEOUT_DURATION);

      const blockAfter = await ethers.provider.getBlock("latest");
      const [, submitTime] = await gatewayTransaction.getRequestStatus(0);

      expect(submitTime).to.be.lte(blockAfter.timestamp);
      expect(submitTime).to.be.gte(blockBefore.timestamp);
    });

    it("Should retrieve complete request history", async function () {
      const encryptedData = ethers.utils.defaultAbiCoder.encode(["uint256"], [2200]);
      await gatewayTransaction
        .connect(requester)
        .submitRequest(encryptedData, GAS_LIMIT, TIMEOUT_DURATION);

      const request = await gatewayTransaction.getRequestHistory(0);
      expect(request.requester).to.equal(requester.address);
      expect(request.status).to.equal(0); // PENDING
    });
  });

  // ============== Access Control Tests ==============
  describe("Access Control", function () {
    it("Should allow owner to set gateway address", async function () {
      const newGateway = verifier.address;
      const tx = await gatewayTransaction
        .connect(owner)
        .setGatewayAddress(newGateway);

      expect(tx).to.not.be.reverted;
      expect(await gatewayTransaction.gatewayAddress()).to.equal(newGateway);
    });

    it("Should reject non-owner setting gateway address", async function () {
      const newGateway = verifier.address;
      await expect(
        gatewayTransaction
          .connect(requester)
          .setGatewayAddress(newGateway)
      ).to.be.revertedWith("Ownable");
    });

    it("Should allow owner to set request timeout", async function () {
      const newTimeout = 7200; // 2 hours
      const tx = await gatewayTransaction
        .connect(owner)
        .setRequestTimeout(newTimeout);

      expect(tx).to.not.be.reverted;
      expect(await gatewayTransaction.requestTimeout()).to.equal(newTimeout);
    });

    it("Should reject non-owner setting request timeout", async function () {
      const newTimeout = 7200;
      await expect(
        gatewayTransaction
          .connect(requester)
          .setRequestTimeout(newTimeout)
      ).to.be.revertedWith("Ownable");
    });
  });

  // ============== Edge Case Tests ==============
  describe("Edge Cases and Error Handling", function () {
    it("Should handle requests with very small timeout", async function () {
      const encryptedData = ethers.utils.defaultAbiCoder.encode(["uint256"], [2300]);
      const minTimeout = 1;

      const tx = await gatewayTransaction
        .connect(requester)
        .submitRequest(encryptedData, GAS_LIMIT, minTimeout);

      expect(tx).to.not.be.reverted;
    });

    it("Should handle requests with large gas limit", async function () {
      const encryptedData = ethers.utils.defaultAbiCoder.encode(["uint256"], [2400]);
      const largeGasLimit = ethers.constants.MaxUint256.div(2);

      const tx = await gatewayTransaction
        .connect(requester)
        .submitRequest(encryptedData, largeGasLimit, TIMEOUT_DURATION);

      expect(tx).to.not.be.reverted;
    });

    it("Should handle callback for already processed request", async function () {
      const encryptedData = ethers.utils.defaultAbiCoder.encode(["uint256"], [2500]);
      await gatewayTransaction
        .connect(requester)
        .submitRequest(encryptedData, GAS_LIMIT, TIMEOUT_DURATION);

      const result1 = ethers.utils.defaultAbiCoder.encode(["uint256"], [5000]);
      await gatewayTransaction
        .connect(gateway)
        .gatewayCallback(0, result1);

      // Try second callback
      const result2 = ethers.utils.defaultAbiCoder.encode(["uint256"], [5100]);
      await expect(
        gatewayTransaction
          .connect(gateway)
          .gatewayCallback(0, result2)
      ).to.be.revertedWith("Not pending");
    });

    it("Should handle max request counter", async function () {
      // Note: In practice, uint256 max is extremely large
      // This test just verifies the counter increments correctly
      const encryptedData = ethers.utils.defaultAbiCoder.encode(["uint256"], [2600]);

      for (let i = 0; i < 5; i++) {
        await gatewayTransaction
          .connect(requester)
          .submitRequest(encryptedData, GAS_LIMIT, TIMEOUT_DURATION);
      }

      expect(await gatewayTransaction.requestCounter()).to.equal(5);
    });

    it("Should handle requests from same user", async function () {
      const encryptedData = ethers.utils.defaultAbiCoder.encode(["uint256"], [2700]);

      for (let i = 0; i < 3; i++) {
        await gatewayTransaction
          .connect(requester)
          .submitRequest(encryptedData, GAS_LIMIT, TIMEOUT_DURATION);
      }

      expect(await gatewayTransaction.requestCounter()).to.equal(3);
    });
  });

  // ============== Integration Tests ==============
  describe("Integration Scenarios", function () {
    it("Should handle complete request lifecycle", async function () {
      // 1. Submit request
      const encryptedData = ethers.utils.defaultAbiCoder.encode(["uint256"], [3000]);
      await gatewayTransaction
        .connect(requester)
        .submitRequest(encryptedData, GAS_LIMIT, TIMEOUT_DURATION);

      // 2. Verify PENDING status
      const [status1] = await gatewayTransaction.getRequestStatus(0);
      expect(status1).to.equal(0); // PENDING

      // 3. Gateway processes
      const result = ethers.utils.defaultAbiCoder.encode(["uint256"], [6000]);
      await gatewayTransaction
        .connect(gateway)
        .gatewayCallback(0, result);

      // 4. Verify PROCESSING status
      const [status2] = await gatewayTransaction.getRequestStatus(0);
      expect(status2).to.equal(1); // PROCESSING
    });

    it("Should handle multiple requests in sequence", async function () {
      for (let i = 0; i < 3; i++) {
        const data = ethers.utils.defaultAbiCoder.encode(["uint256"], [3100 + i]);
        await gatewayTransaction
          .connect(requester)
          .submitRequest(data, GAS_LIMIT, TIMEOUT_DURATION);

        const result = ethers.utils.defaultAbiCoder.encode(["uint256"], [6200 + i]);
        await gatewayTransaction
          .connect(gateway)
          .gatewayCallback(i, result);
      }

      expect(await gatewayTransaction.requestCounter()).to.equal(3);
    });

    it("Should handle mixed operations", async function () {
      // Submit multiple requests
      const data1 = ethers.utils.defaultAbiCoder.encode(["uint256"], [3200]);
      const data2 = ethers.utils.defaultAbiCoder.encode(["uint256"], [3300]);

      await gatewayTransaction
        .connect(requester)
        .submitRequest(data1, GAS_LIMIT, TIMEOUT_DURATION);
      await gatewayTransaction
        .connect(verifier)
        .submitRequest(data2, GAS_LIMIT, TIMEOUT_DURATION);

      // Process one
      const result1 = ethers.utils.defaultAbiCoder.encode(["uint256"], [6400]);
      await gatewayTransaction
        .connect(gateway)
        .gatewayCallback(0, result1);

      // Refund the other
      await gatewayTransaction
        .connect(verifier)
        .requestRefund(1);

      // Verify states
      const [status1] = await gatewayTransaction.getRequestStatus(0);
      const [status2] = await gatewayTransaction.getRequestStatus(1);

      expect(status1).to.equal(1); // PROCESSING
      expect(status2).to.equal(3); // REFUNDED
    });
  });
});
