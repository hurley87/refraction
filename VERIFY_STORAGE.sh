#!/bin/bash
# Script to verify if a contract's storage was initialized

CONTRACT_ID="$1"
NETWORK="${2:-testnet}"
SOURCE_ACCOUNT="${3:-GBPOXKFVX4BRAQHMNE66EWKPVQRE6ZR3P4WQGKIA4WUFVX7K3NN6SWA6}"

if [ -z "$CONTRACT_ID" ]; then
    echo "Usage: ./VERIFY_STORAGE.sh CONTRACT_ID [network] [source_account]"
    echo ""
    echo "This script checks if a contract's storage was properly initialized."
    echo ""
    echo "Example:"
    echo "  ./VERIFY_STORAGE.sh CDK2CK7JVZCTBDNNROFQ56AF7U76DA6LSZAO4DXWOI3EWBIERKUDALI7 testnet"
    exit 1
fi

echo "Verifying contract storage: $CONTRACT_ID on $NETWORK"
echo ""

# Try to call is_initialized function (if available in new contracts)
echo "Checking if contract is initialized..."
RESULT=$(soroban contract invoke \
    --id "$CONTRACT_ID" \
    --source-account "$SOURCE_ACCOUNT" \
    --network "$NETWORK" \
    -- is_initialized 2>&1)

if echo "$RESULT" | grep -q "true"; then
    echo "✓ Contract IS initialized - storage exists"
    echo ""
    echo "Checking max supply..."
    MAX_SUPPLY=$(soroban contract invoke \
        --id "$CONTRACT_ID" \
        --source-account "$SOURCE_ACCOUNT" \
        --network "$NETWORK" \
        -- get_max_supply_public 2>&1 | grep -oE '[0-9]+' | head -1)
    
    if [ -n "$MAX_SUPPLY" ]; then
        echo "✓ Max supply: $MAX_SUPPLY"
    fi
elif echo "$RESULT" | grep -q "false"; then
    echo "✗ Contract is NOT initialized - storage is missing!"
    echo ""
    echo "This means the constructor was NOT called during deployment."
    echo ""
    echo "To fix this, redeploy with constructor arguments:"
    echo ""
    echo "  ./DEPLOY_NFT_CONTRACT.sh YOUR_SECRET_KEY"
elif echo "$RESULT" | grep -q "unrecognized subcommand"; then
    echo "⚠️  This contract was deployed with an older version (doesn't have is_initialized function)"
    echo ""
    echo "Based on the error you're seeing ('MissingValue' when trying to mint),"
    echo "this contract's storage is MISSING - the constructor was NOT called during deployment."
    echo ""
    echo "This happens when you deploy without the '--' separator before constructor arguments."
    echo ""
    echo "✗ Contract storage is MISSING - constructor was NOT called during deployment!"
    
    echo ""
    echo "To redeploy with the latest version (includes verification functions):"
    echo ""
    echo "  ./DEPLOY_NFT_CONTRACT.sh YOUR_SECRET_KEY"
    echo ""
    echo "Or manually:"
    echo "  cd soroban-contracts/nft_collection"
    echo "  cargo build --target wasm32v1-none --release"
    echo "  soroban contract deploy \\"
    echo "    --wasm target/wasm32v1-none/release/nft_collection.wasm \\"
    echo "    --source YOUR_SECRET_KEY \\"
    echo "    --network $NETWORK \\"
    echo "    -- \\"
    echo "    --owner YOUR_OWNER_ADDRESS \\"
    echo "    --native_asset_address XLM_CONTRACT_ADDRESS \\"
    echo "    --max_supply 10000"
    echo ""
    echo "⚠️  The '--' separator is REQUIRED!"
else
    echo "Error checking contract:"
    echo "$RESULT"
    echo ""
    echo "This might indicate:"
    echo "1. Network/account issues"
    echo "2. The contract ID is incorrect"
    echo "3. The contract doesn't exist"
fi
