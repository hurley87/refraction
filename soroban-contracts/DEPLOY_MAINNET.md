# Deploying Contracts to Stellar Mainnet

This guide walks you through deploying the NFT Collection and Simple Payment contracts to Stellar Mainnet.

## Prerequisites

1. **Funded Mainnet Account**: You need a Stellar account with XLM on mainnet

   - Minimum balance: ~2-3 XLM for deployment fees
   - You can buy XLM from exchanges or use a Stellar wallet

2. **Soroban CLI Installed**: Make sure you have the latest version

   ```bash
   cargo install --locked soroban-cli
   ```

3. **Secret Key**: Your Stellar account secret key (keep it secure!)

4. **Configure Mainnet RPC URL**: Make sure mainnet is properly configured

   Check if mainnet is configured:

   ```bash
   soroban network ls
   soroban network info mainnet
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
   soroban network health mainnet
   ```

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

## Step 2: Build Both Contracts

Build both contracts before deploying:

```bash
# Build NFT Collection
cd soroban-contracts/nft_collection
soroban contract build

# Build Simple Payment
cd ../simple_payment
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
     --fee 100000 \
     -- --owner YOUR_STELLAR_ADDRESS \
        --native_asset_address MAINNET_XLM_CONTRACT_ADDRESS \
        --max_supply 10000
   ```

   **Note:** The `--fee 100000` sets the transaction fee to 100,000 stroops (0.01 XLM). If you still get "TxInsufficientFee" errors, try increasing it to `--fee 500000` (0.05 XLM) or higher.

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

1. Navigate to the simple payment directory:

   ```bash
   cd soroban-contracts/simple_payment
   ```

2. Deploy the contract (the constructor will be called automatically during deployment):

   ```bash
   soroban contract deploy \
     --wasm target/wasm32v1-none/release/simple_payment.wasm \
     --source YOUR_SECRET_KEY \
     --network mainnet \
     --fee 500000 \
     -- --native_asset_address MAINNET_XLM_CONTRACT_ADDRESS
   ```

   **Note:** The `--fee 100000` sets the transaction fee to 100,000 stroops (0.01 XLM). If you still get "TxInsufficientFee" errors, try increasing it to `--fee 500000` (0.05 XLM) or higher.

   **Replace:**

   - `YOUR_SECRET_KEY` - Your Stellar account secret key (starts with 'S')
   - `MAINNET_XLM_CONTRACT_ADDRESS` - The address from Step 1 (starts with 'C')
   - The `--` separator is required before constructor arguments
   - The constructor is automatically called during deployment, so you don't need a separate initialization step

3. **Save the contract ID** that is returned - you'll need it for your frontend configuration.

   Example output:

   ```
   Contract deployed with ID: CB37RE5GRAHX5PBSGXAAFXV5D6LS5NXNMWQKEJPGSR7PYGSNBXV6NRPA
   ```

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

### "Insufficient balance" error

- Make sure your account has enough XLM (minimum ~2-3 XLM for deployment)

### "TxInsufficientFee" error

- The default transaction fee (100 stroops = 0.00001 XLM) is too low for mainnet deployments
- Add `--fee` flag to your deploy command with a higher fee:
  ```bash
  --fee 100000  # 0.01 XLM (recommended starting point)
  ```
- If that's still insufficient, try:
  ```bash
  --fee 500000  # 0.05 XLM
  --fee 1000000 # 0.1 XLM
  ```
- Fee is specified in stroops (1 XLM = 10,000,000 stroops)
- You can also check the recommended fee by using `--cost` flag:
  ```bash
  soroban contract deploy --cost --wasm ... --network mainnet
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
