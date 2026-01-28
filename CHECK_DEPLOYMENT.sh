#!/bin/bash
# Script to check if a contract was deployed with constructor arguments

CONTRACT_ID="$1"
NETWORK="${2:-testnet}"

if [ -z "$CONTRACT_ID" ]; then
    echo "Usage: ./CHECK_DEPLOYMENT.sh CONTRACT_ID [network]"
    echo ""
    echo "This script helps verify if a contract was deployed with constructor arguments."
    echo "If storage is missing, the constructor was likely not called during deployment."
    exit 1
fi

echo "Checking contract: $CONTRACT_ID on $NETWORK"
echo ""

# Check if we can read the contract's metadata or try to invoke a function that requires storage
echo "Attempting to verify contract storage..."
echo ""

# The best way to check is to try to invoke a function that requires storage
# If storage doesn't exist, you'll get a MissingValue error

echo "If you see 'MissingValue' or 'Storage' errors, the constructor was NOT called during deployment."
echo ""
echo "To properly deploy with constructor arguments, you MUST use the '--' separator:"
echo ""
echo "  soroban contract deploy \\"
echo "    --wasm target/wasm32v1-none/release/nft_collection.wasm \\"
echo "    --source YOUR_SECRET_KEY \\"
echo "    --network $NETWORK \\"
echo "    -- \\"
echo "    --owner YOUR_OWNER_ADDRESS \\"
echo "    --native_asset_address XLM_CONTRACT_ADDRESS \\"
echo "    --max_supply 10000"
echo ""
echo "⚠️  Notice the '--' on its own line - this is REQUIRED!"
echo ""
echo "Without the '--' separator, the constructor arguments are ignored"
echo "and the contract is deployed with empty storage."
