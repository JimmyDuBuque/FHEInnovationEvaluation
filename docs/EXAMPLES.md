# Zamad Protocol - Working Examples

## Example 1: Simple Request and Refund

This example shows the basic flow of submitting a request and claiming a refund if needed.

```javascript
const ethers = require('ethers');

// Setup
const provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/YOUR_API_KEY');
const signer = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

async function simpleRequestFlow() {
  console.log('Starting simple request flow...\n');

  // 1. Prepare encrypted data
  const requestData = {
    operation: 'swap',
    amount: ethers.parseUnits('100', 6),
    slippage: 0.005
  };

  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ['uint256', 'uint256'],
    [requestData.amount, ethers.parseUnits('5', 3)] // 0.5% slippage
  );

  const encryptedData = ethers.hexlify(encoded); // In production, use proper encryption

  // 2. Submit request
  const blockNumber = await provider.getBlockNumber();
  const threshold = blockNumber + 100; // ~20 minutes timeout

  const fee = ethers.parseEther('0.01'); // 0.01 ETH fee

  console.log('Submitting request...');
  const tx = await contract.submitRequest(encryptedData, threshold, {
    value: fee,
    gasLimit: 200000
  });

  const receipt = await tx.wait();
  const requestId = receipt.logs[0].args.requestId;

  console.log(`Request submitted: ${requestId}`);
  console.log(`Threshold block: ${threshold}`);
  console.log(`Fee: ${ethers.formatEther(fee)} ETH\n`);

  // 3. Check status
  const request = await contract.getRequest(requestId);
  console.log('Request Status:', {
    status: request.status, // 0 = pending
    requester: request.requester,
    createdAt: new Date(request.createdAt * 1000).toISOString()
  });

  // 4. Wait for result or timeout
  console.log('\nWaiting for result...');
  const currentBlock = await provider.getBlockNumber();

  if (currentBlock < threshold) {
    // Wait or request timeout
    console.log(`Blocks until timeout: ${threshold - currentBlock}`);

    // Poll for result with timeout
    let resultFound = false;
    const maxAttempts = 60;
    let attempts = 0;

    while (attempts < maxAttempts && !resultFound) {
      const updatedRequest = await contract.getRequest(requestId);

      if (updatedRequest.status === 1) { // Completed
        console.log('Result received!');
        console.log('Result:', updatedRequest.result);
        resultFound = true;
      } else if (updatedRequest.status === 2) { // Refunded
        console.log('Request was refunded');
        resultFound = true;
      }

      if (!resultFound) {
        console.log(`Waiting... (attempt ${attempts + 1}/${maxAttempts})`);
        await new Promise(r => setTimeout(r, 10000)); // 10 sec
        attempts++;
      }
    }

    if (!resultFound) {
      console.log('Request still pending after timeout, checking refund eligibility...');
    }
  }

  // 5. Claim refund if timeout passed
  const finalBlock = await provider.getBlockNumber();
  const finalRequest = await contract.getRequest(requestId);

  if (finalBlock > threshold && finalRequest.status === 0) {
    console.log('\nClaiming refund...');
    const refundTx = await contract.claimRefund(requestId);
    const refundReceipt = await refundTx.wait();

    console.log('Refund claimed!');
    console.log('Gas used:', refundReceipt.gasUsed.toString());
  }
}

// Run
simpleRequestFlow().catch(console.error);
```

## Example 2: Division Operation Example

This example demonstrates computing a division operation (useful for price calculations).

```javascript
const ethers = require('ethers');

async function privateDivisionExample() {
  console.log('Private Division Operation Example\n');

  // Setup
  const provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/YOUR_API_KEY');
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

  // Scenario: Calculate swap output with hidden calculation
  // User wants to swap 1000 USDC for ETH
  // Current price: 1 ETH = 3000 USDC
  // Slippage tolerance: 0.5%

  const amountIn = ethers.parseUnits('1000', 6); // 1000 USDC (6 decimals)
  const pricePerToken = ethers.parseUnits('3000', 6); // 1 ETH = 3000 USDC
  const slippageBps = 50; // 0.5% = 50 basis points

  console.log('Input Parameters:');
  console.log(`  Amount In: ${ethers.formatUnits(amountIn, 6)} USDC`);
  console.log(`  Price: ${ethers.formatUnits(pricePerToken, 6)} USDC/ETH`);
  console.log(`  Slippage: ${slippageBps / 100}%\n`);

  // Expected calculation (off-chain for reference):
  // expectedOutput = amountIn / pricePerToken = 1000 / 3000 = 0.333 ETH
  // minOutput = expectedOutput * (1 - slippage) = 0.333 * 0.995 = 0.331 ETH

  const expectedOutput = Number(amountIn) / Number(pricePerToken);
  const minOutput = expectedOutput * (1 - slippageBps / 10000);

  console.log('Expected Results:');
  console.log(`  Expected Output: ${(expectedOutput / 1e18).toFixed(6)} ETH`);
  console.log(`  Min Output (with slippage): ${(minOutput / 1e18).toFixed(6)} ETH\n`);

  // Encrypt the calculation inputs
  // In production, use proper encryption library
  const encryptedAmountIn = ethers.hexlify(
    ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [amountIn])
  );

  // Submit division request
  console.log('Submitting private division request...');
  const blockNumber = await provider.getBlockNumber();
  const threshold = blockNumber + 100;

  const tx = await contract.submitPrivateDivision(
    encryptedAmountIn,
    pricePerToken,
    slippageBps,
    threshold,
    {
      value: ethers.parseEther('0.02'),
      gasLimit: 300000
    }
  );

  const receipt = await tx.wait();
  const requestId = receipt.logs[0].args.requestId;

  console.log(`Division request submitted: ${requestId}`);
  console.log(`Threshold: Block ${threshold}\n`);

  // Monitor result
  let resultReceived = false;
  let attempts = 0;
  const maxAttempts = 60;

  while (attempts < maxAttempts && !resultReceived) {
    const request = await contract.getRequest(requestId);

    if (request.status === 1) { // Completed
      console.log('Result received!\n');

      // Decrypt result (in production, use proper decryption)
      const resultValue = BigInt(request.result);
      const resultETH = Number(resultValue) / 1e18;

      console.log('Decrypted Result:');
      console.log(`  Output Amount: ${resultETH.toFixed(6)} ETH`);
      console.log(`  Meets minimum: ${resultETH >= (minOutput / 1e18) ? 'YES' : 'NO'}`);

      resultReceived = true;
    }

    if (!resultReceived) {
      console.log(`Waiting for result... (attempt ${attempts + 1}/${maxAttempts})`);
      await new Promise(r => setTimeout(r, 5000));
      attempts++;
    }
  }

  if (!resultReceived) {
    console.log('Result not received within timeout period');
  }
}

// Run
privateDivisionExample().catch(console.error);
```

## Example 3: Price Obfuscation Example

This example shows how to hide trade details while getting reliable execution.

```javascript
const ethers = require('ethers');

async function priceObfuscationExample() {
  console.log('Price Obfuscation Example\n');

  const provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/YOUR_API_KEY');
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

  // Scenario: User wants to buy ETH at a specific price without revealing amount
  // Public sees: Encrypted request submitted
  // MEV bots see: Nothing (data encrypted)
  // User privacy: Protected

  const realAmount = ethers.parseUnits('50', 6); // Real amount: 50 USDC
  const targetPrice = ethers.parseUnits('1500', 6); // Want to buy at 1500 USDC/ETH
  const maxSlippage = 0.005; // 0.5%

  console.log('Real Trade Parameters (kept private):');
  console.log(`  Amount: ${ethers.formatUnits(realAmount, 6)} USDC`);
  console.log(`  Target Price: ${ethers.formatUnits(targetPrice, 6)} USDC/ETH`);
  console.log(`  Max Slippage: ${maxSlippage * 100}%\n`);

  // Obfuscation strategy: Add randomness to hide real amounts
  const randomFactor = 1 + (Math.random() - 0.5) * 0.2; // +/- 10%
  const obfuscatedAmount = realAmount * BigInt(Math.floor(randomFactor * 1000)) / 1000n;

  console.log('Obfuscation Applied:');
  console.log(`  Random Factor: ${randomFactor.toFixed(3)}`);
  console.log(`  Obfuscated Amount: ${ethers.formatUnits(obfuscatedAmount, 6)} USDC`);
  console.log(`  Hidden from public: YES\n`);

  // Additional obfuscation: Random delay
  const delayMs = Math.floor(Math.random() * 30000); // 0-30 seconds
  console.log(`Adding random delay of ${delayMs}ms to hide timing patterns...`);
  await new Promise(r => setTimeout(r, delayMs));

  // Encrypt with gateway's public key
  const encrypted = await encryptForGateway({
    amount: obfuscatedAmount,
    targetPrice: targetPrice,
    maxSlippage: maxSlippage,
    realAmount: realAmount // Gateway only sees this
  });

  // Submit with timeout
  const blockNumber = await provider.getBlockNumber();
  const threshold = blockNumber + 200; // 40 minute timeout for better execution

  console.log('\nSubmitting encrypted request...');
  const tx = await contract.submitRequest(encrypted, threshold, {
    value: ethers.parseEther('0.01'),
    gasLimit: 200000
  });

  const receipt = await tx.wait();
  const requestId = receipt.logs[0].args.requestId;

  console.log(`Request ID: ${requestId}`);
  console.log('On-chain visibility: ENCRYPTED (MEV bots see nothing)');
  console.log('Gateway can see: Only the encrypted blob\n');

  // Poll for result
  console.log('Monitoring for result...\n');
  const finalResult = await pollForResult(contract, requestId);

  if (finalResult) {
    console.log('Result received!');
    console.log(`Output: ${ethers.formatUnits(finalResult, 18)} ETH`);
    console.log('Privacy maintained throughout execution');
  }
}

async function encryptForGateway(data) {
  // Placeholder for real encryption
  // In production: Use proper encryption library
  return ethers.hexlify(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ['uint256', 'uint256', 'uint256'],
      [data.amount, data.targetPrice, Math.floor(data.maxSlippage * 10000)]
    )
  );
}

async function pollForResult(contract, requestId) {
  for (let i = 0; i < 60; i++) {
    const request = await contract.getRequest(requestId);

    if (request.status === 1) {
      return request.result;
    }

    if (i % 5 === 0) {
      console.log(`Still waiting... (${i} checks completed)`);
    }

    await new Promise(r => setTimeout(r, 5000));
  }

  return null;
}

// Run
priceObfuscationExample().catch(console.error);
```

## Example 4: Batch Operations Example

This example demonstrates submitting and monitoring multiple requests efficiently.

```javascript
const ethers = require('ethers');

async function batchOperationsExample() {
  console.log('Batch Operations Example\n');

  const provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/YOUR_API_KEY');
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

  // Scenario: Submit 10 swap requests in batch

  const swaps = [
    { amount: ethers.parseUnits('100', 6), slippage: 0.005 },
    { amount: ethers.parseUnits('50', 6), slippage: 0.005 },
    { amount: ethers.parseUnits('200', 6), slippage: 0.01 },
    { amount: ethers.parseUnits('75', 6), slippage: 0.005 },
    { amount: ethers.parseUnits('150', 6), slippage: 0.01 },
    { amount: ethers.parseUnits('80', 6), slippage: 0.005 },
    { amount: ethers.parseUnits('120', 6), slippage: 0.005 },
    { amount: ethers.parseUnits('90', 6), slippage: 0.01 },
    { amount: ethers.parseUnits('110', 6), slippage: 0.005 },
    { amount: ethers.parseUnits('140', 6), slippage: 0.005 }
  ];

  console.log(`Preparing to submit ${swaps.length} swap requests...\n`);

  // 1. Prepare all requests
  const blockNumber = await provider.getBlockNumber();
  const requests = swaps.map((swap, index) => {
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ['uint256', 'uint256'],
      [swap.amount, Math.floor(swap.slippage * 10000)]
    );

    return {
      index,
      amount: ethers.formatUnits(swap.amount, 6),
      slippage: swap.slippage * 100,
      encryptedData: ethers.hexlify(encoded),
      threshold: blockNumber + 150,
      fee: ethers.parseEther('0.01')
    };
  });

  // 2. Submit batch (with rate limiting)
  console.log('Submitting requests...');
  const maxConcurrent = 3;
  const requestIds = [];

  for (let i = 0; i < requests.length; i += maxConcurrent) {
    const batch = requests.slice(i, i + maxConcurrent);

    const batchTxs = await Promise.all(
      batch.map(req =>
        contract.submitRequest(req.encryptedData, req.threshold, {
          value: req.fee,
          gasLimit: 200000
        })
      )
    );

    const batchReceipts = await Promise.all(
      batchTxs.map(tx => tx.wait())
    );

    const batchIds = batchReceipts.map(receipt => receipt.logs[0].args.requestId);
    requestIds.push(...batchIds);

    console.log(`  Submitted ${requestIds.length}/${swaps.length} requests`);

    // Rate limit between batches
    if (i + maxConcurrent < requests.length) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log(`All requests submitted!\n`);
  console.log(`Request IDs: ${requestIds.slice(0, 3).join(', ')}...`);
  console.log(`(and ${requestIds.length - 3} more)\n`);

  // 3. Monitor all requests efficiently
  console.log('Monitoring results...\n');

  const results = [];
  let completed = 0;

  // Batch polling for efficiency
  const batchSize = 5;
  let attempts = 0;
  const maxAttempts = 120; // 10 minutes at 5-second intervals

  while (completed < requestIds.length && attempts < maxAttempts) {
    // Poll in batches
    for (let i = 0; i < requestIds.length; i += batchSize) {
      const batch = requestIds.slice(i, i + batchSize);

      const statuses = await Promise.all(
        batch.map(id => contract.getRequest(id))
      );

      for (let j = 0; j < batch.length; j++) {
        const requestId = batch[j];
        const status = statuses[j];

        if (status.status === 1 && !results.find(r => r.id === requestId)) {
          results.push({
            id: requestId,
            status: 'completed',
            result: status.result
          });
          completed++;
        } else if (status.status === 2 && !results.find(r => r.id === requestId)) {
          results.push({
            id: requestId,
            status: 'refunded'
          });
          completed++;
        }
      }
    }

    if (completed < requestIds.length) {
      const percentage = ((completed / requestIds.length) * 100).toFixed(1);
      console.log(`Progress: ${completed}/${requestIds.length} (${percentage}%)`);
      await new Promise(r => setTimeout(r, 5000));
      attempts++;
    }
  }

  // 4. Report results
  console.log('\n' + '='.repeat(60));
  console.log('BATCH RESULTS');
  console.log('='.repeat(60));

  const completed_count = results.filter(r => r.status === 'completed').length;
  const refunded_count = results.filter(r => r.status === 'refunded').length;

  console.log(`Completed: ${completed_count}/${requestIds.length}`);
  console.log(`Refunded: ${refunded_count}/${requestIds.length}`);
  console.log(`Success Rate: ${((completed_count / requestIds.length) * 100).toFixed(1)}%`);

  // Sample of results
  console.log('\nSample Results:');
  results.slice(0, 3).forEach((result, index) => {
    console.log(`  ${index + 1}. ${result.status.toUpperCase()}`);
  });

  if (results.length > 3) {
    console.log(`  ... and ${results.length - 3} more`);
  }
}

// Run
batchOperationsExample().catch(console.error);
```

## Example 5: Error Handling Example

This example demonstrates comprehensive error handling.

```javascript
const ethers = require('ethers');

async function errorHandlingExample() {
  console.log('Error Handling Example\n');

  const provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/YOUR_API_KEY');
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

  // Scenario: Handle various error conditions

  async function safeSubmitRequest(data, options = {}) {
    const maxRetries = options.maxRetries || 3;
    const retryDelay = options.retryDelay || 5000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`\nAttempt ${attempt}/${maxRetries}...`);

        // Validate inputs
        if (!data.encryptedData || !data.amount) {
          throw new Error('Invalid request data');
        }

        // Check balance
        const balance = await provider.getBalance(signer.address);
        const requiredFee = data.fee || ethers.parseEther('0.01');

        if (balance < requiredFee) {
          throw new Error(`Insufficient balance. Have: ${ethers.formatEther(balance)} ETH, Need: ${ethers.formatEther(requiredFee)} ETH`);
        }

        // Estimate gas
        const gasEstimate = await contract.submitRequest.estimateGas(
          data.encryptedData,
          data.threshold
        );

        console.log(`Estimated gas: ${gasEstimate.toString()}`);

        // Submit with timeout
        const tx = await contract.submitRequest(
          data.encryptedData,
          data.threshold,
          {
            value: requiredFee,
            gasLimit: gasEstimate * 120n / 100n, // 20% buffer
            timeout: 60000 // 60 second timeout
          }
        );

        console.log(`Transaction submitted: ${tx.hash}`);

        // Wait for confirmation
        const receipt = await tx.wait();

        if (!receipt) {
          throw new Error('Transaction failed to confirm');
        }

        const requestId = receipt.logs[0]?.args?.requestId;

        if (!requestId) {
          throw new Error('Could not extract request ID from receipt');
        }

        console.log(`Success! Request ID: ${requestId}`);
        return { success: true, requestId };

      } catch (error) {
        console.error(`Error on attempt ${attempt}: ${error.message}`);

        if (attempt === maxRetries) {
          console.error(`All ${maxRetries} attempts failed`);
          return { success: false, error: error.message };
        }

        // Determine if we should retry
        if (error.message.includes('Insufficient balance')) {
          console.error('Cannot retry - insufficient funds');
          return { success: false, error: error.message };
        }

        if (error.message.includes('Invalid request data')) {
          console.error('Cannot retry - invalid data');
          return { success: false, error: error.message };
        }

        // Wait before retry (exponential backoff)
        const delay = retryDelay * Math.pow(2, attempt - 1);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  // Test error scenarios
  console.log('=== Testing Error Handling ===\n');

  // 1. Valid request
  console.log('Test 1: Valid request');
  const validRequest = {
    encryptedData: ethers.hexlify(ethers.randomBytes(32)),
    amount: ethers.parseUnits('100', 6),
    threshold: (await provider.getBlockNumber()) + 100,
    fee: ethers.parseEther('0.01')
  };

  const result1 = await safeSubmitRequest(validRequest);
  console.log(`Result: ${result1.success ? 'SUCCESS' : 'FAILED'}`);

  // 2. Insufficient funds (will fail)
  console.log('\n\nTest 2: Request with insufficient funds simulation');
  const poorSigner = new ethers.Wallet(ethers.randomBytes(32), provider);
  const poorContract = new ethers.Contract(CONTRACT_ADDRESS, ABI, poorSigner);

  try {
    await poorContract.submitRequest(
      ethers.hexlify(ethers.randomBytes(32)),
      (await provider.getBlockNumber()) + 100,
      { value: ethers.parseEther('0.01') }
    );
  } catch (error) {
    console.log(`Expected error: ${error.message.substring(0, 50)}...`);
  }

  // 3. Invalid data
  console.log('\n\nTest 3: Invalid request data');
  const invalidRequest = {
    encryptedData: null,
    threshold: (await provider.getBlockNumber()) + 100
  };

  const result3 = await safeSubmitRequest(invalidRequest);
  console.log(`Result: ${result3.success ? 'SUCCESS' : 'FAILED - ' + result3.error}`);

  console.log('\n' + '='.repeat(60));
  console.log('Error handling examples completed');
  console.log('='.repeat(60));
}

// Run
errorHandlingExample().catch(console.error);
```

## Example 6: Event Monitoring Example

This example shows how to monitor contract events in real-time.

```javascript
const ethers = require('ethers');

async function eventMonitoringExample() {
  console.log('Event Monitoring Example\n');

  const provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/YOUR_API_KEY');
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

  console.log('Setting up event listeners...\n');

  // 1. Listen for request submissions
  contract.on('RequestSubmitted', (requestId, requester, amount, threshold) => {
    console.log(`[REQUEST SUBMITTED]`);
    console.log(`  ID: ${requestId}`);
    console.log(`  Requester: ${requester}`);
    console.log(`  Threshold: ${threshold}`);
    console.log(`  Timestamp: ${new Date().toISOString()}\n`);
  });

  // 2. Listen for completed requests
  contract.on('RequestCompleted', (requestId, result) => {
    console.log(`[REQUEST COMPLETED]`);
    console.log(`  ID: ${requestId}`);
    console.log(`  Result: ${result}`);
    console.log(`  Timestamp: ${new Date().toISOString()}\n`);
  });

  // 3. Listen for refunded requests
  contract.on('RequestRefunded', (requestId, requester, amount) => {
    console.log(`[REQUEST REFUNDED]`);
    console.log(`  ID: ${requestId}`);
    console.log(`  Requester: ${requester}`);
    console.log(`  Amount: ${ethers.formatEther(amount)} ETH`);
    console.log(`  Timestamp: ${new Date().toISOString()}\n`);
  });

  // 4. Listen for timed out requests
  contract.on('RequestTimedOut', (requestId) => {
    console.log(`[REQUEST TIMED OUT]`);
    console.log(`  ID: ${requestId}`);
    console.log(`  Timestamp: ${new Date().toISOString()}\n`);
  });

  console.log('Listeners active. Submitting test request...\n');

  // Submit a test request
  const blockNumber = await provider.getBlockNumber();
  const tx = await contract.submitRequest(
    ethers.hexlify(ethers.randomBytes(32)),
    blockNumber + 100,
    {
      value: ethers.parseEther('0.01'),
      gasLimit: 200000
    }
  );

  const receipt = await tx.wait();
  const requestId = receipt.logs[0].args.requestId;

  console.log(`Test request submitted: ${requestId}`);
  console.log('Waiting for events...\n');

  // Listen for 5 minutes
  await new Promise(r => setTimeout(r, 300000));

  console.log('Closing listeners...');
  contract.removeAllListeners();
}

// Run
eventMonitoringExample().catch(console.error);
```

These examples provide a complete foundation for using the Zamad protocol. Adapt them to your specific use case and requirements.
