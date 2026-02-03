# Simple Payment Contract

A minimal Soroban smart contract that sends **custom fungible tokens** from the contract to a recipient. The contract must already hold the token; anyone can call `send_token` to forward it.

## Contract Functions

### Public Functions

- `send_token(token_address: Address, recipient: Address, amount: i128)` – Send a fungible token from the contract to a recipient (anyone can call). Works with any Soroban fungible token (e.g. XLM native asset or a custom token). The contract must already hold the token.

**Security:** The function validates that:

- Amount is positive
- Recipient is not the contract address
- Token address is not the contract address
- Contract has sufficient balance for the token

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
   rustup target add wasm32v1-none
   ```

**Current SDK Version:** `soroban-sdk = "23.4"`

## Building the Contract

```bash
cd soroban-contracts/simple_payment
soroban contract build
```

Or manually:

```bash
cargo build --target wasm32v1-none --release
```

## Deploying the Contract

The contract has no constructor. Deploy with:

```bash
soroban contract deploy \
  --wasm target/wasm32v1-none/release/simple_payment.wasm \
  --source YOUR_SECRET_KEY \
  --network testnet
```

Save the returned contract ID. You can also use the project script: `./DEPLOY_SIMPLE_PAYMENT.sh YOUR_SECRET_KEY [testnet|mainnet|futurenet]`.

## Using the Contract

### Funding the Contract

Before sending a token, the contract must hold that token. Transfer the token to the contract’s address (e.g. via the token’s `transfer` from another account).

### Invoking send_token

Example using Soroban CLI:

```bash
# Get the token contract address (e.g. native XLM or a custom token)
TOKEN_ADDRESS=$(soroban contract id asset --asset native --network testnet)

soroban contract invoke \
  --id PAYMENT_CONTRACT_ID \
  --source YOUR_SECRET_KEY \
  --network testnet \
  -- send_token \
  --token_address $TOKEN_ADDRESS \
  --recipient RECIPIENT_ADDRESS \
  --amount 10000000
```

**Notes:**

- Anyone can call `send_token`.
- Amount is in the token’s smallest units (e.g. stroops for XLM: 1 XLM = 10,000,000 stroops).
- The contract must already hold the chosen token.

## Important Notes

- The contract must hold the token before it can send to recipients.
- The contract address is the same as the contract ID.
- Use the correct network (testnet/futurenet/mainnet) when deploying and invoking.
- Keep your secret key secure and never commit it to version control.

Resources:

- [Soroban Documentation](https://developers.stellar.org/docs/build/smart-contracts)
- [Stellar Asset Contract Guide](https://developers.stellar.org/docs/build/guides/tokens/stellar-asset-contract)
