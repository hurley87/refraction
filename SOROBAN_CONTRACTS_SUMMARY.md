# Soroban Contracts Summary

## Simple Payment Contract

### Purpose

A lightweight Soroban smart contract that enables sending XLM (native Stellar asset) from the contract's balance to recipients. Used for distributing rewards or payments.

### Key Functions

**`send(recipient, amount)` / `transfer()` / `pay()`**

- Transfers XLM from the contract to a recipient address
- Amount is specified in stroops (1 XLM = 10,000,000 stroops)
- Validates that the recipient is not the contract itself
- Validates that the amount is positive
- Checks that the contract has sufficient balance before transferring
- Anyone can call this function

**`send_with_native_address(native_asset_address, recipient, amount)`**

- Same functionality as `send()`, but accepts the XLM native asset contract address as a parameter
- Allows the contract to work across different networks (testnet, mainnet, futurenet) without code changes
- The XLM contract address is network-specific and can be obtained using:
  ```bash
  soroban contract id asset --asset native --network <network>
  ```

### Key Features

- **Open Access**: Anyone can trigger payments from the contract
- **Balance Validation**: Checks contract balance before attempting transfers
- **Network Flexibility**: Supports explicit native asset address for cross-network compatibility
- **Security**: Prevents self-transfers and validates all inputs

### Usage

The contract must be funded with XLM before it can send to recipients. Once funded, users can call `send()` or `send_with_native_address()` to distribute XLM from the contract's balance.

---

## NFT Collection Contract

### Purpose

A Soroban smart contract for minting NFTs (tickets/passes) with integrated payment processing. Users pay 0.01 XLM to mint an NFT, and the contract owner can withdraw collected payments.

### Key Functions

**`__constructor(owner, native_asset_address, max_supply)`**

- Initializes the NFT contract with metadata (name, symbol, URI)
- Sets the contract owner (for administrative functions)
- Stores the XLM native asset contract address
- Sets the maximum supply of NFTs (0 = unlimited)
- Initializes the supply counter to 0

**`mint(to)`**

- Mints a new NFT to the specified recipient address
- Automatically charges 0.01 XLM (100,000 stroops) from the recipient as payment
- Requires the recipient to authorize the transaction (sign it)
- Returns the sequential token ID of the newly minted NFT
- Validates recipient address and checks supply cap
- Any user can call this function (after authorization)

**`withdraw(amount)`**

- Allows the contract owner to withdraw XLM collected from minting fees
- If `amount` is `None`, withdraws all available balance
- Only the contract owner can call this function
- Validates balance before transferring

### Key Features

- **Payment on Mint**: Automatically charges 0.01 XLM per NFT minted
- **Sequential Token IDs**: NFTs are minted with sequential IDs starting from 1
- **Supply Control**: Optional maximum supply cap (can be unlimited)
- **Owner Withdrawal**: Contract owner can withdraw collected minting fees
- **Authorization Required**: Recipients must authorize transactions, ensuring they are paying for the mint
- **Standard NFT Interface**: Implements `NonFungibleToken` and `NonFungibleBurnable` traits for full NFT functionality

### Metadata

- **Name**: "IRL Test Collection"
- **Symbol**: "IRL001"
- **URI**: IPFS hash for metadata storage

### Usage Flow

1. Contract is deployed and initialized with owner address and max supply
2. Users call `mint(to)` with their address, authorizing the transaction
3. Contract transfers 0.01 XLM from user to contract as payment
4. Contract mints NFT with sequential ID to the user's address
5. Owner can periodically call `withdraw()` to collect accumulated fees

### Troubleshooting

**Error: `Error(Storage, MissingValue)` - "trying to get non-existing value for contract instance"**

This error occurs when the NFT contract tries to access instance storage that hasn't been initialized. Common causes:

1. **Contract Not Initialized**: The `__constructor()` function must be called after deployment to set up:
   - Native asset address
   - Maximum supply
   - Initial supply counter
   - Contract owner

2. **Storage TTL Expired**: Soroban instance storage has a Time-To-Live (TTL). If the TTL expires, storage values are removed. The constructor must be called again to reinitialize, or storage must be extended before expiration.

3. **Missing Native Asset Address**: The contract requires the XLM native asset contract address to be stored. This must be set during initialization. Get the XLM contract address for your network:
   ```bash
   soroban contract id asset --asset native --network testnet
   ```

**Solution**: Ensure the contract's `__constructor()` has been called after deployment with valid parameters (owner address, native asset address, max supply). If storage TTL expired, call the constructor again or extend the storage TTL before calling `mint()`.

---

## Common Characteristics

Both contracts:

- Are written in Rust using the Soroban SDK
- Interact with the XLM native asset using the token interface
- Use stroops as the unit of measurement (1 XLM = 10,000,000 stroops)
- Validate inputs and handle edge cases with panic messages
- Work across different Stellar networks (testnet, mainnet, futurenet)
- Store network-specific XLM native asset contract addresses
