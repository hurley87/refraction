This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Environment Variables

Create a `.env.local` file in the root directory and add:

```bash
MAPBOX_ACCESS_TOKEN=your_mapbox_access_token_here
GOOGLE_PLACES_API_KEY=your_google_places_api_key_here

# Stellar Network Configuration
# The app automatically uses MAINNET in production and TESTNET in development
# You can override this behavior with the env vars below

# Production Detection (optional)
# Set to "true" for production/mainnet, "false" for development/testnet
# If not set, the app uses VERCEL_ENV or NODE_ENV to determine production status
PRODUCTION=false

# Network Override (optional - only needed if you want to override auto-detection)
# NEXT_PUBLIC_STELLAR_NETWORK=TESTNET  # or PUBLIC for mainnet
# NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"  # Auto-set if not provided
# NEXT_PUBLIC_STELLAR_RPC_URL=https://rpc-futurenet.stellar.org  # Auto-set if not provided
# NEXT_PUBLIC_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org  # Auto-set if not provided

# Contract Addresses (optional - supports network-specific addresses)
# Option 1: Network-specific addresses (recommended for production)
# NEXT_PUBLIC_NFT_CONTRACT_ADDRESS_MAINNET=your_mainnet_nft_contract_id
# NEXT_PUBLIC_NFT_CONTRACT_ADDRESS_TESTNET=your_testnet_nft_contract_id
# NEXT_PUBLIC_SIMPLE_PAYMENT_CONTRACT_ADDRESS_MAINNET=your_mainnet_payment_contract_id
# NEXT_PUBLIC_SIMPLE_PAYMENT_CONTRACT_ADDRESS_TESTNET=your_testnet_payment_contract_id

# Option 2: Single address for all networks (fallback)
# NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=your_nft_contract_id
# NEXT_PUBLIC_SIMPLE_PAYMENT_CONTRACT_ADDRESS=your_payment_contract_id

# WalletConnect Configuration (optional, enables WalletConnect wallet option)
# Get your project ID from https://cloud.walletconnect.com
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here

# Optional: Customize WalletConnect app metadata
NEXT_PUBLIC_APP_NAME=Refraction
NEXT_PUBLIC_APP_DESCRIPTION=Refraction Stellar Wallet
NEXT_PUBLIC_APP_URL=https://your-app-url.com
NEXT_PUBLIC_APP_ICONS=https://your-app-url.com/icon1.png,https://your-app-url.com/icon2.png
```

To get these API keys:

- **Mapbox**: Sign up at [mapbox.com](https://mapbox.com) and get your access token
- **Google Places**: Enable the Places API in [Google Cloud Console](https://console.cloud.google.com) and create an API key

**Stellar Network Configuration:**

The app automatically switches between networks based on environment:

- **Development/Local**: Uses `TESTNET` by default
- **Production (Vercel)**: Automatically uses `PUBLIC` (Mainnet) when `PRODUCTION=true` or `VERCEL_ENV=production`

**Production Detection:**

- Set `PRODUCTION=true` in Vercel environment variables for production deployments
- Set `PRODUCTION=false` (or omit) for local development
- The app also checks `VERCEL_ENV` and `NODE_ENV` as fallbacks

**Manual Override:**
If you need to override the automatic network selection, you can set:

- `NEXT_PUBLIC_STELLAR_NETWORK` - `TESTNET`, `PUBLIC`, `FUTURENET`, or `LOCAL`
- `NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE` - Network passphrase (auto-set if not provided)
- `NEXT_PUBLIC_STELLAR_RPC_URL` - Soroban RPC URL (auto-set if not provided)
- `NEXT_PUBLIC_STELLAR_HORIZON_URL` - Horizon API URL (auto-set if not provided)

**Contract Addresses:**
The app supports network-specific contract addresses for easier deployment:

- **Network-specific (recommended)**: Use `_MAINNET` and `_TESTNET` suffixes

  - `NEXT_PUBLIC_NFT_CONTRACT_ADDRESS_MAINNET` - NFT contract on mainnet
  - `NEXT_PUBLIC_NFT_CONTRACT_ADDRESS_TESTNET` - NFT contract on testnet
  - `NEXT_PUBLIC_SIMPLE_PAYMENT_CONTRACT_ADDRESS_MAINNET` - Payment contract on mainnet
  - `NEXT_PUBLIC_SIMPLE_PAYMENT_CONTRACT_ADDRESS_TESTNET` - Payment contract on testnet

- **Single address (fallback)**: Use generic env vars for all networks
  - `NEXT_PUBLIC_NFT_CONTRACT_ADDRESS` - NFT contract (used if network-specific not set)
  - `NEXT_PUBLIC_SIMPLE_PAYMENT_CONTRACT_ADDRESS` - Payment contract (used if network-specific not set)

The app automatically selects the correct address based on the current network.

**Network Options:**

- `TESTNET` - Stellar Testnet (default for development)
- `PUBLIC` - Stellar Mainnet (default for production)
- `FUTURENET` - Stellar Futurenet
- `LOCAL` - Local Stellar network (requires local Horizon server)

**WalletConnect Setup:**

- Sign up at [WalletConnect Cloud](https://cloud.walletconnect.com) to get your project ID
- Add `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` to your `.env.local` file
- WalletConnect will automatically appear as a wallet option in the connection modal
- Optional: Customize app metadata with `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_DESCRIPTION`, `NEXT_PUBLIC_APP_URL`, and `NEXT_PUBLIC_APP_ICONS`

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
