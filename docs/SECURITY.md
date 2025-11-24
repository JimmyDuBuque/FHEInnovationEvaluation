# DApp 150 - Security Documentation

## Table of Contents

1. [Threat Model](#threat-model)
2. [Attack Vectors](#attack-vectors)
3. [Mitigation Strategies](#mitigation-strategies)
4. [Input Validation](#input-validation)
5. [Access Control Design](#access-control-design)
6. [Emergency Procedures](#emergency-procedures)
7. [Known Limitations](#known-limitations)
8. [Security Checklist](#security-checklist)

---

## Threat Model

### Adversary Assumptions

We consider the following adversaries:

#### 1. External Attackers (Non-Contract Participants)

**Capabilities**:
- Can submit transactions to public functions
- Can observe all public contract state
- Can listen to events
- Cannot decrypt FHE-encrypted data without key
- No access to private keys

**Assumptions**:
- Cannot break cryptographic primitives
- Cannot manipulate blockchain consensus
- Cannot access off-chain storage
- Subject to gas cost constraints

**Goals**:
- Steal funds
- Disrupt service
- Cause denial of service
- Extract privacy information from public data

---

#### 2. Malicious Gateway

**Capabilities**:
- Receive encrypted data in events
- Can decrypt data (has decryption key)
- Can compute arbitrary functions
- Can submit false results
- Can perform timing attacks

**Assumptions**:
- Cannot create valid signatures for other addresses
- Must adhere to contract interface
- Cannot modify contract code
- Subject to transaction ordering

**Goals**:
- Return incorrect computation results
- Steal decrypted data
- Deny service to users
- Extract private keys through side-channels

---

#### 3. Malicious Contract Owner

**Capabilities**:
- Can update contract parameters
- Can change gateway address
- Can pause/disable functions
- Cannot access encrypted private data
- Cannot sign as other users

**Assumptions**:
- Cannot create valid user signatures
- Cannot break cryptographic schemes
- Subject to blockchain transparency

**Goals**:
- Extract value from contract
- Manipulate pricing (in PriceObfuscation)
- Front-run transactions
- Disable refunds

---

#### 4. Front-Runner

**Capabilities**:
- Can see pending transactions in mempool
- Can submit transactions before others
- Can observe encrypted data patterns
- Can analyze timing information

**Assumptions**:
- Cannot decrypt encrypted data
- Cannot manipulate blockchain ordering (much)
- Cannot forge signatures

**Goals**:
- Extract MEV (Maximum Extractable Value)
- Cause transactions to fail
- Analyze request patterns

---

### System Assets

| Asset | Value | Threat Level |
|-------|-------|---------------|
| User Funds | High | Critical |
| Private Data | High | Critical |
| Contract State | Medium | High |
| Gateway Key | Critical | Critical |
| Owner Private Key | Critical | Critical |

---

## Attack Vectors

### 1. Direct Fund Theft

**Attack**: Attacker calls `requestRefund()` for another user's request

**Current Protection**:
```solidity
require(msg.sender == requests[requestId].requester,
  "Not requester");
```

**Mitigation**: Only original requester can refund

**Status**: ✅ Protected

---

### 2. Reentrancy Attack

**Attack**: Attacker creates contract that calls `requestRefund()` recursively

**Vulnerable Pattern**:
```solidity
// VULNERABLE
(bool success, ) = payable(requester).call{value: refundAmount}("");
requests[requestId].status = RequestStatus.REFUNDED;  // State updated AFTER call
```

**Current Protection**:
- Checks-Effects-Interactions pattern
- State updated before external call
- Status = REFUNDED prevents double-spend

**Implementation**:
```solidity
// SAFE
requests[requestId].status = RequestStatus.REFUNDED;
(bool success, ) = payable(requester).call{value: refundAmount}("");
require(success, "Refund failed");
```

**Status**: ✅ Protected

---

### 3. Replay Attack

**Attack**: Attacker replays old `gatewayCallback()` transaction

**Current Protection**:
- Request status checked (only PENDING can transition to PROCESSING)
- Request ID used once per callback
- Timestamp validation in SecurityValidator

**Mitigation Code**:
```solidity
Request storage req = requests[requestId];
require(req.status == RequestStatus.PENDING, "Not pending");
req.status = RequestStatus.PROCESSING;
```

**Status**: ✅ Protected

---

### 4. Denial of Service (DOS)

#### 4a. Gas Exhaustion

**Attack**: Submit requests with huge `encryptedData` to exhaust gas

**Current Protection**:
- Caller pays for gas (polluter pays principle)
- Contract storage is limited
- Refunds available after timeout

**Mitigation**: Monitor contract growth

---

#### 4b. Timeout Stalling

**Attack**: Never call `gatewayCallback()`, force users to wait

**Current Protection**:
- Timeout mechanism allows refunds
- Timeout is immutable and cannot be extended
- Users can recover funds after timeout

**Mitigation**: Set reasonable timeout durations

---

### 5. Gateway Compromise

**Attack**: Gateway returns incorrect computation results

**Current Protection**:
- Results are encrypted in contract
- Verification possible off-chain with proofs
- Separate audit can be performed
- Results stored for forensic analysis

**Mitigation Strategies**:
1. Multiple gateways with consensus
2. Zero-knowledge proof verification
3. Periodic audits
4. Threshold cryptography

**Status**: ⚠️ Requires additional measures

---

### 6. Privacy Leakage via Timing

**Attack**: Attacker observes request timing patterns to infer information

**Current Protection**:
- Timestamps are visible (by design for audit)
- Frequency of requests is observable
- Actual values encrypted

**Mitigation**:
```javascript
// Client-side: Add random delays between requests
function addRandomDelay() {
  const delay = Math.random() * 60000; // 0-60 seconds
  return new Promise(resolve => setTimeout(resolve, delay));
}
```

**Status**: ⚠️ Partial (requires application-level defense)

---

### 7. Front-Running

**Attack**: Attacker sees request in mempool and submits similar request first

**Current Protection**:
- Requests are independent (no ordering dependency)
- Each request has unique requestId
- Results are private until decrypted

**Mitigation**: Application-level ordering if needed

**Status**: ✅ Protected by design

---

### 8. Signature Forgery

**Attack**: Attacker creates fake signature for request validation

**Current Protection**:
- ECDSA signature verification
- Keccak256 hashing of request data
- Nonce tracking to prevent replay

**Implementation**:
```solidity
bytes32 requestHash = keccak256(abi.encodePacked(
  requestData,
  nonce,
  block.chainid
));

address signer = ecrecover(
  requestHash,
  v, r, s
);

require(signer == expectedSigner, "Invalid signature");
```

**Status**: ✅ Protected

---

### 9. Unauthorized Gateway Callback

**Attack**: Arbitrary address calls `gatewayCallback()` with fake results

**Current Protection**:
```solidity
modifier onlyGateway() {
  require(msg.sender == gatewayAddress, "Not gateway");
  _;
}

function gatewayCallback(...) external onlyGateway { ... }
```

**Status**: ✅ Protected

---

### 10. Owner Privilege Abuse

**Attack**: Owner changes gateway address to malicious contract

**Current Protection**:
- Owner is trusted entity
- All changes logged in events
- Can be detected on-chain

**Mitigation**:
1. Use multi-sig wallet for owner
2. Implement timelock for critical changes
3. Governance voting for upgrades

**Status**: ⚠️ Requires additional governance

---

## Mitigation Strategies

### Strategy 1: Input Validation

**Principle**: Validate all external inputs immediately

**Implementation**:
```solidity
function submitRequest(
  bytes calldata encryptedData,
  uint256 gasLimit,
  uint256 timeoutDuration
) external payable returns (uint256 requestId) {
  // Validate inputs
  require(encryptedData.length > 0, "Empty data");
  require(gasLimit > 0, "Invalid gas limit");
  require(timeoutDuration > 0, "Invalid timeout");
  require(timeoutDuration <= MAX_TIMEOUT, "Timeout too large");

  // ... proceed with safe inputs
}
```

**Coverage**: All public functions

---

### Strategy 2: State Machine Validation

**Principle**: Enforce allowed state transitions

```solidity
// Request status state machine
// PENDING → PROCESSING → COMPLETED
// PENDING → REFUNDED
// PROCESSING → REFUNDED (on timeout)

function gatewayCallback(...) external onlyGateway {
  Request storage req = requests[requestId];
  require(req.status == RequestStatus.PENDING,
    "Invalid state for callback");
  req.status = RequestStatus.PROCESSING;
  // ... proceed only from valid state
}
```

---

### Strategy 3: Access Control

**Principle**: Only authorized addresses can perform sensitive operations

**Access Levels**:
```solidity
modifier onlyOwner() {
  require(msg.sender == owner, "Not owner");
  _;
}

modifier onlyGateway() {
  require(msg.sender == gatewayAddress, "Not gateway");
  _;
}

modifier onlyRequester(uint256 requestId) {
  require(msg.sender == requests[requestId].requester,
    "Not requester");
  _;
}
```

---

### Strategy 4: Pull Over Push Pattern

**Principle**: Users withdraw funds rather than contract sending

**Safe Implementation**:
```solidity
// Instead of:
// (bool success, ) = payable(user).call{value: amount}("");

// Use:
mapping(address => uint256) public refundBalance;

function requestRefund(uint256 requestId) external {
  // ... validation
  refundBalance[msg.sender] += amount;
  emit RefundProcessed(requestId, amount);
}

function withdrawRefund() external {
  uint256 amount = refundBalance[msg.sender];
  refundBalance[msg.sender] = 0;
  (bool success, ) = payable(msg.sender).call{value: amount}("");
  require(success, "Withdrawal failed");
}
```

---

### Strategy 5: Cryptographic Validation

**Principle**: Use signatures and hashing for integrity

```solidity
function validateRequest(
  bytes calldata requestData,
  bytes calldata signature
) external view returns (bool) {
  bytes32 requestHash = keccak256(abi.encodePacked(
    requestData,
    nonces[msg.sender]
  ));

  address signer = ecrecover(
    keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", requestHash)),
    v, r, s
  );

  return signer == msg.sender;
}
```

---

### Strategy 6: Time-Based Protections

**Principle**: Use timeout to prevent indefinite waiting

```solidity
function isTimedOut(uint256 requestId) public view returns (bool) {
  return block.timestamp >= requests[requestId].timeoutTime;
}

function canRefund(uint256 requestId) public view returns (bool) {
  Request storage req = requests[requestId];
  return (req.status != RequestStatus.REFUNDED) &&
         isTimedOut(requestId);
}
```

---

## Input Validation

### Validation Strategy

All contract inputs validated according to this pattern:

```
Input Received
    ↓
Type Check (calldata length, etc.)
    ↓
Value Range Check (min/max)
    ↓
Logical Consistency Check
    ↓
Access Control Check
    ↓
Process Safe Input
```

### Specific Validations

#### encryptedData Validation
```solidity
require(encryptedData.length > 0, "Empty data");
require(encryptedData.length <= MAX_DATA_SIZE, "Data too large");
```

#### Timeout Duration Validation
```solidity
require(timeoutDuration > 0, "Zero timeout");
require(timeoutDuration <= MAX_TIMEOUT, "Timeout too large");
```

#### Gas Limit Validation
```solidity
require(gasLimit > 0, "Invalid gas limit");
require(gasLimit <= MAX_GAS_LIMIT, "Gas limit too high");
```

#### Address Validation
```solidity
require(newGateway != address(0), "Null address");
require(newGateway != gatewayAddress, "Same address");
require(newGateway.code.length > 0, "Not a contract"); // Optional
```

---

## Access Control Design

### Role-Based Access Control

**Owner Role**:
- Can update gateway address
- Can set request timeout
- Can pause/unpause (if implemented)
- Can withdraw stuck funds (if implemented)

```solidity
modifier onlyOwner() {
  require(msg.sender == owner, "Caller is not owner");
  _;
}
```

**Gateway Role**:
- Can submit callback results
- Can trigger computation completion
- Cannot transfer user funds directly
- Cannot access private encrypted data

```solidity
modifier onlyGateway() {
  require(msg.sender == gatewayAddress, "Caller is not gateway");
  _;
}
```

**User Role**:
- Can submit requests
- Can request refunds for own requests
- Can view own request status
- Cannot interfere with other users' requests

```solidity
modifier onlyRequester(uint256 requestId) {
  require(msg.sender == requests[requestId].requester,
    "Not the requester");
  _;
}
```

### Permission Matrix

| Function | Public | User | Owner | Gateway |
|----------|--------|------|-------|---------|
| submitRequest | ✅ | ✅ | ✅ | ✅ |
| getRequestStatus | ✅ | ✅ | ✅ | ✅ |
| gatewayCallback | ❌ | ❌ | ❌ | ✅ |
| requestRefund | ✅ | ✅ (own) | ✅ | ❌ |
| setGatewayAddress | ❌ | ❌ | ✅ | ❌ |
| setRequestTimeout | ❌ | ❌ | ✅ | ❌ |

---

## Emergency Procedures

### Scenario 1: Gateway Compromise

**Detection**:
- Invalid results returned
- Users reporting wrong computations
- Repeated computation failures

**Response**:
1. Call `setGatewayAddress(newSafeGateway)`
2. Audit previous results
3. Issue refunds for affected requests
4. Notify users immediately

**Implementation**:
```javascript
const newGatewayAddress = "0x..."; // Pre-approved backup
await contract.setGatewayAddress(newGatewayAddress);
console.log("Gateway updated, resuming operations");
```

---

### Scenario 2: Contract Bug Discovered

**Detection**:
- Unexpected behavior in tests
- Security researcher reports issue
- Formal verification finds bug

**Response**:
1. Deploy fixed version to new address
2. Migrate state to new contract
3. Deprecate old contract
4. Update address in gateway

**Prevention**:
- Bug bounty program
- Regular audits
- Formal verification
- Staged deployment

---

### Scenario 3: Stuck Funds

**Detection**:
- Failed transfers
- Accounts unable to withdraw refunds

**Recovery**:
```solidity
// Emergency withdrawal (owner only)
function emergencyWithdraw(address payable recipient)
  external onlyOwner
{
  uint256 balance = address(this).balance;
  (bool success, ) = recipient.call{value: balance}("");
  require(success, "Emergency withdraw failed");
}
```

---

### Scenario 4: DDoS Attack

**Detection**:
- Mempool congestion
- Failed transactions
- High gas prices

**Response**:
1. Increase gas prices if critical
2. Use priority fee (EIP-1559)
3. Batch operations if possible
4. Wait for network to stabilize

---

## Known Limitations

### 1. Gateway Trust Assumption

**Issue**: System requires trusting the gateway service

**Impact**: High
- Gateway can see plaintext data during decryption
- Gateway could return incorrect results
- Cannot be resolved purely on-chain

**Mitigation**:
- Use trusted gateway provider
- Implement gateway redundancy
- Use threshold cryptography (requires advanced FHE)
- Implement result verification

---

### 2. Timing Attack Vulnerability

**Issue**: Transaction timing patterns leak information

**Impact**: Medium
- Frequency of requests is observable
- Timing of submissions visible on-chain
- Cannot be completely eliminated

**Mitigation**:
- Add random delays in application
- Bundle transactions
- Use privacy pools (in future)

---

### 3. Data Size Leakage

**Issue**: Encrypted data size leaks information about data

**Impact**: Low-Medium
- Attacker can estimate data magnitude
- Consistent sizes can be pattern-matched
- Cannot be avoided with FHE

**Mitigation**:
- Use consistent padding sizes
- Add dummy data to standardize size
- Use data compression carefully

---

### 4. Centralized Owner

**Issue**: Single owner address has unlimited power

**Impact**: Medium
- Can change critical parameters
- Can switch to malicious gateway
- Single point of failure

**Mitigation**:
- Use multi-sig wallet for owner
- Implement timelock delays
- Use governance voting
- Community oversight

---

### 5. Timeout Limitations

**Issue**: Timeout must be manually triggered by user

**Impact**: Low
- Refunds not automatic
- Requires user action
- Can be forgotten

**Mitigation**:
- Implement automatic timeout scanner
- Notify users of timeout expiry
- Provide automated claiming service

---

### 6. Computational Overhead

**Issue**: FHE operations are computationally expensive

**Impact**: Medium
- Higher gas costs
- Slower computation time
- May not be suitable for all use cases

**Mitigation**:
- Optimize FHE library
- Use specialized hardware (TPU/GPU)
- Batch operations when possible

---

## Security Checklist

### Pre-Deployment

- [ ] All contracts compiled without warnings
- [ ] All tests passing (100% coverage)
- [ ] Formal verification completed (if applicable)
- [ ] Security audit completed
- [ ] All findings addressed
- [ ] Code review completed
- [ ] Private key securely stored
- [ ] Testnet deployment successful
- [ ] Testnet testing completed
- [ ] Emergency procedures documented
- [ ] Runbook for incident response prepared

### Post-Deployment

- [ ] Contracts verified on block explorer
- [ ] Owner address is multi-sig wallet
- [ ] Gateway address is production gateway
- [ ] Timeout set to reasonable value
- [ ] Monitoring and alerts configured
- [ ] Event logging enabled
- [ ] Incident response team trained
- [ ] Security contacts documented
- [ ] Bug bounty program announced
- [ ] Community notified

### Ongoing

- [ ] Monitor for unusual activity
- [ ] Review audit logs regularly
- [ ] Check for security updates in dependencies
- [ ] Periodic security audits
- [ ] Gateway health monitoring
- [ ] Refund success rate monitoring
- [ ] User complaint tracking
- [ ] Formal verification updates
- [ ] Performance optimization
- [ ] Documentation updates

### Incident Response

- [ ] Establish incident response team
- [ ] Define escalation procedures
- [ ] Create incident response playbooks
- [ ] Conduct incident drills quarterly
- [ ] Document all incidents
- [ ] Post-incident analysis
- [ ] Implement preventive measures
- [ ] Update security policies

---

**Document Version**: 1.0
**Last Updated**: November 2024
**Status**: Complete
**Classification**: Public

For security issues, please email: security@zamadapp.io
