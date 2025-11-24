# Zamad Protocol - Development Makefile
# Common development tasks for the Zamad smart contracts

.PHONY: help install compile test deploy verify clean coverage lint format

# Default target
.DEFAULT_GOAL := help

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
RED := \033[0;31m
YELLOW := \033[0;33m
NC := \033[0m # No Color

help: ## Display this help message
	@echo "$(BLUE)Zamad Protocol - Development Tasks$(NC)"
	@echo ""
	@echo "$(YELLOW)Available Targets:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Usage:$(NC)"
	@echo "  make <target>"
	@echo ""
	@echo "$(YELLOW)Examples:$(NC)"
	@echo "  make install     # Install dependencies"
	@echo "  make compile     # Compile contracts"
	@echo "  make test        # Run tests"
	@echo "  make deploy      # Deploy contracts"
	@echo ""

# Installation targets

install: ## Install all dependencies
	@echo "$(BLUE)Installing dependencies...$(NC)"
	npm install
	@echo "$(GREEN)Dependencies installed$(NC)"

install-dev: ## Install development dependencies
	@echo "$(BLUE)Installing development dependencies...$(NC)"
	npm install --save-dev
	@echo "$(GREEN)Development dependencies installed$(NC)"

# Compilation targets

compile: ## Compile smart contracts
	@echo "$(BLUE)Compiling contracts...$(NC)"
	npx hardhat compile
	@echo "$(GREEN)Contracts compiled successfully$(NC)"

compile-clean: ## Clean and compile contracts
	@echo "$(BLUE)Cleaning artifacts...$(NC)"
	npx hardhat clean
	@echo "$(BLUE)Compiling contracts...$(NC)"
	npx hardhat compile
	@echo "$(GREEN)Clean compilation completed$(NC)"

# Testing targets

test: ## Run all tests
	@echo "$(BLUE)Running tests...$(NC)"
	npx hardhat test
	@echo "$(GREEN)Tests completed$(NC)"

test-verbose: ## Run tests with verbose output
	@echo "$(BLUE)Running tests (verbose)...$(NC)"
	npx hardhat test --verbose
	@echo "$(GREEN)Tests completed$(NC)"

test-gas: ## Run tests with gas reporter
	@echo "$(BLUE)Running tests with gas reporting...$(NC)"
	REPORT_GAS=true npx hardhat test
	@echo "$(GREEN)Tests completed - check gas report$(NC)"

test-coverage: coverage ## Alias for coverage target

coverage: ## Run tests with coverage analysis
	@echo "$(BLUE)Analyzing test coverage...$(NC)"
	npx hardhat coverage
	@echo "$(GREEN)Coverage report generated$(NC)"

# Deployment targets

deploy: compile ## Deploy contracts to default network
	@echo "$(BLUE)Deploying contracts...$(NC)"
	npx hardhat run scripts/deploy.js
	@echo "$(GREEN)Contracts deployed successfully$(NC)"

deploy-sepolia: compile ## Deploy contracts to Sepolia testnet
	@echo "$(BLUE)Deploying to Sepolia testnet...$(NC)"
	npx hardhat run scripts/deploy.js --network sepolia
	@echo "$(GREEN)Contracts deployed to Sepolia$(NC)"

deploy-ethereum: compile ## Deploy contracts to Ethereum mainnet
	@echo "$(RED)Deploying to Ethereum mainnet...$(NC)"
	@echo "$(YELLOW)Are you sure? This will use real ETH. Press Ctrl+C to cancel.$(NC)"
	sleep 5
	npx hardhat run scripts/deploy.js --network ethereum
	@echo "$(GREEN)Contracts deployed to Ethereum$(NC)"

deploy-arbitrum: compile ## Deploy contracts to Arbitrum
	@echo "$(BLUE)Deploying to Arbitrum...$(NC)"
	npx hardhat run scripts/deploy.js --network arbitrum
	@echo "$(GREEN)Contracts deployed to Arbitrum$(NC)"

# Verification targets

verify: ## Verify contracts on Etherscan
	@echo "$(BLUE)Verifying contracts on Etherscan...$(NC)"
	node scripts/verify.js
	@echo "$(GREEN)Verification completed$(NC)"

verify-sepolia: ## Verify contracts on Sepolia Etherscan
	@echo "$(BLUE)Verifying on Sepolia...$(NC)"
	ETHERSCAN_API_KEY=$(ETHERSCAN_API_KEY) npx hardhat verify --network sepolia $(CONTRACT_ADDRESS)
	@echo "$(GREEN)Sepolia verification completed$(NC)"

verify-ethereum: ## Verify contracts on Ethereum Etherscan
	@echo "$(BLUE)Verifying on Ethereum...$(NC)"
	ETHERSCAN_API_KEY=$(ETHERSCAN_API_KEY) npx hardhat verify --network ethereum $(CONTRACT_ADDRESS)
	@echo "$(GREEN)Ethereum verification completed$(NC)"

# Code quality targets

lint: ## Lint Solidity contracts
	@echo "$(BLUE)Linting contracts...$(NC)"
	npx solhint 'contracts/**/*.sol'
	@echo "$(GREEN)Linting completed$(NC)"

lint-js: ## Lint JavaScript files
	@echo "$(BLUE)Linting JavaScript...$(NC)"
	npx eslint scripts/ tests/
	@echo "$(GREEN)JavaScript linting completed$(NC)"

format: ## Format code with Prettier
	@echo "$(BLUE)Formatting code...$(NC)"
	npx prettier --write contracts/ scripts/ tests/
	@echo "$(GREEN)Code formatted$(NC)"

format-check: ## Check code formatting without changes
	@echo "$(BLUE)Checking code format...$(NC)"
	npx prettier --check contracts/ scripts/ tests/
	@echo "$(GREEN)Format check completed$(NC)"

# Cleanup targets

clean: ## Remove build artifacts and cache
	@echo "$(BLUE)Cleaning artifacts...$(NC)"
	npx hardhat clean
	rm -rf coverage/
	rm -rf .openzeppelin/
	@echo "$(GREEN)Cleaned$(NC)"

clean-all: clean ## Clean all generated files including node_modules
	@echo "$(BLUE)Removing node_modules...$(NC)"
	rm -rf node_modules/
	rm -rf package-lock.json
	@echo "$(GREEN)Complete cleanup completed$(NC)"

# Utility targets

gas-snapshot: test-gas ## Create gas usage snapshot
	@echo "$(BLUE)Gas snapshot created$(NC)"

network-info: ## Display configured networks
	@echo "$(BLUE)Configured Networks:$(NC)"
	npx hardhat networks

flatten: ## Flatten all contracts into single file
	@echo "$(BLUE)Flattening contracts...$(NC)"
	npx hardhat flatten contracts/ZamadRequest.sol > ZamadRequest_flat.sol
	npx hardhat flatten contracts/ZamadGateway.sol > ZamadGateway_flat.sol
	@echo "$(GREEN)Contracts flattened$(NC)"

docs: ## Generate contract documentation
	@echo "$(BLUE)Generating documentation...$(NC)"
	npx hardhat docgen
	@echo "$(GREEN)Documentation generated in docs/$(NC)"

size: compile ## Check contract sizes
	@echo "$(BLUE)Checking contract sizes...$(NC)"
	npx hardhat size-contracts
	@echo "$(GREEN)Size check completed$(NC)"

# Combined targets

all: install compile test ## Install, compile, and test
	@echo "$(GREEN)All targets completed$(NC)"

pre-commit: lint format-check test ## Run pre-commit checks
	@echo "$(GREEN)Pre-commit checks passed$(NC)"

pre-deploy: compile lint test coverage verify ## Full pre-deployment checks
	@echo "$(GREEN)Pre-deployment verification completed$(NC)"

ci: install compile lint test coverage ## Run full CI pipeline
	@echo "$(GREEN)CI pipeline completed$(NC)"

# Development helpers

dev: ## Start Hardhat local network and compile
	@echo "$(BLUE)Starting development environment...$(NC)"
	npx hardhat node &
	npx hardhat compile
	@echo "$(GREEN)Development environment ready$(NC)"

console: ## Start Hardhat interactive console
	@echo "$(BLUE)Starting Hardhat console...$(NC)"
	npx hardhat console

watch: ## Watch files and recompile on changes
	@echo "$(BLUE)Watching for changes...$(NC)"
	npx hardhat watch compile

# Environment setup

.env: ## Create .env file from template
	@echo "$(BLUE)Creating .env file...$(NC)"
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "$(GREEN).env created from template$(NC)"; \
		echo "$(YELLOW)Please edit .env with your configuration$(NC)"; \
	else \
		echo "$(YELLOW).env already exists$(NC)"; \
	fi

setup: install .env compile ## Complete setup
	@echo "$(GREEN)Setup completed. Run 'make dev' to start development$(NC)"

# Reporting targets

report-gas: ## Display gas report
	@echo "$(BLUE)Gas Usage Report:$(NC)"
	@cat .gas_report.txt 2>/dev/null || echo "No gas report found. Run 'make test-gas' first."

report-coverage: ## Display coverage report
	@echo "$(BLUE)Coverage Report:$(NC)"
	@echo "Open coverage/index.html in your browser to view detailed coverage"

# Info targets

info: ## Display project information
	@echo "$(BLUE)Zamad Protocol - Project Information$(NC)"
	@echo ""
	@echo "Version: $$(grep version package.json | head -1 | awk -F: '{ print $$2 }' | tr -d ' \",')"
	@echo "Node: $$(node --version)"
	@echo "NPM: $$(npm --version)"
	@echo "Hardhat: $$(npx hardhat --version)"
	@echo ""

stats: ## Display project statistics
	@echo "$(BLUE)Project Statistics:$(NC)"
	@echo ""
	@echo "Solidity Files: $$(find contracts -name '*.sol' | wc -l)"
	@echo "Test Files: $$(find test -name '*.js' -o -name '*.ts' | wc -l)"
	@echo "Script Files: $$(find scripts -name '*.js' | wc -l)"
	@echo ""
	@echo "Total Lines of Code:"
	@find contracts -name '*.sol' | xargs wc -l | tail -1
	@find test -name '*.js' -o -name '*.ts' | xargs wc -l 2>/dev/null | tail -1
	@find scripts -name '*.js' | xargs wc -l 2>/dev/null | tail -1

# Default commands help

.PHONY: show-env
show-env: ## Display environment variables
	@echo "$(BLUE)Environment Variables:$(NC)"
	@echo "RPC_URL: $${RPC_URL:-not set}"
	@echo "PRIVATE_KEY: $${PRIVATE_KEY:-(hidden)}"
	@echo "ETHERSCAN_API_KEY: $${ETHERSCAN_API_KEY:-(not set)}"

# Error handling

error-test: ## Test error handling in contracts
	@echo "$(BLUE)Testing error handling...$(NC)"
	npx hardhat test tests/error-handling.test.js

# Security targets

security-check: ## Run security checks
	@echo "$(BLUE)Running security checks...$(NC)"
	@echo "Checking for common vulnerabilities..."
	@echo "Note: Use professional security audits for production code"

# Documentation of Makefile

.PHONY: makefile-help
makefile-help: ## Display detailed Makefile help
	@echo "$(BLUE)Makefile Documentation$(NC)"
	@echo ""
	@echo "This Makefile provides common development tasks for the Zamad Protocol."
	@echo ""
	@echo "$(YELLOW)Key Targets:$(NC)"
	@echo "  setup         - Initial project setup"
	@echo "  dev           - Start development environment"
	@echo "  compile       - Compile contracts"
	@echo "  test          - Run tests"
	@echo "  deploy        - Deploy contracts"
	@echo "  verify        - Verify on Etherscan"
	@echo "  clean         - Remove artifacts"
	@echo ""
	@echo "$(YELLOW)Tips:$(NC)"
	@echo "  - Use 'make all' for full build pipeline"
	@echo "  - Use 'make pre-deploy' before production deployments"
	@echo "  - Check .env file configuration before deployment"
	@echo ""
