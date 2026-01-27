# Simple Payment Contract

A minimal Soroban smart contract that transfers XLM (the native Stellar asset) from the contract to a recipient address.

## Contract Functions

### Public Functions

- `send(recipient: Address)` - Send 0.1 XLM to a recipient (anyone can call)
- `transfer(recipient: Address)` - Alias for `send()` (anyone can call)
- `pay(recipient: Address)` - Alias for `send()` (anyone can call)

**Security:** The send function validates that:

- Recipient is not the contract address itself
- Contract has sufficient balance (at least 0.1 XLM)
- Anyone can call this function to send 0.1 XLM from the contract

**Note:** The amount is hardcoded to 0.1 XLM (1,000,000 stroops). The contract must have at least 0.1 XLM in its balance before calling this function.

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

   **Note:** `libudev-dev` (or `systemd-devel` on Fedora) is required for building `soroban-cli` because it depends on `hidapi` for hardware wallet support.

3. Install Soroban CLI:
   ```bash
   cargo install --locked soroban-cli
   ```

## Security Considerations

### Storage TTL Management

This contract does not use persistent storage, so TTL management is not a concern for this contract.

**Current SDK Version:**

- `soroban-sdk = "23.4"` - Current stable version
- Periodically check for SDK updates: `cargo search soroban-sdk`
- Before upgrading, verify compatibility with any dependencies

4. Add the Soroban WASM target:

   ```bash
   # Soroban uses a custom WASM target
   rustup target add wasm32v1-none

   # Note: The standard wasm32-unknown-unknown target is NOT used for Soroban contracts
   ```

**Important Notes:**

- If you encounter OpenSSL or D-Bus build errors, installing the system development libraries (as shown above) is recommended. The `Cargo.toml` includes vendored OpenSSL as a fallback, but system libraries build faster.
- **XLM Native Asset Address:** The contract requires the XLM native asset contract address to be passed to the constructor during deployment. Get it using:

  ```bash
  soroban contract id asset --asset native --network <network>
  ```

  Example:

  ```bash
  # For Testnet
  soroban contract id asset --asset native --network testnet

  # For Futurenet
  soroban contract id asset --asset native --network futurenet

  # For Mainnet
  soroban contract id asset --asset native --network mainnet
  ```

  Pass this address to the constructor during deployment (see deployment instructions above).

  Resources:

  - [Soroban Examples](https://github.com/stellar/soroban-examples)
  - [Soroban Documentation](https://developers.stellar.org/docs/build/smart-contracts)
  - [Stellar Asset Contract Guide](https://developers.stellar.org/docs/build/guides/tokens/stellar-asset-contract)

## Building the Contract

```bash
cd soroban-contracts/simple_payment
soroban contract build
```

This will create a `.wasm` file. The `soroban contract build` command automatically uses the `wasm32v1-none` target and handles the compilation. The output file location may vary, but it's typically in the `target/` directory or the project root.

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
     --wasm target/wasm32v1-none/release/simple_payment.wasm \
     --source YOUR_SECRET_KEY \
     --network testnet \
     -- --native_asset_address CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
   ```

   **Important:**

   - Replace `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` with the XLM contract address from step 2
   - The `--` separator is required before constructor arguments
   - The constructor is automatically called during deployment, so you don't need a separate initialization step

4. Save the contract ID that is returned - you'll need it to interact with the contract.

   **Note:** The contract is already initialized during deployment, so no separate initialization step is needed.

### To Futurenet

1. Get the XLM native asset contract address:

   ```bash
   soroban contract id asset --asset native --network futurenet
   ```

2. Deploy the contract:

   ```bash
   soroban contract deploy \
     --wasm target/wasm32v1-none/release/simple_payment.wasm \
     --source YOUR_SECRET_KEY \
     --network futurenet \
     -- --native_asset_address FUTURENET_XLM_CONTRACT_ADDRESS
   ```

   Replace `FUTURENET_XLM_CONTRACT_ADDRESS` with the address from step 1.

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
     --wasm target/wasm32v1-none/release/simple_payment.wasm \
     --source YOUR_SECRET_KEY \
     --network mainnet \
     --fee 100000 \
     -- --native_asset_address MAINNET_XLM_CONTRACT_ADDRESS
   ```

   **Replace:**

   - `MAINNET_XLM_CONTRACT_ADDRESS` - The address from step 1 (starts with 'C')
   - The `--fee 100000` sets the transaction fee to 100,000 stroops (0.01 XLM). Increase if you get "TxInsufficientFee" errors.

4. Save the contract ID and update your frontend environment variables.

**See `DEPLOY_MAINNET.md` in the parent directory for a complete mainnet deployment guide.**

## Using the Contract

### Funding the Contract

Before the contract can send XLM, it needs to have XLM in its account. You can fund it by sending XLM to the contract's address.

### Invoking the Contract

You can invoke the contract using the Stellar SDK or through the UI component in this application.

Example using Soroban CLI:

```bash
soroban contract invoke \
  --id CONTRACT_ID \
  --source YOUR_SECRET_KEY \
  --network testnet \
  -- send \
  --recipient RECIPIENT_ADDRESS
```

**Important Notes:**

- Anyone can call `send()`, `transfer()`, or `pay()` functions
- The function sends a fixed amount of 0.1 XLM (1,000,000 stroops) to the recipient
- The contract must have at least 0.1 XLM in its balance before calling this function
- The function will panic if the contract has insufficient balance

## Important Notes

- The contract must have XLM in its account before it can send to recipients
- The contract address is the same as the contract ID
- Make sure you're using the correct network (testnet/futurenet) when deploying and invoking
- Keep your secret key secure and never commit it to version control
