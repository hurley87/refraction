# Simple Payment Contract

A minimal Soroban smart contract that transfers XLM (the native Stellar asset) from the contract to a recipient address.

## Contract Functions

- `send(recipient: Address, amount: i128)` - Send XLM to a recipient
- `transfer(recipient: Address, amount: i128)` - Alias for `send()`
- `pay(recipient: Address, amount: i128)` - Alias for `send()`

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
4. Add the Soroban WASM target:
   ```bash
   # Soroban uses a custom WASM target
   rustup target add wasm32v1-none
   
   # Note: The standard wasm32-unknown-unknown target is NOT used for Soroban contracts
   ```

**Important Notes:** 
- If you encounter OpenSSL or D-Bus build errors, installing the system development libraries (as shown above) is recommended. The `Cargo.toml` includes vendored OpenSSL as a fallback, but system libraries build faster.
- **XLM Native Asset Address:** The contract uses a placeholder XLM native asset contract address. Before deploying, you must replace it with the actual XLM contract address for your target network. Get it using:
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
  
  Then update the address in `src/lib.rs` in the `get_native_asset_address()` function.
  
  Alternatively, use the `send_with_native_address()` function which accepts the XLM contract address as a parameter, making it work across different networks without code changes. This is the recommended approach for production use.
  
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

2. Deploy the contract:
   ```bash
   soroban contract deploy \
     --wasm target/wasm32v1-none/release/simple_payment.wasm \
     --source YOUR_SECRET_KEY \
     --network testnet
   ```
   
   **Note:** If you used `soroban contract build`, the WASM file might be in a different location. Check the build output or use `soroban contract build --wasm-dir .` to output to the current directory.

3. Save the contract ID that is returned - you'll need it to interact with the contract.

### To Futurenet

```bash
soroban contract deploy \
  --wasm target/wasm32v1-none/release/simple_payment.wasm \
  --source YOUR_SECRET_KEY \
  --network futurenet
```

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
  --recipient RECIPIENT_ADDRESS \
  --amount 10000000
```

Note: Amount is in stroops (1 XLM = 10,000,000 stroops). So `10000000` = 1 XLM.

## Important Notes

- The contract must have XLM in its account before it can send to recipients
- The contract address is the same as the contract ID
- Make sure you're using the correct network (testnet/futurenet) when deploying and invoking
- Keep your secret key secure and never commit it to version control
