# DApp 150 - Complete API Reference

## Table of Contents

1. [GatewayTransaction Contract](#gatewaytransaction-contract)
2. [PrivacyPreservingDivision Contract](#privacypreservingdivision-contract)
3. [SecurityValidator Contract](#securityvalidator-contract)
4. [PriceObfuscation Contract](#priceobfuscation-contract)
5. [Events Reference](#events-reference)
6. [Error Codes](#error-codes)

---

## GatewayTransaction Contract

### Overview

The GatewayTransaction contract manages asynchronous encrypted requests and handles gateway callbacks with result delivery and refund mechanisms.

**Contract Address**: Will be provided upon deployment
**ABI**: See `contracts/GatewayTransaction.sol`

### State Variables

#### Public Variables

```solidity
address public gatewayAddress
```
- **Type**: address
- **Description**: Address of the authorized gateway service
- **Access**: Public, updatable by owner
- **Default**: Set during deployment

```solidity
address public owner
```
- **Type**: address
- **Description**: Contract owner with administrative privileges
- **Access**: Public, read-only after deployment
- **Default**: Deployment caller

```solidity
uint256 public requestCounter
```
- **Type**: uint256
- **Description**: Total number of requests submitted (ID counter)
- **Access**: Public, read-only
- **Default**: 0

```solidity
uint256 public requestTimeout
```
- **Type**: uint256
- **Description**: Default timeout duration in seconds
- **Access**: Public, updatable by owner
- **Default**: 3600 (1 hour)

```solidity
mapping(uint256 => Request) public requests
```
- **Type**: Mapping of requestId to Request struct
- **Description**: Storage for all submitted requests
- **Access**: Public (struct fields readable)

### Structs

#### Request

```solidity
struct Request {
  address requester;           // Original request submitter
  uint256 submitTime;          // Block timestamp of submission
  uint256 timeoutTime;         // Block timestamp of timeout
  RequestStatus status;        // Current request state
  bytes encryptedData;         // FHE-encrypted input data
  bytes result;                // FHE-encrypted result (after gateway callback)
  uint256 refundAmount;        // Amount to refund if cancelled
}
```

#### RequestStatus Enum

```solidity
enum RequestStatus {
  PENDING,       // 0 - Awaiting gateway processing
  PROCESSING,    // 1 - Being processed by gateway
  COMPLETED,     // 2 - Processing complete, result stored
  REFUNDED       // 3 - Refund issued, request cancelled
}
```

### Functions

#### submitRequest

Submit a new encrypted transaction request.

```solidity
function submitRequest(
  bytes calldata encryptedData,
  uint256 gasLimit,
  uint256 timeoutDuration
) external payable returns (uint256 requestId)
```

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| encryptedData | bytes | FHE-encrypted data for processing |
| gasLimit | uint256 | Maximum gas for callback execution |
| timeoutDuration | uint256 | Seconds until automatic timeout |

**Returns**:
| Name | Type | Description |
|------|------|-------------|
| requestId | uint256 | Unique identifier for this request |

**Events Emitted**:
- `RequestSubmitted(requestId, msg.sender, msg.value, block.timestamp)`

**Access**: Public (any address)

**Value**: Can include ETH payment (msg.value)

**Gas Cost**: ~50,000 - 65,000 gas (varies with data size)

**Validation**:
- encryptedData must not be empty
- gasLimit must be > 0
- timeoutDuration must be > 0

**Example**:
```javascript
// JavaScript/Ethers.js
const encryptedData = await fhevm.encrypt(sensitiveData);
const tx = await gatewayContract.submitRequest(
  encryptedData,
  100000,        // 100k gas for callback
  3600,          // 1 hour timeout
  { value: ethers.utils.parseEther("0.1") }
);
const receipt = await tx.wait();
const requestId = receipt.events[0].args.requestId;
```

---

#### gatewayCallback

Process gateway response and store encrypted result.

```solidity
function gatewayCallback(
  uint256 requestId,
  bytes calldata result
) external onlyGateway
```

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| requestId | uint256 | ID of request being processed |
| result | bytes | FHE-encrypted computation result |

**Events Emitted**:
- `RequestProcessed(requestId, block.timestamp)`

**Access**: Only callable by registered gateway address

**Gas Cost**: ~55,000 - 75,000 gas (varies with result size)

**Validation**:
- msg.sender must equal gatewayAddress
- requestId must exist
- request status must be PENDING
- result must not be empty

**State Changes**:
- Updates request status to PROCESSING
- Stores encrypted result
- Records completion timestamp

**Example**:
```javascript
// Off-chain gateway service
const result = await computeResult(requestId);
const encryptedResult = await fhevm.encrypt(result);
const tx = await gatewayContract.gatewayCallback(
  requestId,
  encryptedResult
);
await tx.wait();
```

---

#### requestRefund

Request refund for a pending or timed-out request.

```solidity
function requestRefund(uint256 requestId) external
```

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| requestId | uint256 | ID of request to refund |

**Events Emitted**:
- `RefundProcessed(requestId, refundAmount, msg.sender)`

**Access**: Public (but only requester can actually refund)

**Gas Cost**: ~38,000 - 52,000 gas (including transfer)

**Validation**:
- requestId must exist
- msg.sender must be original requester
- request status must be PENDING or PROCESSING
- if PENDING, timeout must have expired OR caller is owner
- sufficient contract balance for refund

**State Changes**:
- Updates request status to REFUNDED
- Transfers refund amount to requester
- Clears request data (optional optimization)

**Failure Handling**:
- Reverts if refund transfer fails
- Alternative: Uses pull pattern if transfer fails

**Example**:
```javascript
// After timeout expires
const [status, submitTime, timeoutTime] =
  await gatewayContract.getRequestStatus(requestId);

if (block.timestamp >= timeoutTime) {
  const tx = await gatewayContract.requestRefund(requestId);
  await tx.wait();
}
```

---

#### getRequestStatus

Query the status of a specific request.

```solidity
function getRequestStatus(uint256 requestId)
  external view
  returns (
    RequestStatus status,
    uint256 submitTime,
    uint256 timeoutTime
  )
```

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| requestId | uint256 | ID of request to query |

**Returns**:
| Name | Type | Description |
|------|------|-------------|
| status | RequestStatus | Current status (PENDING/PROCESSING/COMPLETED/REFUNDED) |
| submitTime | uint256 | Block timestamp when submitted |
| timeoutTime | uint256 | Block timestamp when timeout occurs |

**Access**: Public view (read-only)

**Gas Cost**: ~2,500 gas

**Example**:
```javascript
const [status, submitTime, timeoutTime] =
  await gatewayContract.getRequestStatus(123);

console.log(`Status: ${status}`);      // 0=PENDING, 1=PROCESSING, etc.
console.log(`Submitted: ${submitTime}`);
console.log(`Timeout: ${timeoutTime}`);
```

---

#### getRequestHistory

Retrieve complete request details.

```solidity
function getRequestHistory(uint256 requestId)
  external view
  returns (Request memory)
```

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| requestId | uint256 | ID of request to retrieve |

**Returns**:
- Complete Request struct with all fields

**Access**: Public view (read-only)

**Gas Cost**: ~3,000 gas + data reading

**Example**:
```javascript
const request = await gatewayContract.getRequestHistory(123);
console.log(request.requester);
console.log(request.status);
console.log(request.encryptedData);
console.log(request.result);
```

---

#### isTimedOut

Check if a request has exceeded its timeout.

```solidity
function isTimedOut(uint256 requestId)
  external view
  returns (bool)
```

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| requestId | uint256 | ID of request to check |

**Returns**:
| Name | Type | Description |
|------|------|-------------|
| - | bool | True if block.timestamp >= timeoutTime |

**Access**: Public view (read-only)

**Gas Cost**: ~2,000 gas

**Example**:
```javascript
const hasTimedOut = await gatewayContract.isTimedOut(123);
if (hasTimedOut) {
  await gatewayContract.requestRefund(123);
}
```

---

### Admin Functions

#### setGatewayAddress

Update the authorized gateway address.

```solidity
function setGatewayAddress(address newGateway) external onlyOwner
```

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| newGateway | address | New gateway address |

**Access**: Owner only

**Events Emitted**:
- `GatewayAddressUpdated(newGateway)`

**Example**:
```javascript
const newGatewayAddress = "0x...";
await gatewayContract.setGatewayAddress(newGatewayAddress);
```

---

#### setRequestTimeout

Update default timeout duration.

```solidity
function setRequestTimeout(uint256 newTimeout) external onlyOwner
```

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| newTimeout | uint256 | New timeout duration in seconds |

**Access**: Owner only

**Events Emitted**:
- `TimeoutUpdated(newTimeout)`

**Example**:
```javascript
await gatewayContract.setRequestTimeout(7200); // 2 hours
```

---

## PrivacyPreservingDivision Contract

### Overview

Performs encrypted division operations on FHE-encrypted data without decryption.

**Contract Address**: Will be provided upon deployment
**ABI**: See `contracts/PrivacyPreservingDivision.sol`

### Functions

#### divideEncrypted

Perform division on encrypted data.

```solidity
function divideEncrypted(
  bytes calldata encryptedNumerator,
  bytes calldata encryptedDenominator
) external returns (
  bytes memory quotient,
  bytes memory remainder
)
```

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| encryptedNumerator | bytes | FHE-encrypted dividend |
| encryptedDenominator | bytes | FHE-encrypted divisor |

**Returns**:
| Name | Type | Description |
|------|------|-------------|
| quotient | bytes | FHE-encrypted quotient result |
| remainder | bytes | FHE-encrypted remainder result |

**Access**: Public (any address)

**Gas Cost**: ~95,000 - 115,000 gas

**Validation**:
- Both parameters must not be empty
- Denominator must be validated as non-zero

**Security Properties**:
- No division by zero (validated before operation)
- Results remain encrypted
- Original values never exposed

**Example**:
```javascript
// 100 / 3 = 33 remainder 1 (all encrypted)
const encNum = await fhevm.encrypt(100);
const encDen = await fhevm.encrypt(3);

const [quotient, remainder] =
  await divisionContract.divideEncrypted(encNum, encDen);

// Both quotient and remainder are encrypted
console.log(quotient);   // encrypted(33)
console.log(remainder);  // encrypted(1)
```

---

#### validateDivisor

Check if divisor is valid (non-zero).

```solidity
function validateDivisor(bytes calldata encryptedDivisor)
  external view
  returns (bool isValid)
```

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| encryptedDivisor | bytes | FHE-encrypted value to validate |

**Returns**:
| Name | Type | Description |
|------|------|-------------|
| isValid | bool | True if divisor is non-zero |

**Access**: Public view (read-only)

**Gas Cost**: ~8,000 gas

**Note**: This function performs a homomorphic test for zero without decryption.

---

#### getResultProof

Generate zero-knowledge proof of computation correctness.

```solidity
function getResultProof(
  bytes calldata numerator,
  bytes calldata denominator,
  bytes calldata quotient,
  bytes calldata remainder
) external view returns (bytes memory proof)
```

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| numerator | bytes | Original encrypted numerator |
| denominator | bytes | Original encrypted denominator |
| quotient | bytes | Computed encrypted quotient |
| remainder | bytes | Computed encrypted remainder |

**Returns**:
| Name | Type | Description |
|------|------|-------------|
| proof | bytes | Zero-knowledge proof of correctness |

**Access**: Public view (read-only)

**Gas Cost**: ~12,000 gas

**Verification**:
Proof can be verified off-chain without revealing values.

---

## SecurityValidator Contract

### Overview

Validates request signatures and enforces security policies.

**Contract Address**: Will be provided upon deployment
**ABI**: See `contracts/SecurityValidator.sol`

### Functions

#### validateRequest

Perform full validation on a request.

```solidity
function validateRequest(
  bytes calldata requestData,
  bytes calldata signature
) external view returns (bool isValid)
```

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| requestData | bytes | Encoded request details |
| signature | bytes | ECDSA signature from sender |

**Returns**:
| Name | Type | Description |
|------|------|-------------|
| isValid | bool | True if all checks pass |

**Access**: Public view (read-only)

**Gas Cost**: ~15,000 gas

**Validation Checks**:
1. Signature validity (ECDSA)
2. Sender authorization status
3. Nonce not previously used
4. Request timestamp freshness
5. Request frequency limits
6. No permission violations

**Example**:
```javascript
// Create and sign request
const requestData = ethers.utils.defaultAbiCoder.encode(
  ['address', 'uint256', 'bytes'],
  [requester, amount, data]
);

const dataHash = ethers.utils.solidityKeccak256(
  ['bytes'],
  [requestData]
);

const signature = await signer.signMessage(
  ethers.utils.arrayify(dataHash)
);

const isValid = await validator.validateRequest(
  requestData,
  signature
);
```

---

#### verifySignature

Verify ECDSA signature.

```solidity
function verifySignature(
  bytes calldata data,
  bytes calldata signature,
  address expectedSigner
) external pure returns (bool)
```

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| data | bytes | Signed data |
| signature | bytes | Signature bytes |
| expectedSigner | address | Expected signer address |

**Returns**:
| Name | Type | Description |
|------|------|-------------|
| - | bool | True if signature is valid |

**Access**: Public pure (read-only)

**Gas Cost**: ~3,000 gas

---

#### checkPermissions

Verify caller has required permissions.

```solidity
function checkPermissions(
  address caller,
  bytes32 permission
) external view returns (bool)
```

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| caller | address | Address to check |
| permission | bytes32 | Required permission ID |

**Returns**:
| Name | Type | Description |
|------|------|-------------|
| - | bool | True if caller has permission |

**Access**: Public view (read-only)

**Gas Cost**: ~2,500 gas

---

#### recordAuditLog

Log a security event (for audit trail).

```solidity
function recordAuditLog(
  address actor,
  string calldata action,
  bool success
) external
```

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| actor | address | Address performing action |
| action | string | Description of action |
| success | bool | Whether action succeeded |

**Events Emitted**:
- `AuditLogRecorded(actor, action, success, block.timestamp)`

**Access**: Internal (can be called by authorized contracts)

---

## PriceObfuscation Contract

### Overview

Manages encrypted pricing without revealing actual prices.

**Contract Address**: Will be provided upon deployment
**ABI**: See `contracts/PriceObfuscation.sol`

### Functions

#### setPriceEncrypted

Store encrypted price.

```solidity
function setPriceEncrypted(
  bytes calldata encryptedPrice,
  bytes calldata priceProof
) external onlyOwner
```

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| encryptedPrice | bytes | FHE-encrypted price value |
| priceProof | bytes | Zero-knowledge proof of valid price |

**Events Emitted**:
- `PriceUpdated(block.timestamp, priceHash)`

**Access**: Owner only

**Gas Cost**: ~42,000 - 58,000 gas

**Validation**:
- encryptedPrice must not be empty
- priceProof must be valid
- Price must be within reasonable bounds (verified by proof)

**Example**:
```javascript
const priceValue = 1000; // wei
const encryptedPrice = await fhevm.encrypt(priceValue);
const proof = await generatePriceProof(priceValue);

await priceObfuscation.setPriceEncrypted(encryptedPrice, proof);
```

---

#### calculateCostEncrypted

Calculate cost on encrypted data.

```solidity
function calculateCostEncrypted(
  bytes calldata encryptedQuantity
) external view returns (bytes memory encryptedCost)
```

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| encryptedQuantity | bytes | FHE-encrypted quantity |

**Returns**:
| Name | Type | Description |
|------|------|-------------|
| encryptedCost | bytes | FHE-encrypted cost (quantity * price) |

**Access**: Public view (read-only)

**Gas Cost**: ~18,000 gas

**Properties**:
- Actual price never revealed
- Actual quantity never revealed
- Only cost is visible (in encrypted form)

**Example**:
```javascript
const encQuantity = await fhevm.encrypt(5);
const encCost = await priceObfuscation.calculateCostEncrypted(encQuantity);
// Cost: encrypted(5 * price)
```

---

#### verifyPrice

Prove price correctness without disclosure.

```solidity
function verifyPrice(
  bytes calldata proof
) external view returns (bool isValid)
```

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| proof | bytes | Zero-knowledge proof of price |

**Returns**:
| Name | Type | Description |
|------|------|-------------|
| isValid | bool | True if price proof is valid |

**Access**: Public view (read-only)

**Gas Cost**: ~8,000 gas

---

#### getPriceHash

Get verifiable price hash.

```solidity
function getPriceHash() external view returns (bytes32)
```

**Returns**:
| Name | Type | Description |
|------|------|-------------|
| - | bytes32 | Keccak256 hash of encrypted price |

**Access**: Public view (read-only)

**Gas Cost**: ~500 gas

**Use Case**: Compare price versions without revealing values

---

## Events Reference

### GatewayTransaction Events

#### RequestSubmitted

```solidity
event RequestSubmitted(
  uint256 indexed requestId,
  address indexed requester,
  uint256 amount,
  uint256 timestamp
)
```

**Emitted when**: New request submitted

**Use cases**:
- Gateway listens for this to know about new requests
- Frontend confirms submission
- Audit trail

---

#### RequestProcessed

```solidity
event RequestProcessed(
  uint256 indexed requestId,
  uint256 timestamp
)
```

**Emitted when**: Gateway callback received

**Use cases**:
- Notify requester of completion
- Update UI status
- Trigger next steps

---

#### RefundProcessed

```solidity
event RefundProcessed(
  uint256 indexed requestId,
  uint256 amount,
  address indexed requester
)
```

**Emitted when**: Refund completed

**Use cases**:
- Confirm refund to user
- Verify funds returned
- Dispute resolution

---

#### TimeoutTriggered

```solidity
event TimeoutTriggered(
  uint256 indexed requestId,
  uint256 timeoutTime
)
```

**Emitted when**: Request times out (on refund)

**Use cases**:
- Alert user of timeout
- Monitor gateway reliability
- Debug stuck requests

---

## Error Codes

### Common Revert Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `"Invalid request ID"` | requestId doesn't exist | Check request ID is correct |
| `"Not authorized"` | Caller not gateway/owner | Use correct account |
| `"Request not pending"` | Can't process completed request | Wait or check status first |
| `"Timeout not reached"` | Can't refund yet | Wait for timeout or check timestamp |
| `"Refund failed"` | Transfer reverted | Check contract has sufficient balance |
| `"Divisor is zero"` | Division by zero attempted | Validate divisor first |
| `"Invalid signature"` | Signature verification failed | Sign with correct private key |
| `"Empty data"` | Required bytes parameter is empty | Provide non-empty data |

### Error Handling Pattern

```javascript
try {
  const tx = await contract.submitRequest(data, gasLimit, timeout);
  await tx.wait();
} catch (error) {
  if (error.message.includes("Invalid request ID")) {
    console.error("Request ID doesn't exist");
  } else if (error.message.includes("Refund failed")) {
    console.error("Refund transfer failed, retrying...");
  } else {
    console.error("Unknown error:", error.message);
  }
}
```

---

**Document Version**: 1.0
**Last Updated**: November 2024
**Status**: Complete
