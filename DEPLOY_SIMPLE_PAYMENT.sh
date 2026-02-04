#!/bin/bash
# Deploy Simple Payment contract (sends custom fungible tokens from contract to recipient)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Simple Payment Contract Deployment${NC}"
echo "Sends custom fungible tokens from the contract to a recipient via send_token(token_address, recipient, amount)."
echo ""

# Check if source key is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Secret key not provided${NC}"
    echo "Usage: ./DEPLOY_SIMPLE_PAYMENT.sh YOUR_SECRET_KEY [NETWORK]"
    echo ""
    echo "Example:"
    echo "  ./DEPLOY_SIMPLE_PAYMENT.sh SCKH34BJYI7LZNHFWK4URGVIQ3Q6NSSHW3JBVQVJ3HLPOBJDMBW6FAX4 testnet"
    exit 1
fi

SOURCE_KEY="$1"
NETWORK="${2:-testnet}"

# Build the contract
echo -e "${YELLOW}Building contract...${NC}"
cd soroban-contracts/simple_payment
cargo build --target wasm32v1-none --release

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}Build successful${NC}"
echo ""

echo -e "${YELLOW}Deploying contract...${NC}"
echo -e "${GREEN}Network: ${NETWORK}${NC}"
echo ""

CONTRACT_ID=$(soroban contract deploy \
    --wasm target/wasm32v1-none/release/simple_payment.wasm \
    --source "${SOURCE_KEY}" \
    --network "${NETWORK}" 2>&1)

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Deployment failed${NC}"
    echo "$CONTRACT_ID"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Contract deployed successfully!${NC}"
echo -e "${GREEN}Contract ID: ${CONTRACT_ID}${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Save this contract ID"
if [ "$NETWORK" = "testnet" ]; then
    echo "2. Update .env.local: NEXT_PUBLIC_SIMPLE_PAYMENT_CONTRACT_ADDRESS_TESTNET=${CONTRACT_ID}"
elif [ "$NETWORK" = "mainnet" ]; then
    echo "2. Update .env.local: NEXT_PUBLIC_SIMPLE_PAYMENT_CONTRACT_ADDRESS_MAINNET=${CONTRACT_ID}"
fi
echo "3. Fund the contract with the token(s) you want to send, then invoke send_token(token_address, recipient, amount)"
