#!/bin/bash
# Deployment script for NFT Collection contract
# Supports testnet, mainnet, and futurenet

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     NFT Collection Contract Deployment Script           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print usage
usage() {
    echo -e "${YELLOW}Usage:${NC}"
    echo "  ./deploy.sh <NETWORK> <SECRET_KEY> [OWNER_ADDRESS] [MAX_SUPPLY]"
    echo ""
    echo -e "${YELLOW}Arguments:${NC}"
    echo "  NETWORK        - Network to deploy to: testnet, mainnet, or futurenet"
    echo "  SECRET_KEY     - Your Stellar account secret key (starts with 'S')"
    echo "  OWNER_ADDRESS  - Owner address (optional, defaults to account from SECRET_KEY)"
    echo "  MAX_SUPPLY     - Maximum NFT supply (optional, defaults to 10000, use 0 for unlimited)"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  ./deploy.sh testnet SCKH34BJYI7LZNHFWK4URGVIQ3Q6NSSHW3JBVQVJ3HLPOBJDMBW6FAX4"
    echo "  ./deploy.sh mainnet SCKH34BJYI7LZNHFWK4URGVIQ3Q6NSSHW3JBVQVJ3HLPOBJDMBW6FAX4 GBPOXKFVX4BRAQHMNE66EWKPVQRE6ZR3P4WQGKIA4WUFVX7K3NN6SWA6 50000"
    echo ""
    exit 1
}

# Check arguments
if [ $# -lt 2 ]; then
    echo -e "${RED}Error: Missing required arguments${NC}"
    usage
fi

NETWORK="$1"
SECRET_KEY="$2"
OWNER_ADDRESS="${3:-}"
MAX_SUPPLY="${4:-10000}"

# Validate network
if [[ ! "$NETWORK" =~ ^(testnet|mainnet|futurenet)$ ]]; then
    echo -e "${RED}Error: Invalid network. Must be testnet, mainnet, or futurenet${NC}"
    usage
fi

# Validate secret key format
if [[ ! "$SECRET_KEY" =~ ^S[A-Z0-9]{55}$ ]]; then
    echo -e "${RED}Error: Invalid secret key format. Secret keys must start with 'S' and be 56 characters${NC}"
    exit 1
fi

# Get account address from secret key if owner not provided
if [ -z "$OWNER_ADDRESS" ]; then
    echo -e "${YELLOW}Extracting owner address from secret key...${NC}"
    OWNER_ADDRESS=$(soroban keys address --secret-key "$SECRET_KEY" 2>/dev/null || echo "")
    if [ -z "$OWNER_ADDRESS" ]; then
        echo -e "${RED}Error: Could not extract address from secret key${NC}"
        echo -e "${YELLOW}Please provide OWNER_ADDRESS as the third argument${NC}"
        exit 1
    fi
    echo -e "${GREEN}Owner address: ${OWNER_ADDRESS}${NC}"
fi

# Validate owner address format
if [[ ! "$OWNER_ADDRESS" =~ ^G[A-Z0-9]{55}$ ]]; then
    echo -e "${RED}Error: Invalid owner address format. Addresses must start with 'G' and be 56 characters${NC}"
    exit 1
fi

# Validate max supply
if ! [[ "$MAX_SUPPLY" =~ ^[0-9]+$ ]]; then
    echo -e "${RED}Error: MAX_SUPPLY must be a non-negative integer${NC}"
    exit 1
fi

echo -e "${GREEN}Deployment Configuration:${NC}"
echo -e "  Network:        ${BLUE}${NETWORK}${NC}"
echo -e "  Owner:          ${GREEN}${OWNER_ADDRESS}${NC}"
echo -e "  Max Supply:     ${GREEN}${MAX_SUPPLY}${NC} (0 = unlimited)"
echo ""

# Get XLM native asset contract address for the network
echo -e "${YELLOW}Getting XLM native asset contract address for ${NETWORK}...${NC}"
XLM_ADDRESS=$(soroban contract id asset --asset native --network "$NETWORK" 2>&1)

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to get XLM contract address${NC}"
    echo "$XLM_ADDRESS"
    exit 1
fi

# Clean up the address (remove any extra output)
XLM_ADDRESS=$(echo "$XLM_ADDRESS" | grep -oE '^[A-Z0-9]{56}$' | head -1)

if [ -z "$XLM_ADDRESS" ]; then
    echo -e "${RED}Error: Could not parse XLM contract address${NC}"
    echo "Raw output: $XLM_ADDRESS"
    exit 1
fi

echo -e "${GREEN}XLM Contract Address: ${XLM_ADDRESS}${NC}"
echo ""

# Check if contract is already built
WASM_PATH="target/wasm32v1-none/release/nft_collection.wasm"
if [ ! -f "$WASM_PATH" ]; then
    echo -e "${YELLOW}Contract not built. Building now...${NC}"
    
    # Try soroban contract build first
    if command -v soroban &> /dev/null; then
        echo -e "${YELLOW}Building with soroban contract build...${NC}"
        soroban contract build 2>&1 || {
            echo -e "${YELLOW}soroban contract build failed, trying cargo build...${NC}"
            cargo build --target wasm32v1-none --release
        }
    else
        echo -e "${YELLOW}Building with cargo...${NC}"
        cargo build --target wasm32v1-none --release
    fi
    
    if [ ! -f "$WASM_PATH" ]; then
        echo -e "${RED}Error: Build failed. WASM file not found at ${WASM_PATH}${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Build successful${NC}"
    echo ""
else
    echo -e "${GREEN}Using existing build: ${WASM_PATH}${NC}"
    echo -e "${YELLOW}Note: If you made changes, rebuild with: cargo build --target wasm32v1-none --release${NC}"
    echo ""
fi

# Set network-specific fee
case "$NETWORK" in
    mainnet)
        FEE="100000"  # 0.01 XLM
        ;;
    testnet|futurenet)
        FEE="100"     # 0.00001 XLM
        ;;
    *)
        FEE="100000"
        ;;
esac

# Deploy the contract
echo -e "${YELLOW}Deploying contract to ${NETWORK}...${NC}"
echo -e "${YELLOW}⚠️  IMPORTANT: The '--' separator is REQUIRED before constructor arguments!${NC}"
echo ""

DEPLOY_CMD="soroban contract deploy \
    --wasm ${WASM_PATH} \
    --source \"${SECRET_KEY}\" \
    --network ${NETWORK} \
    --fee ${FEE} \
    -- \
    --owner \"${OWNER_ADDRESS}\" \
    --native_asset_address \"${XLM_ADDRESS}\" \
    --max_supply ${MAX_SUPPLY}"

echo -e "${BLUE}Command:${NC}"
echo "$DEPLOY_CMD" | sed 's/--source "[^"]*"/--source "S***"/'
echo ""

CONTRACT_ID=$(eval "$DEPLOY_CMD" 2>&1)

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Deployment failed${NC}"
    echo "$CONTRACT_ID"
    
    # Provide helpful error messages
    if echo "$CONTRACT_ID" | grep -q "TxInsufficientFee"; then
        echo ""
        echo -e "${YELLOW}Tip: Try increasing the fee:${NC}"
        echo "  Edit this script and change FEE to 500000 (0.05 XLM) or higher"
    elif echo "$CONTRACT_ID" | grep -q "insufficient balance"; then
        echo ""
        echo -e "${YELLOW}Tip: Make sure your account has enough XLM for deployment fees${NC}"
    elif echo "$CONTRACT_ID" | grep -q "network"; then
        echo ""
        echo -e "${YELLOW}Tip: Check your network configuration:${NC}"
        echo "  soroban network ls"
        echo "  soroban network info ${NETWORK}"
    fi
    
    exit 1
fi

# Extract contract ID from output
CONTRACT_ID=$(echo "$CONTRACT_ID" | grep -oE '[A-Z0-9]{56}' | head -1)

if [ -z "$CONTRACT_ID" ]; then
    echo -e "${RED}Error: Could not extract contract ID from deployment output${NC}"
    echo "Raw output:"
    echo "$CONTRACT_ID"
    exit 1
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          ✓ Contract Deployed Successfully!              ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Contract ID:${NC} ${BLUE}${CONTRACT_ID}${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Save this contract ID"
echo "2. Update your environment variables:"
echo ""
echo -e "   ${BLUE}For ${NETWORK}:${NC}"
if [ "$NETWORK" = "mainnet" ]; then
    echo "   NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=${CONTRACT_ID}"
else
    NETWORK_UPPER=$(echo "$NETWORK" | tr '[:lower:]' '[:upper:]')
    echo "   NEXT_PUBLIC_NFT_CONTRACT_ADDRESS_${NETWORK_UPPER}=${CONTRACT_ID}"
fi
echo ""
echo "3. Verify the deployment:"
echo ""
echo "   soroban contract invoke \\"
echo "     --id ${CONTRACT_ID} \\"
echo "     --source ${SECRET_KEY} \\"
echo "     --network ${NETWORK} \\"
echo "     -- name"
echo ""
echo -e "${GREEN}The constructor has been called and storage is initialized.${NC}"
