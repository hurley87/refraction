# Deploying Contracts to Stellar Mainnet

This guide walks you through deploying the NFT Collection, Simple Payment, and IRL Token contracts to Stellar Mainnet.

## Prerequisites

1. **Funded Mainnet Account**: You need a Stellar account with XLM on mainnet
   - Recommended: at least **5–10 XLM** (contract install + fees + reserves). If you see **TxInsufficientBalance**, add more XLM to the account.
   - You can buy XLM from exchanges or use a Stellar wallet
   - **Verify mainnet balance** (the deployer is the account from your secret key; mainnet and testnet are separate):
     ```bash
     curl -s "https://horizon.stellar.org/accounts/YOUR_PUBLIC_KEY"
     ```
     Replace `YOUR_PUBLIC_KEY` with your account address (starts with `G`). Check the `balances` array for native XLM. A 404 means the account does not exist on mainnet yet.

2. **Soroban CLI Installed**: Make sure you have the latest version

   ```bash
   cargo install --locked soroban-cli
   ```

3. **Secret Key**: Your Stellar account secret key (keep it secure!)

4. **Configure Mainnet RPC URL**: Make sure mainnet is properly configured

   Check if mainnet is configured:

   ```bash
   soroban network ls
   soroban network info --network mainnet
   ```

   If mainnet is not configured or has an invalid RPC URL, configure it:

   ```bash
   soroban network add mainnet \
     --rpc-url https://soroban-rpc.mainnet.stellar.gateway.fm \
     --network-passphrase "Public Global Stellar Network ; September 2015"
   ```

   Or update existing mainnet configuration:

   ```bash
   soroban network rm mainnet
   soroban network add mainnet \
     --rpc-url https://soroban-rpc.mainnet.stellar.gateway.fm \
     --network-passphrase "Public Global Stellar Network ; September 2015"
   ```

   Verify the configuration:

   ```bash
   soroban network health --network mainnet
   ```

   **If you see "Invalid URL Bring Your Own" or a docs URL:** mainnet is using a placeholder. Remove and re-add it with the commands under "Or update existing mainnet configuration" above.

## Step 1: Get Mainnet XLM Native Asset Address

The XLM native asset contract address is different on each network. Get it for mainnet:

```bash
soroban contract id asset --asset native --network mainnet
```

**Save this address** - you'll need it for both contracts.

Example output (this is the actual mainnet address):

```
CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
```

## Step 2: Build Contracts

Build all contracts before deploying:

```bash
# Build NFT Collection
cd soroban-contracts/nft_collection
soroban contract build

# Build Simple Payment
cd ../simple_payment
soroban contract build

# Build IRL Token (fungible token for claim-points)
cd ../irl_token
soroban contract build
```

## Step 3: Deploy NFT Collection Contract

1. Navigate to the NFT collection directory:

   ```bash
   cd soroban-contracts/nft_collection
   ```

2. Deploy the contract:

   ```bash
   soroban contract deploy \
     --wasm target/wasm32v1-none/release/nft_collection.wasm \
     --source YOUR_SECRET_KEY \
     --network mainnet \
     --inclusion-fee 100000 \
     -- --owner YOUR_STELLAR_ADDRESS \
        --native_asset_address MAINNET_XLM_CONTRACT_ADDRESS \
        --max_supply 10000
   ```

   **Note:** The `--inclusion-fee 100000` sets the transaction fee to 100,000 stroops (0.01 XLM). If you get **TxInsufficientFee**, try a higher fee (e.g. `--inclusion-fee 500000`). If you get **TxInsufficientBalance**, your account needs more XLM—fund it with at least 5–10 XLM and try again.

   **Replace:**
   - `YOUR_SECRET_KEY` - Your Stellar account secret key (starts with 'S')
   - `YOUR_STELLAR_ADDRESS` - Your Stellar account address (starts with 'G', 56 characters)
   - `MAINNET_XLM_CONTRACT_ADDRESS` - The address from Step 1 (starts with 'C')
   - `10000` - Your desired maximum supply (use `0` for unlimited)

3. **Save the contract ID** that is returned - you'll need it for your frontend configuration.

   Example output:

   ```
   Contract deployed with ID: CBYMRNPC2A4FIVCXBJNZFCJTUELQPQNS6GKU3BH54EWYQ3ZDB7NTTMLP
   ```

## Step 4: Deploy Simple Payment Contract

The Simple Payment contract sends custom fungible tokens from the contract to a recipient via `send_token(token_address, recipient, amount)`. It has no constructor.

1. Navigate to the simple payment directory:

   ```bash
   cd soroban-contracts/simple_payment
   ```

2. Deploy the contract:

   ```bash
   soroban contract deploy \
     --wasm target/wasm32v1-none/release/simple_payment.wasm \
     --source YOUR_SECRET_KEY \
     --network mainnet \
     --inclusion-fee 500000
   ```

   **Note:** The `--inclusion-fee 500000` sets the transaction fee. If you get "TxInsufficientFee" errors, try increasing it.

   **Replace:** `YOUR_SECRET_KEY` - Your Stellar account secret key (starts with 'S')

3. **Save the contract ID** that is returned - you'll need it for your frontend configuration. Fund the contract with the token(s) you want to send, then invoke `send_token(token_address, recipient, amount)`.

   Example output:

   ```
   Contract deployed with ID: CB37RE5GRAHX5PBSGXAAFXV5D6LS5NXNMWQKEJPGSR7PYGSNBXV6NRPA
   ```

## Step 4b: Deploy IRL Token (optional, for claim-points)

The IRL token is a fungible token (name/symbol **IRL**, 7 decimals, initial supply 1,000,000) used as the claim-points reward token. Deploy it if you use the claim-points feature.

1. From the repo root:

   ```bash
   cd soroban-contracts/irl_token
   soroban contract deploy \
     --wasm target/wasm32v1-none/release/irl_token.wasm \
     --source YOUR_SECRET_KEY \
     --network mainnet \
     --inclusion-fee 100000 \
     -- \
     --owner YOUR_STELLAR_ADDRESS
   ```

2. Save the returned **contract ID** and set `NEXT_PUBLIC_CLAIM_POINTS_CONTRACT_ADDRESS_MAINNET` to it in your frontend/env.

3. Fund the **simple payment** contract with IRL tokens (transfer from the owner to the simple payment contract address) so the claim-points API can send tokens to users.

See `soroban-contracts/irl_token/README.md` for testnet and more details.

## Step 5: Update Frontend Configuration

After deploying, update your environment variables:

### For Vercel Production:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add/Update these variables:

```bash
# Production flag (enables mainnet)
PRODUCTION=true

# NFT Contract Address (from Step 3)
NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=CBYMRNPC2A4FIVCXBJNZFCJTUELQPQNS6GKU3BH54EWKPVQRE6ZR3P4WQGKIA4WUFVX7K3NN6SWA6

# Simple Payment Contract Address (from Step 4)
# Use network-specific addresses (recommended):
NEXT_PUBLIC_SIMPLE_PAYMENT_CONTRACT_ADDRESS_MAINNET=CCZVXRSVOOVWCS2GT24KPRZIWLC4TWUIIYTWJQYHFZGTXYQWR4JIFLVJ
NEXT_PUBLIC_SIMPLE_PAYMENT_CONTRACT_ADDRESS_TESTNET=CDMWALU6ILUYXTHZ2JCVOLNTTGZTQW7AGAIG2OM4QRSZCNSFSYSHT5EF
# Or use a single address for all networks (fallback - not recommended):
# NEXT_PUBLIC_SIMPLE_PAYMENT_CONTRACT_ADDRESS=CCZVXRSVOOVWCS2GT24KPRZIWLC4TWUIIYTWJQYHFZGTXYQWR4JIFLVJ

# Network configuration (auto-set by PRODUCTION=true, but you can override)
NEXT_PUBLIC_STELLAR_NETWORK=PUBLIC
NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE="Public Global Stellar Network ; September 2015"
```

### For Local Testing (Optional):

If you want to test mainnet locally, add to `.env.local`:

```bash
PRODUCTION=true
NEXT_PUBLIC_STELLAR_NETWORK=PUBLIC
NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=YOUR_MAINNET_NFT_CONTRACT_ID
NEXT_PUBLIC_SIMPLE_PAYMENT_CONTRACT_ADDRESS=YOUR_MAINNET_PAYMENT_CONTRACT_ID
```

## Step 6: Verify Deployment

Verify your contracts are deployed correctly:

### Check NFT Collection:

```bash
soroban contract invoke \
  --id YOUR_NFT_CONTRACT_ID \
  --source YOUR_SECRET_KEY \
  --network mainnet \
  -- name
```

Expected output: `"IRL Test Collection"` (or your custom name)

### Check Simple Payment:

```bash
soroban contract invoke \
  --id YOUR_PAYMENT_CONTRACT_ID \
  --source YOUR_SECRET_KEY \
  --network mainnet \
  -- send \
  --recipient YOUR_STELLAR_ADDRESS \
  --amount 1000000
```

**Note:** This will only work if the contract has been funded with XLM first.

## Important Security Notes

1. **Never commit secret keys** to version control
2. **Use environment variables** for all sensitive data
3. **Test on testnet first** before deploying to mainnet
4. **Verify contract addresses** before using them in production
5. **Keep your secret keys secure** - if compromised, create a new account

## Troubleshooting

### "TxInsufficientBalance" / "Insufficient balance" error

- **Mainnet vs testnet**: The account that **pays** for the deploy is the one from `--source` (your secret key). Stellar mainnet and testnet are separate ledgers—the same address can have 20 XLM on testnet and 0 on mainnet. If you only ever funded this account on testnet, it has no balance on mainnet. Check balance on **mainnet** (e.g. [stellar.expert](https://stellar.expert) or [Stellar Laboratory](https://laboratory.stellar.org) and switch the network to **Public** / mainnet), then send XLM to that address on mainnet if needed.
- Make sure your **deployer** account (the one in `--source`) has enough XLM on the network you're deploying to (minimum ~2–3 XLM for deployment; 5–10+ XLM recommended).
- **Balance is correct on Horizon but deploy still fails?** The Soroban CLI uses the **Soroban RPC** (not Horizon) for simulation and submission. A bad or stale RPC can see the wrong account state. Check which RPC you're using: `soroban network info --network mainnet`. Try switching to a known-good mainnet RPC (see "Configure Mainnet RPC URL" in Prerequisites). If you get **DNS errors** (e.g. "failed to lookup address information"), the RPC hostname is wrong or unreachable—re-add mainnet with a working URL such as `https://soroban-rpc.mainnet.stellar.gateway.fm` or `https://rpc.lightsail.network`.
- **Still TxInsufficientBalance?** The network may require more than your visible balance (inclusion fee + resource fee + reserves for new ledger entries). Run the deploy with `--cost` (see "TxInsufficientFee" section below) to see the total cost the RPC reports; your account balance must exceed that. Try adding more XLM (e.g. 30–50) to the deployer account, or try the other mainnet RPC (gateway.fm vs lightsail) in case one has different state.

### "TxInsufficientFee" error

- The default transaction fee (100 stroops = 0.00001 XLM) is too low for mainnet deployments
- Add `--inclusion-fee` flag to your deploy command with a higher fee:
  ```bash
  --inclusion-fee 100000  # 0.01 XLM (recommended starting point)
  ```
- If that's still insufficient, try:
  ```bash
  --inclusion-fee 500000  # 0.05 XLM
  --inclusion-fee 1000000 # 0.1 XLM
  ```
- Fee is specified in stroops (1 XLM = 10,000,000 stroops)
- You can also check the recommended fee by using the `--cost` flag (run from the contract directory, e.g. `soroban-contracts/nft_collection`):
  ```bash
  soroban contract deploy --cost \
    --wasm target/wasm32v1-none/release/nft_collection.wasm \
    --source YOUR_SECRET_KEY \
    --network mainnet \
    -- --owner GDTKS7AVS2IKVGQY2NG44Z5M33A5PTCE26XPUTRL22TYBYWOJFIJMBHT \
       --native_asset_address CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA \
       --max_supply 10000
  ```

### "Contract not found" error

- Double-check the contract ID
- Make sure you're using `--network mainnet` (not testnet)

### "Invalid address" error

- Verify the XLM native asset address is correct for mainnet
- Make sure addresses start with 'C' (contracts) or 'G' (accounts)

### "invalid rpc url: invalid uri character" error

- This means the Soroban CLI can't connect to the mainnet RPC server
- Configure mainnet network:
  ```bash
  soroban network add mainnet \
    --rpc-url https://soroban-rpc.mainnet.stellar.gateway.fm \
    --network-passphrase "Public Global Stellar Network ; September 2015"
  ```
- Or use the `--rpc-url` flag directly in your deploy command:
  ```bash
  soroban contract deploy \
    --wasm target/wasm32v1-none/release/nft_collection.wasm \
    --source YOUR_SECRET_KEY \
    --network mainnet \
    --rpc-url https://soroban-rpc.mainnet.stellar.gateway.fm \
    --network-passphrase "Public Global Stellar Network ; September 2015" \
    -- --owner YOUR_STELLAR_ADDRESS \
       --native_asset_address MAINNET_XLM_CONTRACT_ADDRESS \
       --max_supply 10000
  ```

## Next Steps

1. Fund the Simple Payment contract if you plan to use it
2. Update your frontend environment variables
3. Test the contracts on mainnet
4. Monitor contract activity and storage TTLs

## Resources

- [Soroban Documentation](https://developers.stellar.org/docs/build/smart-contracts)
- [Stellar Mainnet Explorer](https://stellar.expert/explorer/public)
- [Soroban RPC Mainnet](https://soroban-rpc.mainnet.stellar.gateway.fm)
