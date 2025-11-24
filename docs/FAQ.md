# Zamad Protocol - Frequently Asked Questions

## General Questions

### What is FHE and why use it?

**FHE (Fully Homomorphic Encryption)** is a cryptographic technique that allows computations to be performed directly on encrypted data without requiring decryption first.

**Why use FHE for DeFi?**
- **Privacy**: Users' trading amounts, prices, and strategies remain encrypted
- **No trusted middleman**: Computations verified on-chain; gateway cannot manipulate results
- **Regulatory compliance**: Sensitive financial data protected while maintaining transparency
- **MEV resistance**: Front-runners cannot see transaction details
- **Slippage protection**: Price impact calculations hidden from public view

**Example scenario:**
Without FHE: User sends "I want to swap 1000 USDC for ETH" to the pool. MEV bots see this, buy ETH first, then execute your swap at higher price.

With FHE: User sends encrypted swap request. Gateway performs computation on encrypted data. Only result is revealed on-chain.

### How does the gateway pattern work?

The Zamad protocol uses a decentralized gateway pattern with the following flow:

```
1. User prepares transaction (e.g., "swap 1000 USDC for ETH")
2. User encrypts transaction using gateway's public key
3. User submits encrypted request to blockchain contract
4. Contract validates and stores the request
5. Gateway listens to blockchain events
6. Gateway decrypts request using its private key
7. Gateway executes computation (e.g., calculate output amount)
8. Gateway encrypts result using user's public key
9. Gateway submits result back to contract
10. User decrypts result
11. User can claim result or refund if gateway didn't respond
```

**Key features:**
- Encrypted data is public (on blockchain) but unreadable
- Gateway performs off-chain computation but result is verified on-chain
- Timeout mechanism ensures refunds if gateway disappears
- Multiple independent gateways can be used for redundancy

### What happens if the gateway goes offline?

If the gateway fails to respond before the timeout:

1. Request enters **REFUNDED** state
2. User can claim a refund of their submission fee
3. No computation penalty for the user

```javascript
// User claims refund after timeout
const blockNumber = await provider.getBlockNumber();
const request = await contract.getRequest(requestId);

if (blockNumber > request.threshold && request.status === 0) {
  const tx = await contract.claimRefund(requestId);
  console.log('Refund claimed');
}
```

**How to prevent this:**
- Use multiple independent gateways in parallel
- Choose gateways with high uptime SLAs (99.9%+)
- Monitor gateway health and failover automatically

## Technical Questions

### How long is the timeout period?

The timeout is specified in **blocks**. Here are typical values:

| Network | Block Time | 100 Blocks | 200 Blocks | 500 Blocks |
|---------|-----------|-----------|-----------|-----------|
| Ethereum | ~12 sec | ~20 min | ~40 min | ~100 min |
| Sepolia | ~12 sec | ~20 min | ~40 min | ~100 min |
| Arbitrum | ~0.25 sec | ~25 sec | ~50 sec | ~2 min |

**Default recommendations:**
- Small requests (< $10k): 100 blocks
- Medium requests ($10k-$100k): 200 blocks
- Large requests (> $100k): 500 blocks

### Can I customize the timeout?

Yes, you specify the threshold block when submitting:

```javascript
// Timeout after 200 blocks from now
const blockNumber = await provider.getBlockNumber();
const threshold = blockNumber + 200;

const tx = await contract.submitRequest(
  encryptedData,
  threshold,  // Custom timeout
  {
    value: ethers.parseEther('0.01'),
    gasLimit: 200000
  }
);
```

**Tradeoffs:**
- **Short timeout** (50-100 blocks): Risk of missing gateway response
- **Medium timeout** (200-300 blocks): Good balance
- **Long timeout** (500+ blocks): Higher certainty but slower feedback

### Gas cost estimates

| Operation | Sepolia | Ethereum | Arbitrum |
|-----------|---------|----------|----------|
| Submit Request | ~80,000 | ~180,000 | ~8,000 |
| Claim Refund | ~50,000 | ~110,000 | ~5,000 |
| Private Division | ~120,000 | ~250,000 | ~12,000 |
| Batch 5 Requests | ~350,000 | ~800,000 | ~35,000 |

**Gas price examples (in USD, at $1500 ETH):**
- Sepolia: $0.12-0.30
- Ethereum: $2.70-6.75
- Arbitrum: $0.06-0.18

**Tips to reduce costs:**
1. Batch multiple requests together
2. Use Arbitrum or other L2s
3. Submit during low-gas periods
4. Pre-approve tokens to save on encoding

### Privacy guarantees

The Zamad protocol provides:

**Semantic Security**: Even with access to ciphertext and public information, an attacker cannot determine:
- Trade amounts
- Token pairs being swapped
- Slippage tolerances
- Limit order prices

**Verification**: On-chain verification ensures:
- Gateway computed correct result
- Gateway didn't tamper with values
- Result matches encrypted input

**Limitations:**
- Gas patterns may reveal some information (avoid obvious amounts)
- Timing analysis could infer request size (use random delays)
- Large swaps will have on-chain impact regardless of encryption

**Best practices:**
```javascript
// Add random delay to hide timing
const randomDelay = Math.random() * 30000; // 0-30 seconds
await new Promise(r => setTimeout(r, randomDelay));

// Use obfuscated amounts
const realAmount = 1000;
const obfuscated = realAmount + Math.random() * 100;

// Wait several blocks before executing
const blockNumber = await provider.getBlockNumber();
const threshold = blockNumber + 200; // Wait ~40 minutes
```

## Use Cases

### What about price slippage?

Price slippage is the difference between expected and actual execution price. Zamad helps by:

1. **Hiding your order**: MEV bots can't see you're buying
2. **Computing slippage privately**: Amount received calculated encrypted
3. **Enforcing minimum output**: Gateway can't sell below your limit

```javascript
const amountIn = ethers.parseUnits('100', 6);    // 100 USDC
const expectedOutput = 0.05;                      // Expected 0.05 ETH
const maxSlippage = 0.005;                        // Max 0.5% slippage
const minOutput = expectedOutput * (1 - maxSlippage); // 0.04975 ETH min

// Submission with encrypted slippage protection
const tx = await contract.submitPrivateDivision(
  encryptedAmount,
  pricePerToken,
  maxSlippage,
  100, // threshold blocks
  { value: fee, gasLimit: 300000 }
);
```

### Is there a minimum request amount?

No hard minimum, but consider:

| Amount | Recommendation |
|--------|----------------|
| < $1 | Too small - gas costs exceed value |
| $1-$100 | Use only on L2s (Arbitrum, Polygon) |
| $100-$1000 | Fine on any network |
| > $1000 | Recommended amount |

**Cost calculation:**
```javascript
// Example on Ethereum
const amountUSD = 500;
const gasUnits = 120000;
const gasPriceGwei = 30;
const ETHPrice = 1500;

const gasCostUSD = (gasUnits * gasPriceGwei / 1e9) * ETHPrice;
console.log(`Gas cost: $${gasCostUSD}`); // ~$5.40

// Slippage at 0.5% max
const maxSlippageUSD = amountUSD * 0.005; // $2.50
console.log(`Max slippage: $${maxSlippageUSD}`);

// Total cost: ~$7.90 on $500 order = 1.58%
```

## Troubleshooting

### How to handle failed decryptions?

Failed decryptions indicate the result was tampered with or corrupted:

```javascript
async function decryptResultSafely(encryptedResult, privateKey) {
  try {
    const decrypted = await decryptData(encryptedResult, privateKey);

    // Verify result hash
    const resultHash = ethers.keccak256(encryptedResult);
    const storedHash = await contract.getResultHash(requestId);

    if (resultHash !== storedHash) {
      throw new Error('Result hash mismatch - possible tampering');
    }

    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);

    // Fallback: claim refund
    if (isTimeoutExpired(requestId)) {
      await contract.claimRefund(requestId);
      console.log('Refund claimed due to decryption failure');
    }

    throw error;
  }
}
```

**Common causes and solutions:**

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid padding" | Wrong private key | Verify key matches public key |
| "MAC verification failed" | Data corrupted | Claim refund and retry |
| "Unexpected end of data" | Incomplete result | Wait longer or refund |
| "Invalid key format" | Key encoding issue | Use proper encoding (hex/base64) |

### How to handle request failures?

```javascript
async function submitRequestWithFallback(requestData) {
  try {
    // Primary submission
    const tx = await contract.submitRequest(
      requestData.encrypted,
      requestData.threshold,
      { value: requestData.fee, gasLimit: 200000 }
    );

    const receipt = await tx.wait();
    return receipt.logs[0].args.requestId;

  } catch (error) {
    console.error('Request submission failed:', error);

    // Fallback strategies
    if (error.message.includes('insufficient funds')) {
      console.log('Not enough ETH for gas. Please add more funds.');
      throw error;
    }

    if (error.message.includes('nonce too low')) {
      // Retry with correct nonce
      const nonce = await signer.getTransactionCount();
      const tx = await contract.submitRequest(
        requestData.encrypted,
        requestData.threshold,
        {
          value: requestData.fee,
          gasLimit: 200000,
          nonce: nonce
        }
      );
      return (await tx.wait()).logs[0].args.requestId;
    }

    throw error;
  }
}
```

## Advanced Topics

### How do I batch multiple requests?

```javascript
async function batchSubmitRequests(requests, options = {}) {
  const maxConcurrent = options.maxConcurrent || 5;
  const results = [];

  // Process in batches
  for (let i = 0; i < requests.length; i += maxConcurrent) {
    const batch = requests.slice(i, i + maxConcurrent);
    const batchResults = await Promise.allSettled(
      batch.map(req => submitSingleRequest(req))
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        console.error('Request failed:', result.reason);
        results.push(null);
      }
    }

    // Rate limiting between batches
    if (i + maxConcurrent < requests.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  return results;
}
```

### How can I monitor request status at scale?

```javascript
class RequestMonitor {
  constructor(contract, batchSize = 100) {
    this.contract = contract;
    this.batchSize = batchSize;
    this.activeRequests = new Map();
  }

  async monitorRequests(requestIds) {
    // Batch queries for efficiency
    const batches = [];
    for (let i = 0; i < requestIds.length; i += this.batchSize) {
      batches.push(requestIds.slice(i, i + this.batchSize));
    }

    const statuses = [];
    for (const batch of batches) {
      const batchStatuses = await Promise.all(
        batch.map(id => this.contract.getRequest(id))
      );
      statuses.push(...batchStatuses);
    }

    return statuses;
  }

  async waitForResults(requestIds, options = {}) {
    const timeout = options.timeout || 300000; // 5 minutes
    const pollInterval = options.pollInterval || 5000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const statuses = await this.monitorRequests(requestIds);
      const completed = statuses.filter(s => s.status !== 0);

      if (completed.length === statuses.length) {
        return statuses;
      }

      await new Promise(r => setTimeout(r, pollInterval));
    }

    throw new Error(`Timeout waiting for ${requestIds.length} requests`);
  }
}
```

## Support Resources

- **Documentation**: https://docs.zamadapp.com
- **GitHub**: https://github.com/zamadapp/contracts
- **Discord**: https://discord.gg/zamad
- **Twitter**: https://twitter.com/zamadapp
- **Email**: support@zamadapp.com

For security issues, please email security@zamadapp.com
