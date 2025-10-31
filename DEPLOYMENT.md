# Deployment Guide

This guide provides comprehensive instructions for deploying and managing the Privacy Evaluation Platform smart contracts.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Local Development](#local-development)
- [Testnet Deployment](#testnet-deployment)
- [Contract Verification](#contract-verification)
- [Contract Interaction](#contract-interaction)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher (comes with Node.js)
- **Git**: Latest version

### Required Accounts

1. **Ethereum Wallet**
   - MetaMask or any Ethereum-compatible wallet
   - Export your private key (keep it secure!)

2. **Test ETH** (for Sepolia testnet)
   - Get free Sepolia ETH from faucets:
     - https://sepoliafaucet.com/
     - https://faucet.quicknode.com/ethereum/sepolia
     - https://www.infura.io/faucet/sepolia

3. **Etherscan API Key** (for contract verification)
   - Register at https://etherscan.io/
   - Navigate to API Keys section
   - Create a new API key

## Environment Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd privacy-evaluation-platform

# Install dependencies
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Deployment Account Private Key
# WARNING: Never commit this file or share your private key
PRIVATE_KEY=your_private_key_here

# Sepolia RPC URL
SEPOLIA_RPC_URL=https://eth-sepolia.public.blastapi.io

# Etherscan API Key (for contract verification)
ETHERSCAN_API_KEY=your_etherscan_api_key

# Optional: Gas Reporting
REPORT_GAS=false
COINMARKETCAP_API_KEY=
```

### 3. Security Best Practices

- **Never commit `.env` file** - It's already in `.gitignore`
- **Use a dedicated deployment wallet** - Don't use your main wallet
- **Keep minimal funds** - Only what you need for deployment
- **Backup your private key** - Store securely offline

## Local Development

### Start Local Hardhat Network

```bash
# Terminal 1: Start local blockchain
npm run node
```

The local network will:
- Run on `http://127.0.0.1:8545`
- Provide 20 test accounts with 10,000 ETH each
- Reset state when restarted

### Deploy Locally

```bash
# Terminal 2: Deploy to local network
npm run deploy:local
```

### Run Simulation

Test the entire workflow without deploying:

```bash
npm run simulate
```

This will:
- Deploy contract locally
- Submit test projects
- Create evaluations
- Show gas usage statistics
- Estimate costs at various gas prices

## Testnet Deployment

### Pre-Deployment Checklist

- [ ] `.env` file configured with private key
- [ ] Wallet has sufficient Sepolia ETH (0.1 ETH recommended)
- [ ] RPC URL is working
- [ ] Hardhat config is correct

### Step 1: Compile Contracts

```bash
npm run compile
```

Expected output:
```
Compiled 1 Solidity file successfully
```

### Step 2: Deploy to Sepolia

```bash
npm run deploy
```

The deployment script will:
1. Check deployer account and balance
2. Deploy the contract
3. Wait for confirmation
4. Display contract address
5. Test basic functionality
6. Save deployment information to `deployments/` folder
7. Show Etherscan URLs

Example output:
```
========================================
Privacy Evaluation Platform Deployment
========================================

Network Information:
-------------------
Network Name: sepolia
Chain ID: 11155111

Deployer Information:
--------------------
Address: 0x1234...
Balance: 0.5 ETH

Deploying Contract...
Transaction Hash: 0xabcd...
Contract Address: 0x5678...

Verification:
-------------
Etherscan URL: https://sepolia.etherscan.io/address/0x5678...

To verify on Etherscan, run:
npm run verify -- 0x5678...
```

### Step 3: Save Deployment Information

Deployment info is automatically saved to:
- `deployments/sepolia-latest.json` - Latest deployment
- `deployments/sepolia-<timestamp>.json` - Historical record

Example deployment file:
```json
{
  "network": "sepolia",
  "chainId": 11155111,
  "contractAddress": "0x5a9CC7eb07129Af3ED1dC5D4F3B061853AAf8566",
  "deployerAddress": "0x313D7611251A2Ec1c7051BE9e452FA51c5Cc8707",
  "deploymentTransaction": "0x...",
  "blockNumber": 12345678,
  "gasUsed": "2500000",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "contractName": "AnonymousInnovationEvaluation"
}
```

## Contract Verification

Verify your contract on Etherscan to make the source code public and enable web interface interaction.

### Automatic Verification

If you deployed using the deploy script:

```bash
npm run verify
```

This automatically reads the contract address from the latest deployment file.

### Manual Verification

If you need to specify the contract address:

```bash
npm run verify -- 0xYourContractAddress
```

### Verification Process

1. Script reads contract source code
2. Compiles with same settings
3. Uploads to Etherscan
4. Etherscan verifies bytecode match
5. Source code becomes public

Expected output:
```
========================================
Contract Verification
========================================

Network: sepolia
Contract Address: 0x5678...

Starting Etherscan verification...

========================================
Verification Successful!
========================================

Contract verified on Etherscan:
https://sepolia.etherscan.io/address/0x5678...#code
```

### Common Verification Issues

**"Already Verified"**
- Contract is already verified, no action needed

**"Invalid API Key"**
- Check `ETHERSCAN_API_KEY` in `.env`
- Verify the key is active on Etherscan

**"Unable to locate Contract"**
- Wait a few blocks after deployment
- Verify contract address is correct

**"Compilation Error"**
- Ensure no changes to contract since deployment
- Check compiler version matches

## Contract Interaction

### Interactive CLI

Launch the interactive interface:

```bash
npm run interact
```

Or specify contract address:

```bash
npm run interact -- 0xYourContractAddress
```

### Available Actions

The interactive CLI provides:

1. **View Contract Information**
   - Owner address
   - Current evaluation period
   - Next project ID

2. **View Current Evaluation Period**
   - Period details
   - Start/end times
   - Active status

3. **Submit New Project**
   - Enter title and description
   - Receives project ID

4. **View Project Details**
   - Full project information
   - Evaluation count
   - Results if revealed

5. **Submit Evaluation**
   - Rate on 4 dimensions (0-10)
   - Encrypted on-chain

6. **Authorize Evaluator** (Owner only)
   - Grant evaluation permissions

7. **Revoke Evaluator** (Owner only)
   - Remove evaluation permissions

8. **Start Evaluation Period** (Owner only)
   - Set duration in days

9. **End Evaluation Period** (Owner only)
   - Close current period

10. **Reveal Project Results** (Owner only)
    - Trigger decryption process

11. **View All Projects in Period**
    - List all submissions

12. **Check Evaluation Status**
    - See if address has evaluated

### Example Interaction Session

```bash
$ npm run interact

========================================
Contract Interaction Script
========================================

Network: sepolia
Contract Address: 0x5678...
Signer Address: 0x1234...

========================================
Available Actions:
========================================
1.  View Contract Information
2.  View Current Evaluation Period
3.  Submit New Project
...

Select an action (0-12): 3

--- Submit New Project ---
Enter project title: Decentralized Storage Solution
Enter project description: A novel approach to distributed file storage

Submitting project...
Transaction Hash: 0xabcd...
Project submitted successfully!
Project ID: 1
```

## Deployment Costs

### Gas Estimates (at 30 gwei)

| Operation | Gas Used | Cost (ETH) |
|-----------|----------|------------|
| Contract Deployment | ~2,500,000 | ~0.075 |
| Submit Project | ~150,000 | ~0.0045 |
| Submit Evaluation | ~200,000 | ~0.006 |
| Reveal Results | ~100,000 | ~0.003 |

### Cost Optimization Tips

1. **Deploy during low network activity**
   - Check gas prices: https://etherscan.io/gastracker
   - Weekends typically cheaper

2. **Use gas reporter**
   ```bash
   REPORT_GAS=true npm test
   ```

3. **Optimize contract if needed**
   - Adjust optimizer runs in `hardhat.config.js`
   - Current setting: 800 runs (balanced)

## Network Configuration

### Sepolia Testnet

```javascript
{
  url: "https://eth-sepolia.public.blastapi.io",
  chainId: 11155111,
  accounts: [PRIVATE_KEY],
  timeout: 120000
}
```

### Alternative RPC Providers

If the default RPC has issues, try:

- Infura: `https://sepolia.infura.io/v3/YOUR-PROJECT-ID`
- Alchemy: `https://eth-sepolia.g.alchemy.com/v2/YOUR-API-KEY`
- Ankr: `https://rpc.ankr.com/eth_sepolia`

Update `SEPOLIA_RPC_URL` in `.env` with your preferred provider.

## Troubleshooting

### "Insufficient Funds"

**Problem**: Deployer account has no ETH

**Solution**:
1. Get Sepolia ETH from faucet
2. Verify correct network in MetaMask
3. Check balance: `npm run balance -- --account YOUR_ADDRESS`

### "Nonce Too Low"

**Problem**: Transaction nonce out of sync

**Solution**:
```bash
# Reset Hardhat cache
npm run clean
rm -rf cache/
```

### "Timeout Exceeded"

**Problem**: Network congestion or RPC issues

**Solution**:
1. Increase timeout in `hardhat.config.js`:
   ```javascript
   timeout: 180000  // 3 minutes
   ```
2. Try alternative RPC provider
3. Wait and retry

### "Contract Already Verified"

**Problem**: Attempting to verify again

**Solution**: No action needed - verification successful on first attempt

### "Invalid Private Key"

**Problem**: Private key format incorrect

**Solution**:
1. Private key should start with `0x`
2. Should be 64 hex characters (+ 0x prefix)
3. Export from MetaMask: Settings > Security & Privacy > Show Private Key

### Deployment Fails Without Error

**Problem**: Silent failure

**Solution**:
1. Check network connection
2. Verify RPC URL is accessible
3. Enable verbose logging:
   ```bash
   npx hardhat run scripts/deploy.js --network sepolia --verbose
   ```

## Hardhat Commands Reference

### Compilation
```bash
npm run compile        # Compile all contracts
npm run clean          # Remove artifacts
npx hardhat compile    # Direct Hardhat command
```

### Testing
```bash
npm test               # Run all tests
npm run coverage       # Generate coverage report
npx hardhat test       # Run with Hardhat
```

### Deployment
```bash
npm run deploy         # Deploy to Sepolia
npm run deploy:local   # Deploy to localhost
npm run simulate       # Simulate workflow
```

### Verification
```bash
npm run verify                    # Auto-detect address
npm run verify -- 0xAddress       # Specify address
```

### Interaction
```bash
npm run interact                  # Auto-detect address
npm run interact -- 0xAddress     # Specify address
```

### Network
```bash
npm run node           # Start local network
npm run accounts       # List accounts
npm run balance -- --account 0xAddress
```

### Custom Tasks
```bash
npx hardhat accounts                      # List accounts
npx hardhat balance --account 0xAddress   # Check balance
npx hardhat help                          # Show all commands
```

## Post-Deployment Checklist

After successful deployment:

- [ ] Contract address saved
- [ ] Deployment info in `deployments/` folder
- [ ] Contract verified on Etherscan
- [ ] Test basic functions via CLI
- [ ] Update frontend with new address (if applicable)
- [ ] Document deployment in project notes
- [ ] Backup deployment files
- [ ] Test on Etherscan web interface

## Security Considerations

### Before Deployment

1. **Audit Contract Code**
   - Review all smart contract logic
   - Check for known vulnerabilities
   - Consider professional audit for mainnet

2. **Test Thoroughly**
   - Run all unit tests
   - Perform integration tests
   - Test on local network first

3. **Secure Private Keys**
   - Use hardware wallet for mainnet
   - Never share private keys
   - Use separate deployment wallet

### After Deployment

1. **Verify Ownership**
   - Confirm owner address is correct
   - Test owner functions

2. **Monitor Contract**
   - Watch for unusual activity
   - Set up event monitoring

3. **Plan Upgrades**
   - Consider proxy pattern for upgradability
   - Plan migration strategy if needed

## Additional Resources

### Documentation
- [Hardhat Documentation](https://hardhat.org/docs)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [Zama fhEVM Documentation](https://docs.zama.ai/fhevm)

### Tools
- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Etherscan Sepolia](https://sepolia.etherscan.io/)
- [Gas Tracker](https://etherscan.io/gastracker)

### Support
- Open an issue on GitHub
- Check Hardhat Discord
- Review Zama documentation

## Mainnet Deployment (Future)

When ready for mainnet:

1. **Comprehensive Audit**
   - Professional security audit required
   - Fix all identified issues

2. **Update Configuration**
   ```javascript
   mainnet: {
     url: process.env.MAINNET_RPC_URL,
     chainId: 1,
     accounts: [process.env.MAINNET_PRIVATE_KEY],
   }
   ```

3. **Use Hardware Wallet**
   - Ledger or Trezor recommended
   - Never use hot wallet private keys

4. **Gradual Rollout**
   - Start with limited functionality
   - Monitor closely
   - Enable features progressively

5. **Emergency Procedures**
   - Have pause mechanism
   - Document emergency contacts
   - Prepare incident response plan

---

For questions or issues, please refer to the project documentation or open an issue on GitHub.
