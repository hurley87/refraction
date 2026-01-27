# NFT Collection Contract

A Soroban smart contract for non-fungible tokens (NFTs) using the OpenZeppelin Stellar Contracts library. This contract implements a sequential minting NFT collection where any user can mint NFTs (with a 1 XLM payment per mint), transfer, and burn capabilities.

## Contract Functions

### Public Functions

- `mint(to: Address) -> u32` - Mint a new NFT to the specified address. Returns the token ID. Any user can call this function. The function automatically transfers 1 XLM (10,000,000 stroops) from the recipient (`to`) to the contract as payment. The recipient must authorize the transaction (sign it).

### Standard NFT Functions

The contract implements the standard NonFungibleToken interface from OpenZeppelin:

- `transfer(from: Address, to: Address, token_id: u32)` - Transfer an NFT from one address to another
- `burn(owner: Address, token_id: u32)` - Burn (destroy) an NFT
- `balance(owner: Address) -> u32` - Get the number of NFTs owned by an address
- `owner_of(token_id: u32) -> Address` - Get the owner of a specific token ID
- `name() -> String` - Get the collection name
- `symbol() -> String` - Get the collection symbol
- `total_supply() -> u32` - Get the total number of minted tokens

## Prerequisites

1. Install Rust: https://www.rust-lang.org/tools/install
2. Install required development libraries:

   ```bash
   # On Ubuntu/Debian:
   sudo apt-get install libssl-dev libdbus-1-dev libudev-dev pkg-config build-essential

   # On Fedora/RHEL:
   sudo dnf install openssl-devel dbus-devel systemd-devel pkg-config gcc

   # On macOS (with Homebrew):
   brew install openssl dbus pkg-config
   ```

3. Install Soroban CLI:
   ```bash
   cargo install --locked soroban-cli
   ```
4. Add the Soroban WASM target:
   ```bash
   rustup target add wasm32v1-none
   ```

## Security Considerations

### Storage TTL Management

This contract uses **instance storage** for critical data:

- Native asset address
- Maximum supply
- Current supply counter

**Important:** Instance storage entries in Soroban have a Time-To-Live (TTL) and may expire unless explicitly extended. If storage entries expire, the contract may fail to function correctly.

**Recommendations:**

- Monitor storage TTL for instance storage entries
- Extend TTL before entries expire if needed
- For production deployments, consider implementing a maintenance function to extend TTLs
- Document TTL requirements in your deployment procedures

**Current SDK Version:**

- `soroban-sdk = "23.4"` - Current stable version compatible with OpenZeppelin v0.6.0
- Periodically check for SDK updates: `cargo search soroban-sdk`
- Before upgrading, verify compatibility with OpenZeppelin contracts

# upload nft image to pinata, copy the cid to insert into the "url" key in the metadata file

# update /soroban-contracts/nft_collection/metadata.json with your collection info

# update /src/lib.rs constructor with your collection info

#ie.

# String::from_str(e, "ipfs://bafkreigyr5cezc5v7eug4nad7jolyvvp3szwm2oh3njxbeqxozj66zbwdm"),

# String::from_str(e, "IRL Test Collection"),

# String::from_str(e, "IRL001"),

## Building the Contract

```bash
cd soroban-contracts/nft_collection
soroban contract build
```

This will create a `.wasm` file in the `target/wasm32v1-none/release/` directory.

**Note:** If you're building manually with `cargo`, use:

```bash
cargo build --target wasm32v1-none --release
```

## Deploying the Contract

### To Testnet

1. Fund a test account using Friendbot:

   ```bash
   curl "https://friendbot.stellar.org/?addr=YOUR_ACCOUNT_ADDRESS"
   ```

2. Get the XLM native asset contract address for your network:

```bash
soroban contract id asset --asset native --network testnet
```

This will return an address starting with 'C' (e.g., `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`)

3. Deploy the contract (the constructor will be called automatically during deployment):

   ```bash
   soroban contract deploy \
     --wasm target/wasm32v1-none/release/nft_collection.wasm \
     --source SECRET_KEY \
     --network testnet \
     -- --owner GBPOXKFVX4BRAQHMNE66EWKPVQRE6ZR3P4WQGKIA4WUFVX7K3NN6SWA6 \
        --native_asset_address CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC \
        --max_supply 10000
   ```

   **Important:**

   - Replace `GBPOXKFVX4BRAQHMNE66EWKPVQRE6ZR3P4WQGKIA4WUFVX7K3NN6SWA6` with your actual Stellar account address (starts with 'G', 56 characters)
   - Replace `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` with the XLM contract address from step 2
   - Replace `10000` with your desired maximum supply (use `0` for unlimited)
   - The `--` separator is required before constructor arguments
   - The constructor is automatically called during deployment, so you don't need a separate initialization step

4. Save the contract ID that is returned from step 2 - you'll need it to interact with the contract.

   **Note:** The contract is already initialized during deployment, so no separate initialization step is needed.

### To Futurenet

1. Get the XLM native asset contract address:

   ```bash
   soroban contract id asset --asset native --network futurenet
   ```

2. Deploy the contract:

   ```bash
   soroban contract deploy \
     --wasm target/wasm32v1-none/release/nft_collection.wasm \
     --source YOUR_SECRET_KEY \
     --network futurenet \
     -- --owner GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX \
        --native_asset_address CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX \
        --max_supply 10000
   ```

   Replace the addresses and max_supply value as needed.

### To Mainnet

**⚠️ IMPORTANT: Mainnet deployments use real XLM. Test thoroughly on testnet first!**

1. Get the XLM native asset contract address for mainnet:

   ```bash
   soroban contract id asset --asset native --network mainnet
   ```

2. Make sure your account is funded with XLM (minimum ~2-3 XLM for deployment fees)

3. Deploy the contract:

   ```bash
   soroban contract deploy \
     --wasm target/wasm32v1-none/release/nft_collection.wasm \
     --source YOUR_SECRET_KEY \
     --network mainnet \
     -- --owner YOUR_STELLAR_ADDRESS \
        --native_asset_address MAINNET_XLM_CONTRACT_ADDRESS \
        --max_supply 10000
   ```

   **Replace:**

   - `YOUR_SECRET_KEY` - Your Stellar account secret key (starts with 'S')
   - `YOUR_STELLAR_ADDRESS` - Your Stellar account address (starts with 'G', 56 characters)
   - `MAINNET_XLM_CONTRACT_ADDRESS` - The address from step 1 (starts with 'C')
   - `10000` - Your desired maximum supply (use `0` for unlimited)

4. Save the contract ID and update your frontend environment variables.

**See `DEPLOY_MAINNET.md` in the parent directory for a complete mainnet deployment guide.**

## Using the Contract

### Minting NFTs

Any user can mint new NFTs (requires 1 XLM payment per mint):

```bash
soroban contract invoke \
  --id CONTRACT_ID \
  --source USER_SECRET_KEY \
  --network testnet \
  -- mint \
  --to RECIPIENT_ADDRESS
```

**Important Notes:**

- The contract automatically transfers 1 XLM (10,000,000 stroops) from the recipient (`to`) to the contract as payment
- The recipient address must authorize the transaction (sign it), which means they must be the one calling the function
- The recipient must have at least 1 XLM in their account balance to pay for the mint
- The function returns the token ID of the newly minted NFT

**Example:**

```bash
soroban contract invoke \
  --id CBYMRNPC2A4FIVCXBJNZFCJTUELQPQNS6GKU3BH54EWYQ3ZDB7NTTMLP \
  --source SECRET_KEY \
  --network testnet \
  -- mint \
  --to GBPOXKFVX4BRAQHMNE66EWKPVQRE6ZR3P4WQGKIA4WUFVX7K3NN6SWA6
```

In this example, `GBPOXKFVX4BRAQHMNE66EWKPVQRE6ZR3P4WQGKIA4WUFVX7K3NN6SWA6` is the recipient and must match the account associated with `--source`, since they need to authorize the payment.

# Withdraw a specific amount (e.g., 5 XLM = 50,000,000 stroops)

soroban contract invoke \
 --id CB37RE5GRAHX5PBSGXAAFXV5D6LS5NXNMWQKEJPGSR7PYGSNBXV6NRPA \
 --source SECRET_KEY \
 --network testnet \
 -- withdraw \
 --amount 50000000

# Withdraw all available XLM

soroban contract invoke \
 --id CONTRACT_ID \
 --source OWNER_SECRET_KEY \
 --network testnet \
 -- withdraw

## Running Tests

```bash
cd soroban-contracts/nft_collection
cargo test
```

## Important Notes

- The contract uses sequential minting (token IDs start at 1 and increment)
- **Any user can mint NFTs** - no ownership requirement
- Each mint costs **1 XLM**, which is automatically transferred from the recipient to the contract
- The recipient address must authorize (sign) the transaction, so they must be the caller
- Users can transfer their own NFTs to other addresses
- Users can burn their own NFTs
- Contract metadata (name, symbol, URI) is set in the constructor
- The contract uses the OpenZeppelin Stellar Contracts library for security and best practices
- All contract invocations require the `--source` (or `--source-account`) argument, even for view functions

## Resources

- [Soroban Examples](https://github.com/stellar/soroban-examples)
- [Soroban Documentation](https://developers.stellar.org/docs/build/smart-contracts)
- [OpenZeppelin Stellar Contracts](https://github.com/OpenZeppelin/stellar-contracts)
- [Stellar Asset Contract Guide](https://developers.stellar.org/docs/build/guides/tokens/stellar-asset-contract)
