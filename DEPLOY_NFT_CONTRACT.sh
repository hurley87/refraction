#!/bin/bash
# Script to deploy NFT contract with proper constructor arguments

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}NFT Contract Deployment Script${NC}"
echo ""

# Check if source key is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Secret key not provided${NC}"
    echo "Usage: ./DEPLOY_NFT_CONTRACT.sh YOUR_SECRET_KEY [OWNER_ADDRESS] [MAX_SUPPLY]"
    echo ""
    echo "Example:"
    echo "  ./DEPLOY_NFT_CONTRACT.sh SCKH34BJYI7LZNHFWK4URGVIQ3Q6NSSHW3JBVQVJ3HLPOBJDMBW6FAX4"
    exit 1
fi

SOURCE_KEY="$1"
OWNER_ADDRESS="${2:-GBPOXKFVX4BRAQHMNE66EWKPVQRE6ZR3P4WQGKIA4WUFVX7K3NN6SWA6}"
MAX_SUPPLY="${3:-10000}"

# Get XLM contract address for testnet
echo -e "${YELLOW}Getting XLM native asset contract address for testnet...${NC}"
XLM_ADDRESS=$(soroban contract id asset --asset native --network testnet 2>&1)

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to get XLM contract address${NC}"
    exit 1
fi

echo -e "${GREEN}XLM Contract Address: ${XLM_ADDRESS}${NC}"
echo ""

# Build the contract
echo -e "${YELLOW}Building contract...${NC}"
cd soroban-contracts/nft_collection
cargo build --target wasm32v1-none --release

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}Build successful${NC}"
echo ""

# Deploy with constructor arguments
echo -e "${YELLOW}Deploying contract with constructor arguments...${NC}"
echo -e "${GREEN}Owner: ${OWNER_ADDRESS}${NC}"
echo -e "${GREEN}XLM Address: ${XLM_ADDRESS}${NC}"
echo -e "${GREEN}Max Supply: ${MAX_SUPPLY}${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: The '--' separator is REQUIRED before constructor arguments!${NC}"
echo ""

CONTRACT_ID=$(soroban contract deploy \
    --wasm target/wasm32v1-none/release/nft_collection.wasm \
    --source "${SOURCE_KEY}" \
    --network testnet \
    -- \
    --owner "${OWNER_ADDRESS}" \
    --native_asset_address "${XLM_ADDRESS}" \
    --max_supply "${MAX_SUPPLY}" 2>&1)

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Deployment failed${NC}"
    echo "$CONTRACT_ID"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Contract deployed successfully!${NC}"
echo -e "${GREEN}Contract ID: ${CONTRACT_ID}${NC}"
echo ""
echo -e "${YELLOW}Important:${NC}"
echo "1. Save this contract ID"
echo "2. Update your .env.local file with:"
echo "   NEXT_PUBLIC_NFT_CONTRACT_ADDRESS_TESTNET=${CONTRACT_ID}"
echo ""
echo "The constructor has been called and storage is initialized."
