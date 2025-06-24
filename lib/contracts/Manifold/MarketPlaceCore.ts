export const MarketPlaceCoreABI = [
  {
    type: "constructor",
    inputs: [],
    stateMutability: "nonpayable"
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
    name: "Initialized",
    inputs: [
      { name: "version", type: "uint8", indexed: false }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "MarketplaceEnabled",
    inputs: [
      { name: "requestor", type: "address", indexed: false },
      { name: "value", type: "bool", indexed: false }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "MarketplaceFees",
    inputs: [
      { name: "requestor", type: "address", indexed: false },
      { name: "feeBPS", type: "uint16", indexed: false },
      { name: "referrerBPS", type: "uint16", indexed: false }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "MarketplaceRoyaltyEngineUpdate",
    inputs: [
      { name: "royaltyEngineV1", type: "address", indexed: false }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "MarketplaceSellerRegistry",
    inputs: [
      { name: "requestor", type: "address", indexed: false },
      { name: "registry", type: "address", indexed: false }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "MarketplaceWithdraw",
    inputs: [
      { name: "requestor", type: "address", indexed: false },
      { name: "erc20", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
      { name: "receiver", type: "address", indexed: false }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "MarketplaceWithdrawEscrow",
    inputs: [
      { name: "requestor", type: "address", indexed: false },
      { name: "erc20", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false }
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
    name: "accept",
    inputs: [
      { name: "listingId", type: "uint40" },
      { name: "addresses", type: "address[]" },
      { name: "amounts", type: "uint256[]" },
      { name: "maxAmount", type: "uint256" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "approveAdmin",
    inputs: [
      { name: "admin", type: "address" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "bid",
    inputs: [
      { name: "referrer", type: "address payable" },
      { name: "listingId", type: "uint40" },
      { name: "increase", type: "bool" },
      { name: "data", type: "bytes" }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "bid",
    inputs: [
      { name: "referrer", type: "address payable" },
      { name: "listingId", type: "uint40" },
      { name: "bidAmount", type: "uint256" },
      { name: "increase", type: "bool" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "bid",
    inputs: [
      { name: "listingId", type: "uint40" },
      { name: "bidAmount", type: "uint256" },
      { name: "increase", type: "bool" },
      { name: "data", type: "bytes" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "bid",
    inputs: [
      { name: "referrer", type: "address payable" },
      { name: "listingId", type: "uint40" },
      { name: "increase", type: "bool" }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "bid",
    inputs: [
      { name: "listingId", type: "uint40" },
      { name: "increase", type: "bool" },
      { name: "data", type: "bytes" }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "bid",
    inputs: [
      { name: "listingId", type: "uint40" },
      { name: "bidAmount", type: "uint256" },
      { name: "increase", type: "bool" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "bid",
    inputs: [
      { name: "listingId", type: "uint40" },
      { name: "increase", type: "bool" }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "bid",
    inputs: [
      { name: "referrer", type: "address payable" },
      { name: "listingId", type: "uint40" },
      { name: "bidAmount", type: "uint256" },
      { name: "increase", type: "bool" },
      { name: "data", type: "bytes" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "cancel",
    inputs: [
      { name: "listingId", type: "uint40" },
      { name: "holdbackBPS", type: "uint16" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "collect",
    inputs: [
      { name: "listingId", type: "uint40" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "createListing",
    inputs: [
      {
        name: "listingDetails",
        type: "tuple",
        components: [
          { name: "initialAmount", type: "uint256" },
          { name: "type_", type: "uint8" },
          { name: "totalAvailable", type: "uint24" },
          { name: "totalPerSale", type: "uint24" },
          { name: "extensionInterval", type: "uint16" },
          { name: "minIncrementBPS", type: "uint16" },
          { name: "erc20", type: "address" },
          { name: "identityVerifier", type: "address" },
          { name: "startTime", type: "uint48" },
          { name: "endTime", type: "uint48" }
        ]
      },
      {
        name: "tokenDetails",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "address_", type: "address" },
          { name: "spec", type: "uint8" },
          { name: "lazy", type: "bool" }
        ]
      },
      {
        name: "deliveryFees",
        type: "tuple",
        components: [
          { name: "deliverBPS", type: "uint16" },
          { name: "deliverFixed", type: "uint240" }
        ]
      },
      {
        name: "listingReceivers",
        type: "tuple[]",
        components: [
          { name: "receiver", type: "address payable" },
          { name: "receiverBPS", type: "uint16" }
        ]
      },
      { name: "enableReferrer", type: "bool" },
      { name: "acceptOffers", type: "bool" },
      { name: "data", type: "bytes" }
    ],
    outputs: [
      { name: "", type: "uint40" }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "feeBPS",
    inputs: [],
    outputs: [
      { name: "", type: "uint16" }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "finalize",
    inputs: [
      { name: "listingId", type: "uint40" }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "getAdmins",
    inputs: [],
    outputs: [
      { name: "admins", type: "address[]" }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getBids",
    inputs: [
      { name: "listingId", type: "uint40" }
    ],
    outputs: [
      {
        name: "bids",
        type: "tuple[]",
        components: [
          { name: "amount", type: "uint256" },
          { name: "bidder", type: "address payable" },
          { name: "delivered", type: "bool" },
          { name: "settled", type: "bool" },
          { name: "refunded", type: "bool" },
          { name: "timestamp", type: "uint48" },
          { name: "referrer", type: "address payable" }
        ]
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getListing",
    inputs: [
      { name: "listingId", type: "uint40" }
    ],
    outputs: [
      {
        name: "listing",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "seller", type: "address payable" },
          { name: "finalized", type: "bool" },
          { name: "totalSold", type: "uint24" },
          { name: "marketplaceBPS", type: "uint16" },
          { name: "referrerBPS", type: "uint16" },
          {
            name: "details",
            type: "tuple",
            components: [
              { name: "initialAmount", type: "uint256" },
              { name: "type_", type: "uint8" },
              { name: "totalAvailable", type: "uint24" },
              { name: "totalPerSale", type: "uint24" },
              { name: "extensionInterval", type: "uint16" },
              { name: "minIncrementBPS", type: "uint16" },
              { name: "erc20", type: "address" },
              { name: "identityVerifier", type: "address" },
              { name: "startTime", type: "uint48" },
              { name: "endTime", type: "uint48" }
            ]
          },
          {
            name: "token",
            type: "tuple",
            components: [
              { name: "id", type: "uint256" },
              { name: "address_", type: "address" },
              { name: "spec", type: "uint8" },
              { name: "lazy", type: "bool" }
            ]
          },
          {
            name: "receivers",
            type: "tuple[]",
            components: [
              { name: "receiver", type: "address payable" },
              { name: "receiverBPS", type: "uint16" }
            ]
          },
          {
            name: "fees",
            type: "tuple",
            components: [
              { name: "deliverBPS", type: "uint16" },
              { name: "deliverFixed", type: "uint240" }
            ]
          },
          {
            name: "bid",
            type: "tuple",
            components: [
              { name: "amount", type: "uint256" },
              { name: "bidder", type: "address payable" },
              { name: "delivered", type: "bool" },
              { name: "settled", type: "bool" },
              { name: "refunded", type: "bool" },
              { name: "timestamp", type: "uint48" },
              { name: "referrer", type: "address payable" }
            ]
          },
          { name: "offersAccepted", type: "bool" }
        ]
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getListingCurrentPrice",
    inputs: [
      { name: "listingId", type: "uint40" }
    ],
    outputs: [
      { name: "", type: "uint256" }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getListingDeliverFee",
    inputs: [
      { name: "listingId", type: "uint40" },
      { name: "price", type: "uint256" }
    ],
    outputs: [
      { name: "", type: "uint256" }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getListingTotalPrice",
    inputs: [
      { name: "listingId", type: "uint40" },
      { name: "count", type: "uint24" }
    ],
    outputs: [
      { name: "", type: "uint256" }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getOffers",
    inputs: [
      { name: "listingId", type: "uint40" }
    ],
    outputs: [
      {
        name: "offers",
        type: "tuple[]",
        components: [
          { name: "offerer", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "timestamp", type: "uint48" },
          { name: "accepted", type: "bool" }
        ]
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "initialize",
    inputs: [
      { name: "initialOwner", type: "address" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "isAdmin",
    inputs: [
      { name: "admin", type: "address" }
    ],
    outputs: [
      { name: "", type: "bool" }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "modifyListing",
    inputs: [
      { name: "listingId", type: "uint40" },
      { name: "initialAmount", type: "uint256" },
      { name: "startTime", type: "uint48" },
      { name: "endTime", type: "uint48" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "offer",
    inputs: [
      { name: "listingId", type: "uint40" },
      { name: "offerAmount", type: "uint256" },
      { name: "increase", type: "bool" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "offer",
    inputs: [
      { name: "listingId", type: "uint40" },
      { name: "offerAmount", type: "uint256" },
      { name: "increase", type: "bool" },
      { name: "data", type: "bytes" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "offer",
    inputs: [
      { name: "referrer", type: "address payable" },
      { name: "listingId", type: "uint40" },
      { name: "offerAmount", type: "uint256" },
      { name: "increase", type: "bool" },
      { name: "data", type: "bytes" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "offer",
    inputs: [
      { name: "referrer", type: "address payable" },
      { name: "listingId", type: "uint40" },
      { name: "increase", type: "bool" },
      { name: "data", type: "bytes" }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "offer",
    inputs: [
      { name: "listingId", type: "uint40" },
      { name: "increase", type: "bool" },
      { name: "data", type: "bytes" }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "offer",
    inputs: [
      { name: "listingId", type: "uint40" },
      { name: "increase", type: "bool" }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "offer",
    inputs: [
      { name: "referrer", type: "address payable" },
      { name: "listingId", type: "uint40" },
      { name: "offerAmount", type: "uint256" },
      { name: "increase", type: "bool" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "offer",
    inputs: [
      { name: "referrer", type: "address payable" },
      { name: "listingId", type: "uint40" },
      { name: "increase", type: "bool" }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "onERC1155Received",
    inputs: [
      { name: "operator", type: "address" },
      { name: "from", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "count", type: "uint256" },
      { name: "data", type: "bytes" }
    ],
    outputs: [
      { name: "", type: "bytes4" }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "onERC721Received",
    inputs: [
      { name: "operator", type: "address" },
      { name: "from", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "data", type: "bytes" }
    ],
    outputs: [
      { name: "", type: "bytes4" }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [
      { name: "", type: "address" }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "purchase",
    inputs: [
      { name: "referrer", type: "address" },
      { name: "listingId", type: "uint40" },
      { name: "count", type: "uint24" }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "purchase",
    inputs: [
      { name: "listingId", type: "uint40" }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "purchase",
    inputs: [
      { name: "listingId", type: "uint40" },
      { name: "count", type: "uint24" },
      { name: "data", type: "bytes" }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "purchase",
    inputs: [
      { name: "listingId", type: "uint40" },
      { name: "data", type: "bytes" }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "purchase",
    inputs: [
      { name: "referrer", type: "address" },
      { name: "listingId", type: "uint40" },
      { name: "data", type: "bytes" }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "purchase",
    inputs: [
      { name: "listingId", type: "uint40" },
      { name: "count", type: "uint24" }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "purchase",
    inputs: [
      { name: "referrer", type: "address" },
      { name: "listingId", type: "uint40" },
      { name: "count", type: "uint24" },
      { name: "data", type: "bytes" }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "purchase",
    inputs: [
      { name: "referrer", type: "address" },
      { name: "listingId", type: "uint40" }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "referrerBPS",
    inputs: [],
    outputs: [
      { name: "", type: "uint16" }
    ],
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
    name: "rescind",
    inputs: [
      { name: "listingIds", type: "uint40[]" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "rescind",
    inputs: [
      { name: "listingId", type: "uint40" },
      { name: "offerAddresses", type: "address[]" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "rescind",
    inputs: [
      { name: "listingId", type: "uint40" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "revokeAdmin",
    inputs: [
      { name: "admin", type: "address" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "setEnabled",
    inputs: [
      { name: "enabled", type: "bool" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "setFees",
    inputs: [
      { name: "marketplaceFeeBPS", type: "uint16" },
      { name: "marketplaceReferrerBPS", type: "uint16" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "setRoyaltyEngineV1",
    inputs: [
      { name: "royaltyEngineV1", type: "address" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "setSellerRegistry",
    inputs: [
      { name: "registry", type: "address" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "supportsInterface",
    inputs: [
      { name: "interfaceId", type: "bytes4" }
    ],
    outputs: [
      { name: "", type: "bool" }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "transferOwnership",
    inputs: [
      { name: "newOwner", type: "address" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "withdraw",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "receiver", type: "address payable" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "withdraw",
    inputs: [
      { name: "erc20", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "receiver", type: "address payable" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "withdrawEscrow",
    inputs: [
      { name: "erc20", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "withdrawEscrow",
    inputs: [
      { name: "amount", type: "uint256" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  }
] 