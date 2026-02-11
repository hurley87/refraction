# IRL Fungible Token

OpenZeppelin Stellar–style fungible token: **IRL**, 7 decimals, initial supply **1,000,000** tokens (all minted to the owner in the constructor).

Based on the [Stellar fungible token example](https://developers.stellar.org/docs/build/smart-contracts/example-contracts/fungible-token) and `stellar_tokens::fungible::Base`.

## Contract details

- **Name:** IRL
- **Symbol:** IRL
- **Decimals:** 7 (matches app `FUNGIBLE_TOKEN_DECIMALS`)
- **Initial supply:** 1,000,000 tokens (1,000,000 × 10^7 smallest units) minted to the constructor `owner`
- **Owner:** Set in `__constructor(owner)`. Owner can call `mint(to, amount)`.

Implements SEP-41 Token Interface (transfer, balance, approve, burn, etc.) so it works with the app’s claim-points flow and `simple_payment` contract.

## Build

```bash
cd soroban-contracts/irl_token
soroban contract build
```

WASM output: `target/wasm32v1-none/release/irl_token.wasm`

## Deploy

### Testnet

1. **Build** (see above).

2. **Deploy and initialize** in one step. Replace `YOUR_SECRET_KEY` and `OWNER_STELLAR_ADDRESS` (G...).

   ```bash
   soroban contract deploy \
     --wasm target/wasm32v1-none/release/irl_token.wasm \
     --source YOUR_SECRET_KEY \
     --network testnet \
     -- \
     --owner OWNER_STELLAR_ADDRESS
   ```

   Save the returned **contract ID** (e.g. `C...`). The constructor runs at deploy time and mints 1,000,000 IRL to the owner.

3. **Check balance** of the owner:

   ```bash
   soroban contract invoke \
     --id <CONTRACT_ID> \
     --network testnet \
     -- \
     balance \
     --id OWNER_STELLAR_ADDRESS
   ```

   Expected: `10000000000000` (1,000,000 × 10^7).

### Mainnet

Same as testnet, use `--network mainnet` and a higher fee if needed:

```bash
soroban contract deploy \
  --wasm target/wasm32v1-none/release/irl_token.wasm \
  --source YOUR_SECRET_KEY \
  --network mainnet \
  --inclusion-fee 100000 \
  -- \
  --owner OWNER_STELLAR_ADDRESS
```

## Use as claim-points token

1. Deploy this IRL token (testnet or mainnet).
2. Set the contract ID in your env:
   - Testnet: `NEXT_PUBLIC_CLAIM_POINTS_CONTRACT_ADDRESS_TESTNET=<IRL_TOKEN_CONTRACT_ID>`
   - Mainnet: `NEXT_PUBLIC_CLAIM_POINTS_CONTRACT_ADDRESS_MAINNET=<IRL_TOKEN_CONTRACT_ID>`
3. Fund the **simple payment** contract with IRL tokens (transfer from the owner to the simple payment contract address) so the claim-points API can send tokens to users.

## Tests

```bash
cargo test
```
