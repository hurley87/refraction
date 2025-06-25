export const ERC1155CreatorCoreABI = [
  {
    type: "constructor",
    inputs: [
      { name: "initialOwner", type: "address", internalType: "address" },
      { name: "delegationRegistry", type: "address", internalType: "address" },
      { name: "delegationRegistryV2", type: "address", internalType: "address" }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "error",
    name: "ClaimInactive",
    inputs: []
  },
  {
    type: "error", 
    name: "ExpiredSignature",
    inputs: []
  },
  {
    type: "error",
    name: "FailedToTransfer",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidInput",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidSignature", 
    inputs: []
  },
  {
    type: "error",
    name: "MustUseSignatureMinting",
    inputs: []
  },
  {
    type: "error",
    name: "TooManyRequested",
    inputs: []
  },
  {
    type: "event",
    name: "AdminApproved",
    inputs: [
      { name: "account", type: "address", indexed: true },
      { name: "sender", type: "address", indexed: true }
    ],
    anonymous: false
  },
  {
    type: "event", 
    name: "AdminRevoked",
    inputs: [
      { name: "account", type: "address", indexed: true },
      { name: "sender", type: "address", indexed: true }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "ClaimInitialized",
    inputs: [
      { name: "creatorContract", type: "address", indexed: true },
      { name: "instanceId", type: "uint256", indexed: true },
      { name: "initializer", type: "address", indexed: false }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "ClaimMint",
    inputs: [
      { name: "creatorContract", type: "address", indexed: true },
      { name: "instanceId", type: "uint256", indexed: true }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "ClaimMintBatch",
    inputs: [
      { name: "creatorContract", type: "address", indexed: true },
      { name: "instanceId", type: "uint256", indexed: true },
      { name: "mintCount", type: "uint16", indexed: false }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "ClaimMintProxy",
    inputs: [
      { name: "creatorContract", type: "address", indexed: true },
      { name: "instanceId", type: "uint256", indexed: true },
      { name: "mintCount", type: "uint16", indexed: false },
      { name: "proxy", type: "address", indexed: false },
      { name: "mintFor", type: "address", indexed: false }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "ClaimMintSignature",
    inputs: [
      { name: "creatorContract", type: "address", indexed: true },
      { name: "instanceId", type: "uint256", indexed: true },
      { name: "mintCount", type: "uint16", indexed: false },
      { name: "proxy", type: "address", indexed: false },
      { name: "mintFor", type: "address", indexed: false },
      { name: "nonce", type: "bytes32", indexed: false }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "ClaimUpdated",
    inputs: [
      { name: "creatorContract", type: "address", indexed: true },
      { name: "instanceId", type: "uint256", indexed: true }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      { name: "previousOwner", type: "address", indexed: true },
      { name: "newOwner", type: "address", indexed: true }
    ],
    anonymous: false
  },
  {
    type: "function",
    name: "DELEGATION_REGISTRY",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "DELEGATION_REGISTRY_V2",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "MEMBERSHIP_ADDRESS",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "MINT_FEE",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "MINT_FEE_MERKLE",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "airdrop",
    inputs: [
      { name: "creatorContractAddress", type: "address" },
      { name: "instanceId", type: "uint256" },
      { name: "recipients", type: "address[]" },
      { name: "amounts", type: "uint256[]" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "approveAdmin",
    inputs: [{ name: "admin", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "checkMintIndex",
    inputs: [
      { name: "creatorContractAddress", type: "address" },
      { name: "instanceId", type: "uint256" },
      { name: "mintIndex", type: "uint32" }
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "checkMintIndices",
    inputs: [
      { name: "creatorContractAddress", type: "address" },
      { name: "instanceId", type: "uint256" },
      { name: "mintIndices", type: "uint32[]" }
    ],
    outputs: [{ name: "minted", type: "bool[]" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "extendTokenURI",
    inputs: [
      { name: "creatorContractAddress", type: "address" },
      { name: "instanceId", type: "uint256" },
      { name: "locationChunk", type: "string" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "getAdmins",
    inputs: [],
    outputs: [{ name: "admins", type: "address[]" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getClaim",
    inputs: [
      { name: "creatorContractAddress", type: "address" },
      { name: "instanceId", type: "uint256" }
    ],
    outputs: [{
      name: "claim",
      type: "tuple",
      components: [
        { name: "total", type: "uint32" },
        { name: "totalMax", type: "uint32" },
        { name: "walletMax", type: "uint32" },
        { name: "startDate", type: "uint48" },
        { name: "endDate", type: "uint48" },
        { name: "storageProtocol", type: "uint8" },
        { name: "merkleRoot", type: "bytes32" },
        { name: "location", type: "string" },
        { name: "tokenId", type: "uint256" },
        { name: "cost", type: "uint256" },
        { name: "paymentReceiver", type: "address" },
        { name: "erc20", type: "address" },
        { name: "signingAddress", type: "address" }
      ]
    }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getClaimForToken",
    inputs: [
      { name: "creatorContractAddress", type: "address" },
      { name: "tokenId", type: "uint256" }
    ],
    outputs: [
      { name: "instanceId", type: "uint256" },
      {
        name: "claim",
        type: "tuple",
        components: [
          { name: "total", type: "uint32" },
          { name: "totalMax", type: "uint32" },
          { name: "walletMax", type: "uint32" },
          { name: "startDate", type: "uint48" },
          { name: "endDate", type: "uint48" },
          { name: "storageProtocol", type: "uint8" },
          { name: "merkleRoot", type: "bytes32" },
          { name: "location", type: "string" },
          { name: "tokenId", type: "uint256" },
          { name: "cost", type: "uint256" },
          { name: "paymentReceiver", type: "address" },
          { name: "erc20", type: "address" },
          { name: "signingAddress", type: "address" }
        ]
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getTotalMints",
    inputs: [
      { name: "minter", type: "address" },
      { name: "creatorContractAddress", type: "address" },
      { name: "instanceId", type: "uint256" }
    ],
    outputs: [{ name: "", type: "uint32" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "initializeClaim",
    inputs: [
      { name: "creatorContractAddress", type: "address" },
      { name: "instanceId", type: "uint256" },
      {
        name: "claimParameters",
        type: "tuple",
        components: [
          { name: "totalMax", type: "uint32" },
          { name: "walletMax", type: "uint32" },
          { name: "startDate", type: "uint48" },
          { name: "endDate", type: "uint48" },
          { name: "storageProtocol", type: "uint8" },
          { name: "merkleRoot", type: "bytes32" },
          { name: "location", type: "string" },
          { name: "cost", type: "uint256" },
          { name: "paymentReceiver", type: "address" },
          { name: "erc20", type: "address" },
          { name: "signingAddress", type: "address" }
        ]
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "isAdmin",
    inputs: [{ name: "admin", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "mint",
    inputs: [
      { name: "creatorContractAddress", type: "address" },
      { name: "instanceId", type: "uint256" },
      { name: "mintIndex", type: "uint32" },
      { name: "merkleProof", type: "bytes32[]" },
      { name: "mintFor", type: "address" }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "mintBatch",
    inputs: [
      { name: "creatorContractAddress", type: "address" },
      { name: "instanceId", type: "uint256" },
      { name: "mintCount", type: "uint16" },
      { name: "mintIndices", type: "uint32[]" },
      { name: "merkleProofs", type: "bytes32[][]" },
      { name: "mintFor", type: "address" }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "mintProxy",
    inputs: [
      { name: "creatorContractAddress", type: "address" },
      { name: "instanceId", type: "uint256" },
      { name: "mintCount", type: "uint16" },
      { name: "mintIndices", type: "uint32[]" },
      { name: "merkleProofs", type: "bytes32[][]" },
      { name: "mintFor", type: "address" }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "mintSignature",
    inputs: [
      { name: "creatorContractAddress", type: "address" },
      { name: "instanceId", type: "uint256" },
      { name: "mintCount", type: "uint16" },
      { name: "signature", type: "bytes" },
      { name: "message", type: "bytes32" },
      { name: "nonce", type: "bytes32" },
      { name: "mintFor", type: "address" },
      { name: "expiration", type: "uint256" }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "renounceOwnership",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "revokeAdmin",
    inputs: [{ name: "admin", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "setMembershipAddress",
    inputs: [{ name: "membershipAddress", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "supportsInterface",
    inputs: [{ name: "interfaceId", type: "bytes4" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "tokenURI",
    inputs: [
      { name: "creatorContractAddress", type: "address" },
      { name: "tokenId", type: "uint256" }
    ],
    outputs: [{ name: "uri", type: "string" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "transferOwnership",
    inputs: [{ name: "newOwner", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "updateClaim",
    inputs: [
      { name: "creatorContractAddress", type: "address" },
      { name: "instanceId", type: "uint256" },
      {
        name: "claimParameters",
        type: "tuple",
        components: [
          { name: "totalMax", type: "uint32" },
          { name: "walletMax", type: "uint32" },
          { name: "startDate", type: "uint48" },
          { name: "endDate", type: "uint48" },
          { name: "storageProtocol", type: "uint8" },
          { name: "merkleRoot", type: "bytes32" },
          { name: "location", type: "string" },
          { name: "cost", type: "uint256" },
          { name: "paymentReceiver", type: "address" },
          { name: "erc20", type: "address" },
          { name: "signingAddress", type: "address" }
        ]
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "updateTokenURIParams",
    inputs: [
      { name: "creatorContractAddress", type: "address" },
      { name: "instanceId", type: "uint256" },
      { name: "storageProtocol", type: "uint8" },
      { name: "location", type: "string" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "withdraw",
    inputs: [
      { name: "receiver", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  }
] as const;