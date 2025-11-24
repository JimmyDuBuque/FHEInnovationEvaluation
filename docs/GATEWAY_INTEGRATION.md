# Zamad Gateway Integration Guide

## Table of Contents
1. [Overview](#overview)
2. [Gateway Setup Requirements](#gateway-setup-requirements)
3. [Callback Function Requirements](#callback-function-requirements)
4. [Event Listening and Processing](#event-listening-and-processing)
5. [Signature Verification](#signature-verification)
6. [Timeout Handling](#timeout-handling)
7. [Monitoring and Alerting](#monitoring-and-alerting)
8. [Sample Implementation](#sample-implementation)

## Overview

The Zamad gateway service acts as a trusted intermediary that:
- Receives encrypted requests from users
- Decrypts requests using the gateway's private key
- Executes computations on the decrypted data
- Encrypts results using user's public key
- Submits results back to the blockchain

This document outlines integration requirements for gateway operators.

## Gateway Setup Requirements

### Infrastructure Requirements

```yaml
- Minimum Specs:
    cpu: 4 cores
    memory: 8GB RAM
    storage: 100GB SSD
    network: 1Gbps
    uptime_sla: 99.9%

- Network:
    ports:
      - 8080: REST API
      - 8443: WebSocket API
      - 9090: Metrics endpoint
    firewall: Whitelist known clients
    dns: Use DNS failover for HA

- Security:
    encryption: TLS 1.3 minimum
    key_storage: HSM recommended
    backup: Daily encrypted backups
    audit_logs: Enable and monitor
```

### Key Management

```javascript
// Generate gateway keypair
const crypto = require('crypto');
const { EC } = require('elliptic');

class GatewayKeyManager {
  constructor() {
    this.ec = new EC('secp256k1');
  }

  generateKeypair() {
    const key = this.ec.genKeyPair();
    return {
      publicKey: key.getPublic('hex'),
      privateKey: key.getPrivate('hex')
    };
  }

  async loadKeysFromHSM() {
    // Implementation for HSM integration
    // Example: AWS CloudHSM, Azure Key Vault, etc.
    const publicKey = await hsmClient.getPublicKey('zamad-gateway');
    const privateKey = await hsmClient.getPrivateKey('zamad-gateway');
    return { publicKey, privateKey };
  }

  async rotateKeys() {
    // Key rotation strategy
    const oldKey = this.currentKey;
    const newKey = this.generateKeypair();

    // Announce new key to contract
    await this.announceKeyRotation(newKey.publicKey);

    // Wait for clients to update
    await this.waitForClientUpdate();

    // Switch to new key
    this.currentKey = newKey;
  }
}
```

### Environment Configuration

```bash
# .env.gateway
GATEWAY_PRIVATE_KEY=0x...
GATEWAY_PUBLIC_KEY=0x...
GATEWAY_ADDRESS=0x...

CONTRACT_ADDRESS=0x...
RPC_ENDPOINT=https://sepolia.infura.io/v3/...
WEBSOCKET_ENDPOINT=wss://sepolia.infura.io/ws/v3/...

GATEWAY_PORT=8080
GATEWAY_WEBSOCKET_PORT=8443
GATEWAY_METRICS_PORT=9090

LOG_LEVEL=info
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Security
ALLOWED_ORIGINS=https://app.zamadapp.com
API_KEY_HASH=sha256(...)
REQUEST_TIMEOUT=30000
MAX_REQUESTS_PER_SECOND=100
```

## Callback Function Requirements

### Smart Contract Callback Function

The gateway calls a callback function on a user-specified contract to deliver the result:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IZamadCallback {
    /**
     * @notice Called by gateway to deliver encrypted result
     * @param requestId The original request ID
     * @param result The encrypted result data
     * @param resultHash Hash of result for verification
     */
    function onZamadResult(
        bytes32 requestId,
        bytes calldata result,
        bytes32 resultHash
    ) external;

    /**
     * @notice Called by gateway when request fails
     * @param requestId The original request ID
     * @param errorCode Error code indicating failure reason
     * @param errorMessage Human-readable error message
     */
    function onZamadError(
        bytes32 requestId,
        uint256 errorCode,
        string calldata errorMessage
    ) external;
}
```

### Gateway Callback Implementation

```javascript
class GatewayCallbackHandler {
  constructor(provider, signer, contractAddress) {
    this.provider = provider;
    this.signer = signer;
    this.contractAddress = contractAddress;
    this.abi = require('./abi/ZamadRequest.json');
  }

  async submitResult(requestId, encryptedResult, userCallbackAddress) {
    try {
      // 1. Compute result hash for verification
      const resultHash = this.hashResult(encryptedResult);

      // 2. Build callback transaction
      const iface = new ethers.Interface(this.abi);
      const calldata = iface.encodeFunctionData('submitResult', [
        requestId,
        encryptedResult,
        resultHash
      ]);

      // 3. Submit callback with retry logic
      const receipt = await this.submitWithRetry(userCallbackAddress, calldata);

      console.log(`Result submitted for ${requestId}: ${receipt.hash}`);
      return receipt;
    } catch (error) {
      // Fall back to direct contract submission
      return this.submitToMainContract(requestId, encryptedResult);
    }
  }

  async submitError(requestId, userCallbackAddress, errorCode, errorMessage) {
    try {
      const iface = new ethers.Interface(this.abi);
      const calldata = iface.encodeFunctionData('submitError', [
        requestId,
        errorCode,
        errorMessage
      ]);

      const receipt = await this.submitWithRetry(userCallbackAddress, calldata);
      return receipt;
    } catch (error) {
      console.error(`Failed to submit error for ${requestId}:`, error);
      // Log to database for manual intervention
      await this.logFailedCallback(requestId, errorCode, errorMessage);
    }
  }

  async submitWithRetry(targetAddress, calldata, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        // Estimate gas
        const gasEstimate = await this.provider.estimateGas({
          to: targetAddress,
          data: calldata
        });

        // Add 20% buffer
        const gasLimit = (gasEstimate * 120n) / 100n;

        // Get current gas price
        const gasPrice = await this.provider.getGasPrice();

        // Submit transaction
        const tx = await this.signer.sendTransaction({
          to: targetAddress,
          data: calldata,
          gasLimit,
          gasPrice
        });

        return await tx.wait();
      } catch (error) {
        console.error(`Callback submission attempt ${i + 1} failed:`, error);

        if (i === maxRetries - 1) {
          throw error;
        }

        // Exponential backoff
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
      }
    }
  }

  hashResult(encryptedResult) {
    return ethers.keccak256(encryptedResult);
  }

  async submitToMainContract(requestId, encryptedResult) {
    // Fallback: submit directly to main contract
    const contract = new ethers.Contract(
      this.contractAddress,
      this.abi,
      this.signer
    );

    const tx = await contract.submitResult(requestId, encryptedResult);
    return await tx.wait();
  }

  async logFailedCallback(requestId, errorCode, errorMessage) {
    // Log to persistent storage for later retry
    await database.insertFailedCallback({
      requestId,
      errorCode,
      errorMessage,
      timestamp: Date.now(),
      retryCount: 0
    });
  }
}
```

## Event Listening and Processing

### Setting Up Event Listeners

```javascript
class GatewayEventListener {
  constructor(provider, contractAddress, abi) {
    this.provider = provider;
    this.contractAddress = contractAddress;
    this.contract = new ethers.Contract(contractAddress, abi, provider);
    this.processingQueue = [];
  }

  async startListening() {
    // Listen for new requests
    this.contract.on('RequestSubmitted', (requestId, requester, data, threshold) => {
      this.processRequest(requestId, requester, data, threshold);
    });

    // Listen for cancellations
    this.contract.on('RequestCancelled', (requestId) => {
      this.cancelRequest(requestId);
    });

    // Listen for refund claims
    this.contract.on('RefundClaimed', (requestId, requester, amount) => {
      this.handleRefundClaim(requestId, requester, amount);
    });

    console.log('Event listeners started');
  }

  async processRequest(requestId, requester, encryptedData, threshold) {
    try {
      // 1. Validate request
      const isValid = await this.validateRequest(requestId, requester, threshold);
      if (!isValid) {
        console.log(`Invalid request: ${requestId}`);
        return;
      }

      // 2. Decrypt data
      const decryptedData = this.decryptData(encryptedData);

      // 3. Execute computation
      const result = await this.executeComputation(decryptedData);

      // 4. Encrypt result
      const encryptedResult = this.encryptResult(result, requester);

      // 5. Submit result callback
      await this.submitResult(requestId, encryptedResult);

      // 6. Log successful processing
      await this.logProcessing({
        requestId,
        status: 'completed',
        timestamp: Date.now()
      });
    } catch (error) {
      console.error(`Error processing request ${requestId}:`, error);
      await this.handleProcessingError(requestId, error);
    }
  }

  async validateRequest(requestId, requester, threshold) {
    // Check request exists in contract
    const contract = new ethers.Contract(
      this.contractAddress,
      require('./abi/ZamadRequest.json'),
      this.provider
    );

    const request = await contract.getRequest(requestId);

    return request.requester === requester &&
           request.threshold >= (await this.provider.getBlockNumber());
  }

  decryptData(encryptedData) {
    // Use gateway's private key to decrypt
    const privateKey = process.env.GATEWAY_PRIVATE_KEY;
    // Implementation depends on encryption scheme
    return performDecryption(encryptedData, privateKey);
  }

  async executeComputation(data) {
    // Parse computation type and execute
    const { operation, operands, parameters } = data;

    switch (operation) {
      case 'division':
        return this.executeDivision(operands, parameters);
      case 'swap':
        return this.executeSwap(operands, parameters);
      case 'multiply':
        return this.executeMultiply(operands, parameters);
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  executeDivision(operands, parameters) {
    const [dividend, divisor] = operands;

    if (divisor === 0) {
      throw new Error('Division by zero');
    }

    const scaling = parameters.scaling || 1;
    return {
      result: (dividend * scaling) / divisor,
      precision: parameters.precision || 18
    };
  }

  async executeSwap(operands, parameters) {
    // Mock implementation
    const [amountIn, pricePerToken] = operands;
    const slippage = parameters.slippage || 0.005;

    const expectedOutput = amountIn / pricePerToken;
    const minOutput = expectedOutput * (1 - slippage);

    return {
      expectedOutput,
      minOutput,
      priceImpact: 0.001
    };
  }

  executeMultiply(operands, parameters) {
    const [a, b] = operands;
    const scaling = parameters.scaling || 1;

    return {
      result: (a * b) / scaling,
      precision: parameters.precision || 18
    };
  }

  encryptResult(result, requesterPublicKey) {
    // Encrypt using requester's public key
    return performEncryption(JSON.stringify(result), requesterPublicKey);
  }

  async submitResult(requestId, encryptedResult) {
    // Implementation provided in Callback Handler section
    const callbackHandler = new GatewayCallbackHandler(
      this.provider,
      this.signer,
      this.contractAddress
    );

    return await callbackHandler.submitResult(requestId, encryptedResult);
  }

  async handleProcessingError(requestId, error) {
    const errorCode = this.mapErrorToCode(error);
    const errorMessage = error.message;

    // Log error
    await this.logError({
      requestId,
      errorCode,
      errorMessage,
      timestamp: Date.now()
    });

    // Attempt to notify user
    // Implementation depends on callback contract
  }

  mapErrorToCode(error) {
    const errorMap = {
      'Division by zero': 2003,
      'Invalid computation': 2002,
      'Decryption failed': 2001,
      'Unknown operation': 2004
    };

    return errorMap[error.message] || 9999; // 9999 = unknown error
  }

  async cancelRequest(requestId) {
    console.log(`Request ${requestId} cancelled`);
    // Stop processing if in progress
    const index = this.processingQueue.findIndex(r => r.requestId === requestId);
    if (index !== -1) {
      this.processingQueue.splice(index, 1);
    }
  }

  async handleRefundClaim(requestId, requester, amount) {
    // Log refund claim
    await this.logRefund({
      requestId,
      requester,
      amount,
      timestamp: Date.now()
    });
  }

  async logProcessing(data) {
    // Store in database
    await database.insertLog('processing', data);
  }

  async logError(data) {
    // Store in database
    await database.insertLog('error', data);
  }

  async logRefund(data) {
    // Store in database
    await database.insertLog('refund', data);
  }
}
```

## Signature Verification

### Verifying Request Signatures

```javascript
class SignatureVerifier {
  constructor(contractAddress, provider) {
    this.contractAddress = contractAddress;
    this.provider = provider;
  }

  async verifyRequestSignature(requestId, data, signature, publicKey) {
    // 1. Reconstruct message hash
    const messageHash = this.computeMessageHash(requestId, data);

    // 2. Recover signer from signature
    const recoveredAddress = ethers.recoverAddress(messageHash, signature);

    // 3. Verify recovered address matches expected signer
    return recoveredAddress === publicKey;
  }

  computeMessageHash(requestId, data) {
    // Use EIP-191 signed message format
    const message = ethers.solidityPacked(
      ['bytes32', 'bytes'],
      [requestId, data]
    );

    return ethers.hashMessage(message);
  }

  verifyResultSignature(requestId, result, signature, gatewayAddress) {
    // Gateway signs result before submission
    const messageHash = this.computeResultHash(requestId, result);
    const recoveredAddress = ethers.recoverAddress(messageHash, signature);

    return recoveredAddress === gatewayAddress;
  }

  computeResultHash(requestId, result) {
    const message = ethers.solidityPacked(
      ['bytes32', 'bytes'],
      [requestId, result]
    );

    return ethers.hashMessage(message);
  }

  async signResult(requestId, result, privateKey) {
    const messageHash = this.computeResultHash(requestId, result);
    const signature = ethers.SigningKey.signMessage(messageHash, privateKey);
    return signature;
  }
}
```

## Timeout Handling

### Monitoring Request Timeouts

```javascript
class TimeoutHandler {
  constructor(provider, contractAddress, abi) {
    this.provider = provider;
    this.contractAddress = contractAddress;
    this.abi = abi;
    this.contract = new ethers.Contract(contractAddress, abi, provider);
  }

  async monitorTimeouts() {
    // Poll contract for timed-out requests
    setInterval(() => this.checkForTimeouts(), 30000); // Every 30 seconds
  }

  async checkForTimeouts() {
    const pendingRequests = await this.getPendingRequests();
    const currentBlock = await this.provider.getBlockNumber();

    for (const request of pendingRequests) {
      if (currentBlock >= request.threshold) {
        await this.handleTimeout(request);
      }
    }
  }

  async getPendingRequests() {
    // Query all pending requests from contract
    const filter = this.contract.filters.RequestSubmitted();
    const events = await this.contract.queryFilter(filter, 0, 'latest');

    const pending = [];
    for (const event of events) {
      const requestId = event.args.requestId;
      const request = await this.contract.getRequest(requestId);

      if (request.status === 0) { // PENDING
        pending.push(request);
      }
    }

    return pending;
  }

  async handleTimeout(request) {
    console.log(`Request ${request.requestId} has timed out`);

    // 1. Log timeout
    await this.logTimeout(request.requestId);

    // 2. Notify user (if applicable)
    // Implementation depends on how to contact user

    // 3. Ensure gateway doesn't reprocess
    this.removeFromProcessingQueue(request.requestId);
  }

  removeFromProcessingQueue(requestId) {
    // Remove from in-flight processing queue
    // This prevents submitting result after timeout
  }

  async logTimeout(requestId) {
    await database.insertLog('timeout', {
      requestId,
      timestamp: Date.now()
    });
  }

  async handleLateResult(requestId, result) {
    // Result arrived after timeout - don't submit
    console.warn(`Late result for timed-out request: ${requestId}`);
    await this.logLateResult(requestId, result);
  }

  async logLateResult(requestId, result) {
    await database.insertLog('late_result', {
      requestId,
      result,
      timestamp: Date.now()
    });
  }
}
```

## Monitoring and Alerting

### Metrics Collection

```javascript
const prometheus = require('prom-client');

class GatewayMetrics {
  constructor() {
    // Request metrics
    this.requestsReceived = new prometheus.Counter({
      name: 'zamad_requests_received_total',
      help: 'Total requests received',
      labelNames: ['operation_type']
    });

    this.requestsProcessed = new prometheus.Counter({
      name: 'zamad_requests_processed_total',
      help: 'Total requests processed',
      labelNames: ['operation_type', 'status']
    });

    this.requestDuration = new prometheus.Histogram({
      name: 'zamad_request_duration_seconds',
      help: 'Request processing duration',
      labelNames: ['operation_type'],
      buckets: [0.1, 0.5, 1, 2, 5, 10]
    });

    // Error metrics
    this.errors = new prometheus.Counter({
      name: 'zamad_errors_total',
      help: 'Total errors',
      labelNames: ['error_type']
    });

    // Timeout metrics
    this.timeouts = new prometheus.Counter({
      name: 'zamad_timeouts_total',
      help: 'Total request timeouts'
    });

    // Gas metrics
    this.gasUsed = new prometheus.Histogram({
      name: 'zamad_gas_used',
      help: 'Gas used per transaction',
      buckets: [100000, 200000, 300000, 500000, 1000000]
    });

    // Health metrics
    this.gatewayUptime = new prometheus.Gauge({
      name: 'zamad_gateway_uptime_seconds',
      help: 'Gateway uptime'
    });

    this.pendingRequests = new prometheus.Gauge({
      name: 'zamad_pending_requests',
      help: 'Number of pending requests'
    });
  }

  recordRequest(operationType) {
    this.requestsReceived.inc({ operation_type: operationType });
  }

  recordProcessed(operationType, status) {
    this.requestsProcessed.inc({ operation_type: operationType, status });
  }

  recordDuration(operationType, durationSeconds) {
    this.requestDuration.observe({ operation_type: operationType }, durationSeconds);
  }

  recordError(errorType) {
    this.errors.inc({ error_type: errorType });
  }

  recordTimeout() {
    this.timeouts.inc();
  }

  recordGasUsed(amount) {
    this.gasUsed.observe(amount);
  }

  setUptime(seconds) {
    this.gatewayUptime.set(seconds);
  }

  setPendingRequests(count) {
    this.pendingRequests.set(count);
  }
}

// Export metrics endpoint
const express = require('express');
const app = express();

app.get('/metrics', (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(prometheus.register.metrics());
});
```

### Alerting Configuration

```javascript
class AlertManager {
  constructor() {
    this.alertThresholds = {
      errorRate: 0.05,           // Alert if > 5% errors
      timeoutRate: 0.01,         // Alert if > 1% timeouts
      avgProcessingTime: 5000,   // Alert if avg > 5 seconds
      gasPrice: ethers.parseUnits('100', 'gwei'), // Alert if > 100 gwei
      pendingRequests: 1000      // Alert if > 1000 pending
    };

    this.alertChannels = [];
  }

  addAlertChannel(type, config) {
    // type: 'slack', 'email', 'pagerduty', 'discord'
    this.alertChannels.push({ type, config });
  }

  async checkAndAlert(metrics) {
    const alerts = [];

    // Check error rate
    if (metrics.errorRate > this.alertThresholds.errorRate) {
      alerts.push({
        severity: 'warning',
        title: 'High error rate detected',
        message: `Error rate: ${(metrics.errorRate * 100).toFixed(2)}%`
      });
    }

    // Check timeout rate
    if (metrics.timeoutRate > this.alertThresholds.timeoutRate) {
      alerts.push({
        severity: 'critical',
        title: 'High timeout rate detected',
        message: `Timeout rate: ${(metrics.timeoutRate * 100).toFixed(2)}%`
      });
    }

    // Check processing time
    if (metrics.avgProcessingTime > this.alertThresholds.avgProcessingTime) {
      alerts.push({
        severity: 'warning',
        title: 'Slow request processing',
        message: `Average processing time: ${metrics.avgProcessingTime.toFixed(0)}ms`
      });
    }

    // Check gas prices
    if (metrics.gasPrice > this.alertThresholds.gasPrice) {
      alerts.push({
        severity: 'info',
        title: 'High gas prices',
        message: `Current gas price: ${ethers.formatUnits(metrics.gasPrice, 'gwei')} gwei`
      });
    }

    // Send alerts
    for (const alert of alerts) {
      await this.sendAlert(alert);
    }
  }

  async sendAlert(alert) {
    for (const channel of this.alertChannels) {
      switch (channel.type) {
        case 'slack':
          await this.sendToSlack(channel.config, alert);
          break;
        case 'email':
          await this.sendEmail(channel.config, alert);
          break;
        case 'discord':
          await this.sendToDiscord(channel.config, alert);
          break;
      }
    }
  }

  async sendToSlack(config, alert) {
    const axios = require('axios');
    await axios.post(config.webhookUrl, {
      text: `[${alert.severity.toUpperCase()}] ${alert.title}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${alert.title}*\n${alert.message}`
          }
        }
      ]
    });
  }

  async sendEmail(config, alert) {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport(config.smtp);

    await transporter.sendMail({
      from: config.from,
      to: config.to,
      subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
      text: alert.message
    });
  }

  async sendToDiscord(config, alert) {
    const axios = require('axios');
    await axios.post(config.webhookUrl, {
      embeds: [
        {
          title: alert.title,
          description: alert.message,
          color: this.getSeverityColor(alert.severity)
        }
      ]
    });
  }

  getSeverityColor(severity) {
    const colors = {
      info: 3447003,      // blue
      warning: 15158332,  // orange
      critical: 15105570 // red
    };
    return colors[severity] || 3447003;
  }
}
```

## Sample Implementation

### Complete Gateway Service

```javascript
class ZamadGateway {
  constructor(config) {
    this.config = config;
    this.provider = new ethers.JsonRpcProvider(config.rpcEndpoint);
    this.signer = new ethers.Wallet(config.privateKey, this.provider);

    this.metrics = new GatewayMetrics();
    this.alertManager = new AlertManager();
    this.eventListener = new GatewayEventListener(
      this.provider,
      config.contractAddress,
      require('./abi/ZamadRequest.json')
    );
    this.signatureVerifier = new SignatureVerifier(
      config.contractAddress,
      this.provider
    );
    this.timeoutHandler = new TimeoutHandler(
      this.provider,
      config.contractAddress,
      require('./abi/ZamadRequest.json')
    );
  }

  async start() {
    console.log('Starting Zamad Gateway...');

    // Start event listeners
    await this.eventListener.startListening();

    // Start timeout monitoring
    await this.timeoutHandler.monitorTimeouts();

    // Start health checks
    this.startHealthChecks();

    // Start metrics server
    this.startMetricsServer();

    console.log('Gateway started successfully');
  }

  startHealthChecks() {
    setInterval(async () => {
      try {
        const blockNumber = await this.provider.getBlockNumber();
        console.log(`Health check: Block ${blockNumber}`);
        this.metrics.setUptime(process.uptime());
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, 60000); // Every minute
  }

  startMetricsServer() {
    const express = require('express');
    const app = express();
    const prometheus = require('prom-client');

    app.get('/metrics', (req, res) => {
      res.set('Content-Type', prometheus.register.contentType);
      res.end(prometheus.register.metrics());
    });

    app.get('/health', (req, res) => {
      res.json({ status: 'ok', uptime: process.uptime() });
    });

    app.listen(this.config.metricsPort, () => {
      console.log(`Metrics server listening on port ${this.config.metricsPort}`);
    });
  }

  async processRequest(requestData) {
    const startTime = Date.now();
    const operationType = requestData.operation;

    try {
      // Record request received
      this.metrics.recordRequest(operationType);

      // Verify signature if present
      if (requestData.signature) {
        const isValid = await this.signatureVerifier.verifyRequestSignature(
          requestData.requestId,
          requestData.data,
          requestData.signature,
          requestData.publicKey
        );

        if (!isValid) {
          throw new Error('Invalid request signature');
        }
      }

      // Process request
      const result = await this.eventListener.executeComputation(requestData);

      // Record success
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.recordProcessed(operationType, 'success');
      this.metrics.recordDuration(operationType, duration);

      return result;
    } catch (error) {
      console.error(`Error processing request:`, error);
      this.metrics.recordError(error.message);
      throw error;
    }
  }
}

// Run gateway
const gateway = new ZamadGateway({
  rpcEndpoint: process.env.RPC_ENDPOINT,
  contractAddress: process.env.CONTRACT_ADDRESS,
  privateKey: process.env.GATEWAY_PRIVATE_KEY,
  metricsPort: process.env.GATEWAY_METRICS_PORT || 9090
});

gateway.start().catch(console.error);
```

This comprehensive guide provides all necessary information for integrating with the Zamad gateway service.
