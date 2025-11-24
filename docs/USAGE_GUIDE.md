# Zamad Protocol - User Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Submitting Encrypted Requests](#submitting-encrypted-requests)
3. [Monitoring Request Status](#monitoring-request-status)
4. [Claiming Refunds](#claiming-refunds)
5. [Computing Private Division](#computing-private-division)
6. [Example Scenarios](#example-scenarios)
7. [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites
- Node.js v16 or higher
- ethers.js library v6.x
- Access to a Web3 wallet (MetaMask, WalletConnect, etc.)
- ETH for gas fees (test ETH on Sepolia testnet)
- Gateway service URL (provided by Zamad)

### Installation

```bash
npm install ethers@6.x
npm install @zamadapp/contracts
```

### Basic Setup

```javascript
import { ethers } from 'ethers';

// Connect to blockchain
const provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/YOUR_API_KEY');
const signer = new ethers.Wallet(PRIVATE_KEY, provider);

// Initialize contract
const CONTRACT_ADDRESS = '0x...';
const ABI = require('./abi/ZamadRequest.json');
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
```

## Submitting Encrypted Requests

### Overview
Encrypted requests are the core mechanism of the Zamad protocol. They allow users to submit private data that is encrypted and processed by the gateway service.

### Request Structure

```javascript
interface EncryptedRequest {
  requestId: string;          // Unique identifier
  encryptedData: string;      // Encrypted payload
  publicKey: string;          // Gateway's public key (for encryption)
  threshold: number;          // Timeout threshold in blocks
  gasLimit: number;           // Expected gas limit
  callback: string;           // Callback contract address
  callbackSelector: string;   // Function selector for callback
}
```

### Step-by-Step Guide

#### Step 1: Prepare Your Data

```javascript
// Your private data
const privateData = {
  amount: 1000,
  slippage: 0.005,
  minOutput: 995,
  path: ['USDC', 'ETH', 'DAI']
};

const encodedData = ethers.AbiCoder.defaultAbiCoder().encode(
  ['uint256', 'uint256', 'uint256', 'string[]'],
  [privateData.amount, privateData.slippage, privateData.minOutput, privateData.path]
);
```

#### Step 2: Encrypt the Data

```javascript
// Gateway's public key (obtained from gateway service)
const gatewayPublicKey = '0x...';

// Simple encryption using ECIES (or use a library like libp2p-crypto)
function encryptData(data, publicKey) {
  // Implementation depends on your encryption scheme
  // This is a placeholder
  return ethers.hexlify(ethers.toUtf8Bytes(data));
}

const encryptedData = encryptData(encodedData, gatewayPublicKey);
```

#### Step 3: Submit the Request

```javascript
// Set timeout (e.g., 100 blocks from now)
const blockNumber = await provider.getBlockNumber();
const threshold = blockNumber + 100;

// Submit request
const tx = await contract.submitRequest(
  encryptedData,
  threshold,
  {
    value: ethers.parseEther('0.01'), // Fee in ETH
    gasLimit: 200000
  }
);

const receipt = await tx.wait();
const requestId = receipt.logs[0].args.requestId;

console.log(`Request submitted with ID: ${requestId}`);
```

### Request Fees

| Network | Base Fee | Per Block | Example (100 blocks) |
|---------|----------|-----------|---------------------|
| Sepolia | 0.001 ETH | 0.00001 ETH | ~0.002 ETH |
| Ethereum | 0.01 ETH | 0.0001 ETH | ~0.02 ETH |
| Arbitrum | 0.0001 ETH | 0.000001 ETH | ~0.0002 ETH |

## Monitoring Request Status

### Tracking Request Status

```javascript
// Get request details
const requestDetails = await contract.getRequest(requestId);

console.log({
  status: requestDetails.status,           // 0: Pending, 1: Completed, 2: Refunded
  requester: requestDetails.requester,
  createdAt: requestDetails.createdAt,
  threshold: requestDetails.threshold,
  result: requestDetails.result,           // Will be null until completed
  refunded: requestDetails.refunded
});
```

### Status Codes

- **0 - PENDING**: Request waiting for gateway response
- **1 - COMPLETED**: Result received and processed
- **2 - REFUNDED**: Timeout occurred, fee refunded to requester

### Listening to Events

```javascript
// Listen for request completion
contract.on('RequestCompleted', (requestId, result) => {
  console.log(`Request ${requestId} completed with result: ${result}`);
  // Process result
});

// Listen for refunds
contract.on('RequestRefunded', (requestId, requester, amount) => {
  console.log(`Request ${requestId} refunded to ${requester}: ${amount} ETH`);
  // Handle refund
});

// Listen for timeouts
contract.on('RequestTimedOut', (requestId) => {
  console.log(`Request ${requestId} timed out`);
  // Check status and claim refund
});
```

### Polling for Status

```javascript
async function pollForResult(requestId, maxAttempts = 60, interval = 10000) {
  let attempts = 0;

  while (attempts < maxAttempts) {
    const request = await contract.getRequest(requestId);

    if (request.status === 1) { // COMPLETED
      console.log('Result received:', request.result);
      return request.result;
    }

    if (request.status === 2) { // REFUNDED
      console.log('Request timed out and was refunded');
      return null;
    }

    console.log(`Waiting for result... (attempt ${attempts + 1}/${maxAttempts})`);
    await new Promise(resolve => setTimeout(resolve, interval));
    attempts++;
  }

  throw new Error('Request timed out while polling');
}

const result = await pollForResult(requestId);
```

## Claiming Refunds

### When to Claim Refunds

Refunds are automatically available when:
- The gateway fails to respond before the timeout block
- The gateway returns an error
- The request is cancelled by the user

### Claiming a Refund

```javascript
// Check if refund is available
const request = await contract.getRequest(requestId);
const isExpired = (await provider.getBlockNumber()) > request.threshold;

if (isExpired && request.status === 0) {
  // Claim refund
  const tx = await contract.claimRefund(requestId);
  const receipt = await tx.wait();

  console.log(`Refund claimed for request ${requestId}`);
  console.log(`Gas used: ${receipt.gasUsed.toString()}`);
}
```

### Batch Refund Claims

```javascript
// Claim multiple refunds at once
async function claimMultipleRefunds(requestIds) {
  const txs = [];

  for (const requestId of requestIds) {
    const request = await contract.getRequest(requestId);
    const blockNumber = await provider.getBlockNumber();

    if (blockNumber > request.threshold && request.status === 0) {
      const tx = await contract.claimRefund(requestId);
      txs.push(tx);
    }
  }

  const receipts = await Promise.all(txs.map(tx => tx.wait()));
  console.log(`Claimed ${receipts.length} refunds`);
  return receipts;
}
```

## Computing Private Division

### Overview
The Zamad protocol supports computing division operations on encrypted data. This is useful for computing price impacts, slippage, and other ratios.

### Example: Computing Swap Output

```javascript
// User wants to swap 100 USDC for ETH
// Price: 1 ETH = 3000 USDC
// Slippage tolerance: 0.5%

const amountIn = ethers.parseUnits('100', 6);      // USDC has 6 decimals
const pricePerEth = ethers.parseUnits('3000', 6);
const slippageBps = 50;                             // 0.5% = 50 basis points

// Calculate expected output (amount_in / price_per_eth)
// This calculation is encrypted and performed by gateway
const encryptedAmountIn = await encryptAmount(amountIn);

const tx = await contract.submitPrivateDivision(
  encryptedAmountIn,
  pricePerEth,
  slippageBps,
  100, // threshold
  {
    value: ethers.parseEther('0.01'),
    gasLimit: 300000
  }
);

const receipt = await tx.wait();
const requestId = receipt.logs[0].args.requestId;
```

### Supported Operations

1. **Simple Division**: A / B
2. **Division with Scaling**: (A * Scale) / B
3. **Slippage Calculation**: (A * (100 - Slippage)) / 100
4. **Multi-step Operations**: (A * B) / C

### Example: Calculating Minimum Output with Slippage

```javascript
async function calculateMinimumOutput(
  amountIn,
  pricePerToken,
  slippageTolerance
) {
  // Encryptamount and price
  const encryptedAmountIn = await encryptAmount(amountIn);
  const encryptedPrice = await encryptAmount(pricePerToken);

  // Submit calculation
  const tx = await contract.submitPrivateDivision(
    encryptedAmountIn,
    encryptedPrice,
    slippageTolerance,
    100,
    {
      value: ethers.parseEther('0.01'),
      gasLimit: 300000
    }
  );

  const receipt = await tx.wait();
  const requestId = receipt.logs[0].args.requestId;

  // Poll for result
  const result = await pollForResult(requestId);

  return result;
}
```

## Example Scenarios

### Scenario 1: Private DEX Swap

```javascript
async function executePrivateSwap(tokenIn, tokenOut, amountIn, maxSlippage) {
  // 1. Get current prices from price oracle
  const prices = await getPrices([tokenIn, tokenOut]);
  const exchangeRate = prices[tokenOut] / prices[tokenIn];

  // 2. Calculate expected output with slippage (encrypted)
  const expectedOutput = amountIn * exchangeRate;
  const minOutput = expectedOutput * (1 - maxSlippage);

  // 3. Submit encrypted swap request
  const encryptedData = await encryptSwapData({
    tokenIn,
    tokenOut,
    amountIn,
    minOutput,
    deadline: Date.now() + 60000
  });

  const tx = await contract.submitRequest(
    encryptedData,
    await provider.getBlockNumber() + 100,
    {
      value: ethers.parseEther('0.01'),
      gasLimit: 300000
    }
  );

  const receipt = await tx.wait();
  const requestId = receipt.logs[0].args.requestId;

  // 4. Monitor for completion
  const result = await pollForResult(requestId);

  // 5. Handle result
  if (result.success) {
    console.log(`Swap executed: received ${result.outputAmount} ${tokenOut}`);
  } else {
    console.log('Swap failed, refund initiated');
  }

  return result;
}
```

### Scenario 2: Private Limit Order

```javascript
async function createPrivateLimitOrder(
  tokenIn,
  tokenOut,
  amountIn,
  limitPrice,
  expiryDays
) {
  // 1. Create encrypted limit order
  const encryptedOrder = await encryptOrderData({
    tokenIn,
    tokenOut,
    amountIn,
    limitPrice,
    expiryTime: Date.now() + (expiryDays * 24 * 60 * 60 * 1000)
  });

  // 2. Submit order
  const tx = await contract.submitLimitOrder(
    encryptedOrder,
    await provider.getBlockNumber() + (7 * 24 * 60 * 12), // ~7 days
    {
      value: ethers.parseEther('0.02'),
      gasLimit: 350000
    }
  );

  const receipt = await tx.wait();
  const orderId = receipt.logs[0].args.orderId;

  console.log(`Limit order created: ${orderId}`);
  return orderId;
}
```

## Troubleshooting

### Common Issues and Solutions

#### Issue: "Request timed out"

**Problem**: Gateway didn't respond before threshold block.

**Solution**:
```javascript
// Check if you can claim refund
const request = await contract.getRequest(requestId);
const blockNumber = await provider.getBlockNumber();

if (blockNumber > request.threshold) {
  const tx = await contract.claimRefund(requestId);
  console.log('Refund claimed');
}
```

#### Issue: "Insufficient funds for gas"

**Problem**: Not enough ETH to pay for transaction.

**Solution**:
```javascript
// Estimate gas first
const gasEstimate = await contract.submitRequest.estimateGas(
  encryptedData,
  threshold
);
const gasCost = gasEstimate * (await provider.getGasPrice());
console.log(`Required ETH: ${ethers.formatEther(gasCost)}`);
```

#### Issue: "Invalid encrypted data"

**Problem**: Encryption or encoding was incorrect.

**Solution**:
```javascript
// Verify encryption
const testData = 'test';
const encrypted = encryptData(testData, gatewayPublicKey);
const decrypted = decryptData(encrypted, privateKey);

if (testData !== decrypted) {
  console.error('Encryption/decryption mismatch');
}
```

#### Issue: "Gateway service unavailable"

**Problem**: Gateway endpoint is down or unreachable.

**Solution**:
```javascript
// Implement retry logic
async function submitWithRetry(request, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const tx = await contract.submitRequest(request);
      return tx;
    } catch (error) {
      console.log(`Attempt ${i + 1} failed: ${error.message}`);
      if (i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 2000 * (i + 1)));
      }
    }
  }
  throw new Error('All retry attempts failed');
}
```

#### Issue: "Nonce too low"

**Problem**: Multiple transactions from same address without confirmation.

**Solution**:
```javascript
// Get current nonce
const nonce = await signer.getTransactionCount();
const tx = await contract.submitRequest(
  encryptedData,
  threshold,
  {
    nonce: nonce,
    gasLimit: 200000
  }
);
```

#### Issue: "Result decryption failed"

**Problem**: Unable to decrypt the returned result.

**Solution**:
```javascript
// Verify you're using correct private key
async function decryptResult(encryptedResult) {
  try {
    // Ensure privateKey matches public key used for encryption
    const decrypted = await decryptData(
      encryptedResult,
      PRIVATE_KEY
    );
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    // Check that privateKey is correct
  }
}
```

### Error Codes

| Code | Message | Resolution |
|------|---------|-----------|
| 1001 | Invalid request format | Check request structure matches interface |
| 1002 | Insufficient fee | Increase fee amount in submission |
| 1003 | Invalid signature | Verify signer and message |
| 1004 | Threshold in past | Ensure threshold > current block |
| 1005 | Gateway unreachable | Verify gateway endpoint URL |
| 2001 | Decryption failed | Check private key matches public key |
| 2002 | Invalid computation | Verify data types and values |
| 2003 | Division by zero | Check denominator is non-zero |
| 3001 | Already refunded | Request was already refunded |
| 3002 | Not yet eligible | Timeout threshold not reached |

### Debug Mode

```javascript
// Enable debug logging
const DEBUG = true;

function debugLog(message, data) {
  if (DEBUG) {
    console.log(`[DEBUG] ${message}`, data || '');
  }
}

// Use in your code
debugLog('Submitting request', { encryptedData, threshold });
```

## Support

For additional help:
- Documentation: https://docs.zamadapp.com
- GitHub Issues: https://github.com/zamadapp/contracts/issues
- Discord: https://discord.gg/zamad
- Email: support@zamadapp.com
