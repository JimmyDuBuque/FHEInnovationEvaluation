# DApp 150 - Technical Architecture Document

## Table of Contents

1. [System Design Overview](#system-design-overview)
2. [Component Architecture](#component-architecture)
3. [Data Flow](#data-flow)
4. [Gateway Callback Pattern](#gateway-callback-pattern)
5. [Request Lifecycle](#request-lifecycle)
6. [Timeout Mechanism](#timeout-mechanism)
7. [Refund System](#refund-system)
8. [Privacy Preservation](#privacy-preservation)
9. [Storage Layout](#storage-layout)
10. [Gas Optimization](#gas-optimization)

## System Design Overview

### High-Level Architecture

The DApp 150 system is a layered architecture consisting of three main components:

1. **Smart Contract Layer**: On-chain contracts managing state and logic
2. **Gateway Service Layer**: Off-chain service processing encrypted computations
3. **Client Application Layer**: Frontend or application using the system

### Core Principles

- **Separation of Concerns**: Each contract handles a specific responsibility
- **Privacy First**: All sensitive data encrypted before on-chain submission
- **Asynchronous Design**: Gateway callbacks allow non-blocking operations
- **Fail-Safe Mechanisms**: Automatic refunds prevent stuck funds
- **Gas Efficiency**: Optimized storage and computation patterns

### System Constraints

- Maximum request ID: 2^256 - 1
- Maximum timeout duration: ~136 years (type(uint256).max seconds)
- Minimum refund: 1 wei
- Maximum concurrent requests: Limited by gas and storage

## Component Architecture

### 1. GatewayTransaction Contract

**Purpose**: Core transaction management and request lifecycle

**Key Responsibilities**:
- Accept encrypted transaction requests from clients
- Maintain request state through lifecycle
- Handle gateway callbacks with computed results
- Process refunds for cancelled or timed-out requests
- Track request history

**State Variables**:
```solidity
mapping(uint256 => Request) public requests;
uint256 public requestCounter;
address public gatewayAddress;
address public owner;
uint256 public requestTimeout;

struct Request {
  address requester;
  uint256 submitTime;
  uint256 timeoutTime;
  RequestStatus status;
  bytes encryptedData;
  bytes result;
  uint256 refundAmount;
}

enum RequestStatus {
  PENDING,
  PROCESSING,
  COMPLETED,
  REFUNDED
}
```

**Key Functions**:
- `submitRequest()`: Create new request
- `gatewayCallback()`: Process gateway result
- `requestRefund()`: Initiate refund
- `getRequestStatus()`: Query request state

### 2. PrivacyPreservingDivision Contract

**Purpose**: Perform cryptographic division on encrypted data

**Key Responsibilities**:
- Execute division calculations on encrypted values
- Ensure mathematical correctness without decryption
- Prevent division by zero errors
- Return encrypted quotient and remainder

**State Variables**:
```solidity
address public gateway;
mapping(uint256 => DivisionOperation) public operations;

struct DivisionOperation {
  bytes encryptedNumerator;
  bytes encryptedDenominator;
  bytes encryptedQuotient;
  bytes encryptedRemainder;
  uint256 timestamp;
}
```

**Key Functions**:
- `divideEncrypted()`: Perform encrypted division
- `validateDivisor()`: Check divisor validity
- `getResultProof()`: Generate computation proof

### 3. SecurityValidator Contract

**Purpose**: Validate and authenticate requests

**Key Responsibilities**:
- Verify request signatures
- Check caller permissions
- Validate request freshness
- Audit transaction attempts
- Enforce security policies

**State Variables**:
```solidity
mapping(address => bool) public authorizedCallers;
mapping(bytes32 => bool) public usedNonces;
mapping(address => uint256) public lastRequestTime;
mapping(address => uint256) public requestCount;

uint256 public constant NONCE_EXPIRY = 1 days;
uint256 public constant MAX_REQUESTS_PER_DAY = 1000;
```

**Key Functions**:
- `validateRequest()`: Full request validation
- `verifySignature()`: Cryptographic signature check
- `checkPermissions()`: Access control verification
- `recordAuditLog()`: Security event logging
- `enforcePolicies()`: Apply security constraints

### 4. PriceObfuscation Contract

**Purpose**: Hide pricing while maintaining correct calculations

**Key Responsibilities**:
- Store encrypted price data
- Calculate costs on encrypted data
- Provide verifiable pricing without disclosure
- Maintain price audit trail

**State Variables**:
```solidity
bytes private encryptedPrice;
bytes public priceHash;
uint256 public lastPriceUpdate;
address public owner;

mapping(uint256 => PriceAuditEntry) public auditLog;

struct PriceAuditEntry {
  uint256 timestamp;
  bytes newEncryptedPrice;
  address updatedBy;
}
```

**Key Functions**:
- `setPriceEncrypted()`: Store encrypted price
- `calculateCostEncrypted()`: Cost calculation
- `verifyPrice()`: Price verification
- `getPriceHash()`: Verifiable price hash

## Data Flow

### Request Submission Flow

```
┌────────────────────┐
│  Client App        │
└────────────┬───────┘
             │ 1. Prepare data
             ▼
┌────────────────────┐
│  FHEVM Encryption  │
│  Library           │
└────────────┬───────┘
             │ 2. encryptedData
             ▼
┌────────────────────────────────────┐
│  GatewayTransaction.submitRequest() │
│  - Validate input                   │
│  - Store encrypted data             │
│  - Emit RequestSubmitted event      │
│  - Return requestId                 │
└────────────┬───────────────────────┘
             │ 3. RequestSubmitted event
             ▼
┌────────────────────┐
│  Off-Chain Gateway │
│  Service           │
│  (Event Listener)  │
└────────────┬───────┘
             │ 4. Detect event
             ▼
┌────────────────────────────────────┐
│  FHE Computation Engine            │
│  - Decrypt encryptedData           │
│  - Perform calculation             │
│  - Re-encrypt result               │
└────────────┬───────────────────────┘
             │ 5. Encrypted result
             ▼
┌────────────────────────────────────┐
│  GatewayTransaction.gatewayCallback│
│  - Verify sender is gateway        │
│  - Update request status           │
│  - Store encrypted result          │
│  - Emit RequestProcessed event     │
└────────────────────────────────────┘
```

### Refund Request Flow

```
┌────────────────────┐
│  Client or Owner   │
└────────────┬───────┘
             │ 1. requestRefund(requestId)
             ▼
┌────────────────────────────────────┐
│  GatewayTransaction.requestRefund() │
│  - Check request status             │
│  - Verify caller is requester       │
│  - Check timeout (if pending)       │
│  - Calculate refund amount          │
│  - Transfer funds                   │
│  - Update status to REFUNDED        │
└────────────┬───────────────────────┘
             │ 2. RefundProcessed event
             ▼
┌────────────────────┐
│  Refund Processed  │
└────────────────────┘
```

### Privacy Preservation Flow

```
Plaintext Input
       │
       ▼
    FHE Encryption
       │
       ├─────────────────┐
       │                 │
       ▼                 ▼
  On-Chain Storage  Off-Chain Computation
       │                 │
       └────────┬────────┘
                │
                ▼
           Encrypted Result
                │
                ▼
       Verified Decryption
       (Authorized Party Only)
```

## Gateway Callback Pattern

### Pattern Overview

The gateway callback pattern enables asynchronous computation on encrypted data:

```
Time
 │
 │  ┌─ Client submits request with encryptedData
 │  │
 │  ├─ Emit RequestSubmitted event (includes encryptedData)
 │  │
 │  ├─ Off-chain gateway service listens for events
 │  │
 │  ├─ Gateway performs computation on encryptedData
 │  │
 │  └─ Gateway calls gatewayCallback(requestId, encryptedResult)
 │
 ▼
```

### Benefits

1. **Non-Blocking**: Client not waiting for computation
2. **Off-Chain Computation**: Heavy lifting done off-chain
3. **Scalable**: Multiple requests processed in parallel
4. **Deterministic**: Results verifiable on-chain

### Implementation Details

**Gateway Requirements**:
- Must listen for `RequestSubmitted` events
- Must decrypt (via key derivation) and process encryptedData
- Must re-encrypt result before callback
- Must call gatewayCallback with correct requestId
- Must handle errors gracefully

**Security Considerations**:
- Verify gateway address before callback
- Ensure gateway has exclusive computation key
- Implement gateway response timeout
- Log all gateway activities for audit

## Request Lifecycle

### State Machine

```
                ┌─────────┐
                │ PENDING │
                └────┬────┘
                     │
      ┌──────────────┼──────────────┐
      │              │              │
      │ (Timeout)    │ (Gateway     │
      │              │  Processes)  │
      ▼              ▼              ▼
 ┌─────────┐   ┌────────────┐  ┌─────────┐
 │ REFUNDED │   │ PROCESSING │  │ REFUNDED│
 └─────────┘   └─────┬──────┘  └─────────┘
                      │ (Callback)
                      ▼
              ┌─────────────────┐
              │   COMPLETED     │
              │ (Result stored) │
              └─────────────────┘
```

### State Transitions

| From | To | Trigger | Conditions |
|------|----|---------|----|
| PENDING | PROCESSING | Gateway processes request | Gateway address must match |
| PENDING | REFUNDED | Timeout expires | Caller must be requester |
| PENDING | REFUNDED | Manual refund request | Caller must be requester |
| PROCESSING | COMPLETED | Gateway callback | Must be from gateway |
| PROCESSING | REFUNDED | Timeout expires during processing | Any user can trigger |

### Timeout Mechanism

**Timeout Trigger**: block.timestamp >= request.timeoutTime

**Timeout Actions**:
1. Request can transition to REFUNDED
2. Refund amount calculated from original submission value
3. Refund transferred to requester
4. Status changed to REFUNDED
5. TimeoutTriggered event emitted

**Key Properties**:
- Timeout immutable after submission
- Timeout duration specified at submission
- Timeout prevents indefinite waiting
- Automatic trigger not needed (pulled by user)

## Timeout Mechanism

### Purpose

The timeout mechanism serves three critical functions:

1. **Fund Recovery**: Users can recover funds if request stalls
2. **Progress Guarantee**: Ensures system eventually makes progress
3. **Determinism**: Prevents indefinite waiting

### Timeout Calculation

```solidity
request.timeoutTime = block.timestamp + timeoutDuration
```

### Timeout States

```
Submission Time          Timeout Time              Current Time
       │                      │                           │
       ├──────────────────────┼─────────────────────────────
       │   Active Period      │    Expired Period
       │   (Can Process)      │    (Can Refund)
       │                      │
    PENDING              PENDING/PROCESSING         REFUNDED (on demand)
  or PROCESSING
```

### Timeout Verification

```solidity
function isTimedOut(uint256 requestId) public view returns (bool) {
  return block.timestamp >= requests[requestId].timeoutTime;
}

function canRefund(uint256 requestId) public view returns (bool) {
  Request storage req = requests[requestId];
  return (req.status == RequestStatus.PENDING ||
          req.status == RequestStatus.PROCESSING) &&
         isTimedOut(requestId);
}
```

### Timeout Duration Selection

**Guidelines for Timeout Duration**:
- **Minimum**: 15 minutes (900 seconds) for fast operations
- **Standard**: 1 hour (3600 seconds) for typical operations
- **Maximum**: 24 hours (86400 seconds) for complex operations

**Factors to Consider**:
- Expected computation time
- Network congestion patterns
- Gateway reliability
- User tolerance for delays

### Timeout Edge Cases

1. **Block Timestamp Manipulation**: Limited by consensus rules
2. **Late Callbacks**: After timeout can still complete (up to contract)
3. **Multiple Refunds**: Prevented by state machine
4. **Partial Timeout**: Only affects that request

## Refund System

### Refund Mechanism

The refund system ensures users can recover funds under specific conditions:

### Refund Scenarios

```
Request Submitted (Value = X wei)
       │
       ├─ Scenario 1: Gateway processes normally
       │  └─ Result stored, no refund
       │
       ├─ Scenario 2: Timeout expires (request still PENDING)
       │  └─ User calls requestRefund()
       │     └─ Return X wei to requester
       │
       ├─ Scenario 3: Timeout expires (request PROCESSING)
       │  └─ User calls requestRefund()
       │     └─ Return X wei to requester
       │
       └─ Scenario 4: User manually cancels
          └─ Request must be PENDING
             └─ Return X wei to requester
```

### Refund Calculation

```solidity
function calculateRefundAmount(uint256 requestId)
  internal view returns (uint256)
{
  // Option 1: Full refund of original submission
  return requests[requestId].originalValue;

  // Option 2: Refund minus gas costs
  // uint256 gasUsed = (initialGas - gasleft());
  // uint256 gasCost = gasUsed * tx.gasprice;
  // return requests[requestId].originalValue - gasCost;
}
```

### Refund Authorization

Only the original requester can request refund:

```solidity
function requestRefund(uint256 requestId) external {
  require(
    msg.sender == requests[requestId].requester,
    "Not requester"
  );
  // ... refund logic
}
```

### Refund Failure Handling

If refund transfer fails:

```solidity
(bool success, ) = payable(requester).call{value: refundAmount}("");
require(success, "Refund failed");

// Alternative: Use Pull over Push pattern
refundBalance[requester] += refundAmount;
```

## Privacy Preservation

### Encryption Architecture

```
Data Privacy Layers:

Layer 1: Network Level
  ├─ HTTPS/TLS encryption in transit
  └─ Prevents man-in-the-middle attacks

Layer 2: Application Level (FHEVM)
  ├─ Client-side encryption before submission
  ├─ Fully Homomorphic Encryption scheme
  └─ Operations on encrypted data without decryption

Layer 3: Storage Level
  ├─ Encrypted data stored on-chain
  ├─ Only gateway has decryption capability
  └─ No plaintext data in contract state

Layer 4: Authorization Level
  ├─ Access control for sensitive operations
  ├─ Role-based permissions
  └─ Audit logging for all access
```

### FHE Integration Points

**Client Side (Frontend)**:
```javascript
// Using FHEVM library
const encryptedValue = await fhevm.encrypt(
  sensitiveData,
  encryptionPublicKey
);
```

**Contract Side**:
```solidity
// Store encrypted data
mapping(uint256 => bytes) public encryptedDataStorage;

// Never decrypt on-chain (except via gateway)
function receiveEncryptedData(bytes calldata encrypted) external {
  encryptedDataStorage[id] = encrypted;
  // Data remains encrypted - gateway will process it
}
```

**Gateway Side (Off-Chain)**:
```
1. Receive RequestSubmitted event
2. Retrieve encryptedData from event logs
3. Decrypt using private key (off-chain, secure)
4. Perform computation on plaintext
5. Re-encrypt result using public key
6. Submit encrypted result via gatewayCallback()
```

### Privacy Guarantees

**What is Private**:
- Actual data values (only encrypted values stored)
- Computation inputs (encrypted in contract)
- Computation results (encrypted until decrypted)
- Price information (PriceObfuscation contract)

**What is Observable** (by design):
- Request existence (requestId visible)
- Request status (PENDING, COMPLETED, etc.)
- Request count and frequency
- Timing of requests (timestamps)
- Gas usage

### Privacy Limitations

1. **Gateway Trust**: Gateway can see plaintext during decryption
2. **Timing Analysis**: Request timing patterns visible
3. **Frequency Analysis**: Number of requests is observable
4. **Size Analysis**: Encrypted data size can leak information

### Privacy Best Practices

1. Encrypt before sending to contract
2. Use unique encryption keys per request
3. Add dummy transactions to hide frequency
4. Use timeout to prevent timing analysis
5. Bundle requests to reduce frequency visibility

## Storage Layout

### Contract State Storage

**GatewayTransaction Storage**:
```solidity
// Slot 0
address public gatewayAddress;      // 20 bytes
address public owner;               // 20 bytes (packed)

// Slot 1
uint256 public requestCounter;      // 32 bytes

// Slot 2
uint256 public requestTimeout;      // 32 bytes

// Slot 3+
mapping(uint256 => Request) public requests;
// Each Request: ~200 bytes (varies by encrypted data size)
```

**Storage Optimization**:
```solidity
// Before: 4 storage slots
struct Request {
  address requester;        // 20 bytes
  uint256 submitTime;       // 32 bytes
  uint256 timeoutTime;      // 32 bytes
  RequestStatus status;     // 1 byte
  bytes encryptedData;      // Dynamic
  bytes result;             // Dynamic
  uint256 refundAmount;     // 32 bytes
}

// After: Can pack some fields
struct Request {
  address requester;        // 20 bytes (slot)
  RequestStatus status;     // 1 byte (slot, same)
  uint64 submitTime;        // 8 bytes (slot, same) - reduced range
  uint64 timeoutTime;       // 8 bytes (slot, same) - reduced range
  bytes encryptedData;      // Dynamic
  bytes result;             // Dynamic
  uint256 refundAmount;     // 32 bytes
}
```

### Gas Costs by Operation

| Operation | Gas | Notes |
|-----------|-----|-------|
| submitRequest | ~50,000 | Includes storage of encryptedData |
| gatewayCallback | ~60,000 | Includes storage of result |
| requestRefund | ~40,000 | Includes fund transfer |
| getRequestStatus | ~2,500 | Read-only, varies by data size |
| divideEncrypted | ~100,000 | FHE computation |
| validateRequest | ~15,000 | Signature verification |

### Storage Growth

**Estimated Storage per Request**:
- Fixed fields: ~100 bytes
- Encrypted data: Variable (typically 256-1024 bytes)
- Result: Variable (typically 256-512 bytes)
- Total per request: ~600-1600 bytes

**Annual Growth (1000 req/day)**:
```
Annual Requests: 365,000
Storage per Request: 1000 bytes (average)
Total Annual Storage: ~365 MB
Contract Storage: ~1000 slots (32 bytes each)
Annual Cost: Variable (depends on storage pricing model)
```

## Gas Optimization

### Key Optimization Strategies

1. **Packed Storage**: Group small variables
2. **Efficient Loops**: Minimize iterations
3. **Lazy Evaluation**: Calculate only when needed
4. **Caching**: Store computed values
5. **Batching**: Process multiple requests together

### Optimized Code Examples

**Before**: 3 storage operations
```solidity
function submitRequest(bytes calldata data) external returns (uint256) {
  uint256 id = requestCounter;
  requestCounter++;
  requests[id].requester = msg.sender;
  requests[id].submitTime = block.timestamp;
  requests[id].timeoutTime = block.timestamp + timeout;
  requests[id].status = RequestStatus.PENDING;
  requests[id].encryptedData = data;
  return id;
}
```

**After**: Consolidated storage
```solidity
function submitRequest(bytes calldata data) external returns (uint256) {
  uint256 id = requestCounter++;
  Request storage req = requests[id];
  req.requester = msg.sender;
  req.submitTime = uint64(block.timestamp);
  req.timeoutTime = uint64(block.timestamp) + uint64(timeout);
  req.status = RequestStatus.PENDING;
  req.encryptedData = data;
  return id;
}
```

### Gas Comparison

| Operation | Unoptimized | Optimized | Savings |
|-----------|-------------|-----------|---------|
| submitRequest | 65,000 | 48,000 | 26% |
| gatewayCallback | 75,000 | 58,000 | 23% |
| requestRefund | 52,000 | 40,000 | 23% |

---

**Document Version**: 1.0
**Last Updated**: November 2024
**Status**: Complete
