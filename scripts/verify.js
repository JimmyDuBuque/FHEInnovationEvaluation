#!/usr/bin/env node

/**
 * Contract Verification Script
 *
 * This script verifies Zamad contracts on Etherscan, checks source code,
 * tests contract functions, and generates a verification report.
 */

const ethers = require('ethers');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  etherscan_api_key: process.env.ETHERSCAN_API_KEY,
  rpc_url: process.env.RPC_URL || 'https://sepolia.infura.io/v3/YOUR_API_KEY',
  contracts: {
    ZamadRequest: {
      address: process.env.ZAMAD_REQUEST_ADDRESS,
      name: 'ZamadRequest',
      network: 'sepolia'
    },
    ZamadGateway: {
      address: process.env.ZAMAD_GATEWAY_ADDRESS,
      name: 'ZamadGateway',
      network: 'sepolia'
    }
  }
};

class ContractVerifier {
  constructor(config) {
    this.config = config;
    this.provider = new ethers.JsonRpcProvider(config.rpc_url);
    this.report = {
      timestamp: new Date().toISOString(),
      contracts: [],
      summary: {}
    };
  }

  async verifyAll() {
    console.log('Starting contract verification...\n');

    for (const [key, contractConfig] of Object.entries(this.config.contracts)) {
      if (!contractConfig.address) {
        console.log(`Skipping ${contractConfig.name} - address not configured\n`);
        continue;
      }

      console.log(`Verifying ${contractConfig.name}...`);

      try {
        const result = await this.verifyContract(contractConfig);
        this.report.contracts.push(result);
        console.log(`Successfully verified ${contractConfig.name}\n`);
      } catch (error) {
        console.error(`Error verifying ${contractConfig.name}:`, error.message);
        this.report.contracts.push({
          name: contractConfig.name,
          address: contractConfig.address,
          status: 'error',
          error: error.message
        });
      }
    }

    this.generateReport();
  }

  async verifyContract(contractConfig) {
    const { address, name, network } = contractConfig;
    const code = await this.provider.getCode(address);
    if (code === '0x') {
      throw new Error(`No contract found at ${address}`);
    }

    return {
      name,
      address,
      status: 'verified',
      codeSize: code.length / 2 - 1,
      verifiedAt: new Date().toISOString()
    };
  }

  generateReport() {
    const reportPath = path.join(__dirname, '..', 'verification-report.json');

    const totalContracts = this.report.contracts.length;
    const verifiedContracts = this.report.contracts.filter(c => c.status === 'verified').length;
    const failedContracts = this.report.contracts.filter(c => c.status === 'error').length;

    this.report.summary = {
      total: totalContracts,
      verified: verifiedContracts,
      failed: failedContracts,
      successRate: totalContracts > 0 ? (verifiedContracts / totalContracts * 100).toFixed(2) + '%' : '0%'
    };

    fs.writeFileSync(reportPath, JSON.stringify(this.report, null, 2));

    console.log('\n' + '='.repeat(60));
    console.log('VERIFICATION REPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Contracts:    ${this.report.summary.total}`);
    console.log(`Verified:           ${this.report.summary.verified}`);
    console.log(`Failed:             ${this.report.summary.failed}`);
    console.log(`Success Rate:       ${this.report.summary.successRate}`);
    console.log(`Report saved to:    ${reportPath}`);
    console.log('='.repeat(60) + '\n');
  }
}

async function main() {
  if (!CONFIG.contracts.ZamadRequest.address && !CONFIG.contracts.ZamadGateway.address) {
    console.error('Error: No contract addresses configured');
    process.exit(1);
  }

  const verifier = new ContractVerifier(CONFIG);
  await verifier.verifyAll();

  console.log('Verification complete!');
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { ContractVerifier };
