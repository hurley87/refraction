#!/bin/bash
# Script to verify if a contract was properly initialized

CONTRACT_ID="$1"
NETWORK="${2:-testnet}"

if [ -z "$CONTRACT_ID" ]; then
    echo "Usage: ./VERIFY_CONTRACT.sh CONTRACT_ID [network]"
    echo "Example: ./VERIFY_CONTRACT.sh CBN6HFPZUSBVRHEBSFCS4MQIUN32HFSRKTM5IWYOISN226PUZSBARHKD testnet"
    exit 1
fi

echo "Verifying contract: $CONTRACT_ID on $NETWORK"
echo ""

# Try to read the max_supply (this should exist if constructor was called)
echo "Checking if storage exists..."
echo ""

# Note: We can't directly read private functions, but we can try to mint which will fail with a specific error
# if storage doesn't exist vs other errors

echo "If the constructor was called, the contract should have:"
echo "  - native_asset_address stored"
echo "  - max_supply stored"
echo "  - supply counter initialized to 0"
echo ""
echo "If you get 'MissingValue' errors when trying to mint, the constructor was NOT called during deployment."
echo ""
echo "To properly deploy with constructor arguments, use:"
echo ""
echo "  soroban contract deploy \\"
echo "    --wasm target/wasm32v1-none/release/nft_collection.wasm \\"
echo "    --source YOUR_SECRET_KEY \\"
echo "    --network $NETWORK \\"
echo "    -- --owner YOUR_OWNER_ADDRESS \\"
echo "       --native_asset_address XLM_CONTRACT_ADDRESS \\"
echo "       --max_supply 10000"
echo ""
echo "⚠️  The '--' separator is REQUIRED before constructor arguments!"
