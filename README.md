# Privacy Evaluation Platform

A privacy-protected evaluation platform built on Ethereum using Fully Homomorphic Encryption (FHE) technology from Zama.

🌐 **Live Demo**: [https://anonymous-innovation-evaluation.vercel.app/](https://anonymous-innovation-evaluation.vercel.app/)

## 🌟 Core Concept

This platform leverages **Fully Homomorphic Encryption (FHE)** to enable anonymous evaluation of innovation projects while maintaining complete privacy of scores until results are revealed. Evaluators can submit confidential assessments without exposing individual ratings, ensuring unbiased and fair evaluation processes.

### FHE-Powered Anonymous Innovation Assessment

Traditional evaluation systems expose individual scores, potentially leading to bias and unfair influence. Our system uses Zama's FHE technology to encrypt all evaluation data on-chain, allowing computations on encrypted values while preserving complete privacy.

**Key Innovation**: Privacy-Preserving Innovation Outcomes Evaluation
- Scores remain encrypted throughout the evaluation process
- Aggregated results computed on encrypted data using homomorphic operations
- Individual evaluator identities and ratings protected until final reveal
- Transparent, verifiable, and tamper-proof on blockchain

## 🎯 How It Works

### For Project Submitters

1. Connect your Web3 wallet (MetaMask)
2. Submit your innovation project with title and description
3. Wait for evaluation period to complete
4. View final scores and rankings when revealed

### For Evaluators

1. Connect your Web3 wallet
2. Browse submitted projects
3. Evaluate projects across four dimensions (0-10 scale):
   - **Innovation**: Novelty and creativity of the idea
   - **Feasibility**: Practical implementation potential
   - **Impact**: Expected market/social influence
   - **Technical Merit**: Technical soundness and quality

4. Scores are encrypted on-chain using FHE
5. Individual ratings remain private until system-wide reveal

### Privacy Protection Mechanism

- All scores are encrypted using Zama's FHE technology before being stored on blockchain
- Individual evaluations cannot be viewed by anyone, including administrators
- Only aggregated results can be decrypted and revealed
- The system ensures evaluator anonymity throughout the process

## 📝 Smart Contract

**Network**: Ethereum Sepolia Testnet

**Contract Address**: [`0x5a9CC7eb07129Af3ED1dC5D4F3B061853AAf8566`](https://sepolia.etherscan.io/address/0x5a9CC7eb07129Af3ED1dC5D4F3B061853AAf8566)

### Contract Features

- **Encrypted Storage**: All evaluation scores stored as encrypted values (euint8, euint32)
- **Access Control**: Proper ACL management for FHE operations
- **Async Decryption**: Secure result revelation using Zama's decryption callbacks
- **Event Logging**: Complete audit trail of all activities
- **SepoliaConfig Integration**: Inherits Zama's standard configuration for Sepolia testnet

## 🎬 Demo & Resources

### Live Application
🔗 **URL**: [https://anonymous-innovation-evaluation.vercel.app/](https://anonymous-innovation-evaluation.vercel.app/)

### Video Demonstration
📹 **Demo Video**: [Watch ](#) *AnonymousInnovationEvaluation.mp4*

A comprehensive walkthrough showing:
- Project submission process
- Anonymous evaluation workflow
- FHE encryption in action
- Results revelation mechanism
- On-chain transaction verification

### On-Chain Transaction Examples

View real transactions on Sepolia Etherscan:

**Contract Deployment**
- Transaction: [View on Etherscan](https://sepolia.etherscan.io/address/0x5a9CC7eb07129Af3ED1dC5D4F3B061853AAf8566)
- Deployer: `0x313D7611251A2Ec1c7051BE9e452FA51c5Cc8707`
- Block: Verified on Sepolia

**Project Submission Transaction**
![Project Submission](./docs/screenshots/project-submission.png)
*Example: Creating an encrypted project entry on-chain*

**Evaluation Submission Transaction**
![Evaluation Submission](./docs/screenshots/evaluation-submission.png)
*Example: Submitting encrypted scores using FHE*

**Results Reveal Transaction**
![Results Reveal](./docs/screenshots/results-reveal.png)
*Example: Decrypting and revealing final rankings*

## 🔧 Technology Stack

### Blockchain Layer
- **Network**: Ethereum Sepolia Testnet
- **Smart Contracts**: Solidity 0.8.24
- **FHE Library**: @fhevm/solidity (Zama)
- **Configuration**: SepoliaConfig
- **Development Framework**: Hardhat 2.22.0
- **Testing**: Hardhat Toolbox
- **Verification**: Hardhat Verify Plugin
- **Gas Reporting**: Hardhat Gas Reporter

### CI/CD & Quality Assurance
- **CI Platform**: GitHub Actions
- **Code Linting**: Solhint
- **Code Formatting**: Prettier
- **Coverage Reporting**: Codecov
- **Test Suite**: 58 comprehensive tests
- **Automated Testing**: Node.js 18.x, 20.x

### Frontend Layer
- **Core**: Vanilla JavaScript (ES6+)
- **Web3 Integration**: Ethers.js v5.7.2
- **Wallet Connection**: MetaMask
- **UI Framework**: Pure CSS with responsive design
- **Hosting**: Vercel

### Encryption Layer
- **FHE Provider**: Zama fhEVM
- **Encrypted Types**: euint8, euint32, ebool
- **Operations**: Homomorphic addition, comparison
- **Decryption**: Async callback pattern

## 🛠️ Development Setup

### Prerequisites
- Node.js v18 or higher
- npm or yarn
- MetaMask wallet
- Sepolia test ETH (get from [Sepolia Faucet](https://sepoliafaucet.com/))

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd privacy-evaluation-platform
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure your `.env` file:
```env
PRIVATE_KEY=your_wallet_private_key
SEPOLIA_RPC_URL=https://eth-sepolia.public.blastapi.io
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### Hardhat Commands

#### Compilation
```bash
npm run compile        # Compile contracts
npm run clean          # Clean artifacts
```

#### Testing
```bash
npm test               # Run tests
npm run test:gas       # Run tests with gas reporting
npm run coverage       # Generate coverage report
```

#### Code Quality
```bash
npm run lint           # Run all linters
npm run lint:sol       # Lint Solidity code
npm run lint:sol:fix   # Auto-fix Solidity issues
npm run prettier:check # Check code formatting
npm run prettier:write # Auto-format code
npm run format         # Alias for prettier:write
```

#### Deployment
```bash
npm run deploy         # Deploy to Sepolia
npm run deploy:local   # Deploy to local network
npm run simulate       # Simulate deployment and test flows
```

#### Verification
```bash
npm run verify -- <CONTRACT_ADDRESS>
```

#### Interaction
```bash
npm run interact       # Interactive contract CLI
npm run interact -- <CONTRACT_ADDRESS>
```

#### Local Development
```bash
npm run node           # Start local Hardhat network
npm run accounts       # List available accounts
npm run balance -- --account <ADDRESS>
```

### Custom Hardhat Tasks

The project includes custom Hardhat tasks for development:

- `accounts` - List all available accounts with balances
- `balance` - Check balance of specific account

Example:
```bash
npx hardhat accounts
npx hardhat balance --account 0x1234...
```

## 🏗️ Architecture

```
┌──────────────────────────────────┐
│        Web Frontend              │
│  (JavaScript + Ethers.js)        │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│     Smart Contract Layer         │
│  AnonymousInnovationEvaluation   │
│    (Solidity 0.8.24)             │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│       FHE Library (Zama)         │
│  - Encryption/Decryption         │
│  - Homomorphic Operations        │
│  - Access Control (ACL)          │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│      Ethereum Sepolia            │
│    (Blockchain Storage)          │
└──────────────────────────────────┘
```

## 📊 Evaluation Workflow

```
┌─────────────────┐
│ Submit Project  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Evaluation      │
│ Period Active   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Evaluators      │
│ Submit Scores   │
│ (FHE Encrypted) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Homomorphic     │
│ Aggregation     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Admin Triggers  │
│ Reveal          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Async           │
│ Decryption      │
│ Request         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Callback        │
│ Processing      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Final Rankings  │
│ Published       │
└─────────────────┘
```

## 🌍 Use Cases

### Academic & Research
- **Peer Review**: Anonymous evaluation of research proposals
- **Grant Applications**: Unbiased assessment of academic funding requests
- **Conference Submissions**: Fair paper review process
- **Thesis Evaluation**: Multi-dimensional assessment of academic work

### Business & Innovation
- **Startup Competitions**: Private judging of business pitches
- **Innovation Challenges**: Corporate internal innovation programs
- **Hackathons**: Fair evaluation of project submissions
- **Product Ideas**: Confidential assessment of new product concepts

### Community & Open Source
- **DAO Proposals**: Anonymous voting on governance proposals
- **Open Source Projects**: Community-driven project ratings
- **Bounty Programs**: Private evaluation of solution quality
- **Feature Requests**: Confidential priority assessment

## 🔐 Security & Privacy Features

### Encryption Guarantees
- **End-to-End Encryption**: Scores encrypted before leaving browser
- **On-Chain Privacy**: Encrypted data stored on blockchain
- **Homomorphic Computing**: Calculations on encrypted values
- **Zero-Knowledge Proofs**: Verifiable without revealing data

### Access Control
- **ACL Management**: Fine-grained permission system
- **Signature Verification**: Cryptographic validation of decryption
- **Time-Based Controls**: Evaluation period enforcement
- **Admin Functions**: Restricted to contract owner only

### Threat Mitigation
- **No Retroactive Changes**: Immutable on-chain records
- **Front-Running Protection**: Encrypted submissions prevent preview
- **Sybil Resistance**: Wallet-based identity
- **Data Integrity**: Blockchain ensures tamper-proof storage

## 🎨 User Interface Features

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Real-Time Updates**: Live transaction status
- **MetaMask Integration**: Seamless wallet connection
- **Dark Mode Theme**: Eye-friendly deep blue gradient background
- **Intuitive Navigation**: Clear separation of submitter and evaluator flows
- **Visual Feedback**: Loading states, success/error messages
- **Transaction History**: View all on-chain activities

## 📦 Deployment

### Network Information

**Sepolia Testnet**
- Network: Ethereum Sepolia
- Chain ID: 11155111
- RPC URL: https://eth-sepolia.public.blastapi.io
- Block Explorer: https://sepolia.etherscan.io/

### Current Deployment

**Contract Address**: [`0x5a9CC7eb07129Af3ED1dC5D4F3B061853AAf8566`](https://sepolia.etherscan.io/address/0x5a9CC7eb07129Af3ED1dC5D4F3B061853AAf8566)

**Etherscan Links**:
- Contract: https://sepolia.etherscan.io/address/0x5a9CC7eb07129Af3ED1dC5D4F3B061853AAf8566
- Verified Source Code: https://sepolia.etherscan.io/address/0x5a9CC7eb07129Af3ED1dC5D4F3B061853AAf8566#code

### Deployment Scripts

The project includes comprehensive deployment scripts:

1. **deploy.js** - Main deployment script
   - Deploys contract to configured network
   - Saves deployment information
   - Tests basic contract functionality
   - Displays gas usage and costs

2. **verify.js** - Contract verification
   - Verifies source code on Etherscan
   - Automatically reads deployment info
   - Supports manual contract address input

3. **interact.js** - Interactive CLI
   - Full-featured contract interaction
   - Menu-driven interface
   - All contract functions accessible

4. **simulate.js** - Deployment simulation
   - Tests full workflow locally
   - Gas estimation for real deployments
   - Cost projections at different gas prices

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## 🔄 CI/CD Pipeline

### Automated Workflows

The project includes comprehensive CI/CD pipelines using GitHub Actions:

- **Automated Testing**: Runs on every push and pull request
- **Multiple Node.js Versions**: Tests on Node.js 18.x and 20.x
- **Code Quality Checks**: Solhint linting and Prettier formatting
- **Coverage Reporting**: Automatic upload to Codecov
- **Gas Usage Analysis**: Monitors contract efficiency
- **Security Scanning**: Checks for vulnerabilities

### Workflow Triggers

- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Manual workflow dispatch

### Quality Metrics

| Metric | Target | Status |
|--------|--------|--------|
| Test Coverage | >80% | [![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)]() |
| Tests Passing | 58/58 | [![Tests](https://img.shields.io/badge/tests-passing-brightgreen)]() |
| Linting | Clean | [![Lint](https://img.shields.io/badge/lint-passing-brightgreen)]() |

See [CI-CD.md](./CI-CD.md) for complete CI/CD documentation.

## 📈 Roadmap

- [x] Core FHE evaluation system
- [x] Hardhat development framework
- [x] Comprehensive deployment scripts
- [x] Contract verification support
- [x] Interactive CLI tools
- [x] Sepolia testnet deployment
- [x] Basic web interface
- [ ] Mainnet deployment
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Mobile application
- [ ] Integration with DAOs
- [ ] Batch evaluation features
- [ ] Reputation system for evaluators

## 🤝 Contributing

We welcome contributions from the community! Whether it's:

- 🐛 Bug reports
- 💡 Feature suggestions
- 📝 Documentation improvements
- 🔧 Code contributions
- 🎨 UI/UX enhancements

Please feel free to open issues or submit pull requests on GitHub.

## 📚 Learn More

### FHE Resources
- [Zama fhEVM Documentation](https://docs.zama.ai/fhevm)
- [What is Homomorphic Encryption?](https://www.zama.ai/post/what-is-homomorphic-encryption)
- [FHE Use Cases in Blockchain](https://www.zama.ai/post/fhe-use-cases-blockchain)

### Ethereum Resources
- [Sepolia Testnet Explorer](https://sepolia.etherscan.io/)
- [Ethereum Development Documentation](https://ethereum.org/en/developers/)
- [Ethers.js Documentation](https://docs.ethers.org/v5/)

### Related Projects
- [Zama Bounty Program](https://github.com/zama-ai/bounty-program)
- [fhEVM Examples](https://github.com/zama-ai/fhevm)

## ⚠️ Important Notes

### Testnet Disclaimer
This application is currently deployed on **Ethereum Sepolia Testnet** for demonstration and testing purposes only.

- Do not use it with real assets
- Test ETH has no real-world value
- Contract may be redeployed or reset
- Not audited for production use

### Privacy Considerations
While FHE provides strong privacy guarantees:
- Wallet addresses are public on blockchain
- Transaction metadata is visible
- Consider using privacy-focused wallets for enhanced anonymity

## 📧 Contact & Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/JimmyDuBuque/AnonymousInnovationEvaluation/issues)
- **Discussions**: [Join community discussions](https://github.com/JimmyDuBuque/AnonymousInnovationEvaluation/discussions)

---

**Built with ❤️ using Zama FHE Technology**

*Empowering privacy-preserving innovation evaluation on blockchain*
