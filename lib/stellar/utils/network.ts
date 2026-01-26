import { WalletNetwork } from '@creit.tech/stellar-wallets-kit';

/**
 * Check if we're in production environment
 * Uses PRODUCTION env var, or Vercel's VERCEL_ENV, or NODE_ENV as fallback
 */
const isProduction = (): boolean => {
  // Check explicit PRODUCTION env var first
  if (process.env.PRODUCTION !== undefined) {
    return process.env.PRODUCTION === 'true';
  }

  // Check Vercel's environment variable
  if (process.env.VERCEL_ENV === 'production') {
    return true;
  }

  // Fallback to NODE_ENV
  return process.env.NODE_ENV === 'production';
};

/**
 * Get Stellar network configuration from environment variables
 * Automatically uses MAINNET in production, TESTNET in development
 * Can be overridden with NEXT_PUBLIC_STELLAR_NETWORK env var
 */
export const getStellarNetworkConfig = () => {
  // Determine default network based on environment
  const isProd = isProduction();
  const defaultNetwork = isProd ? 'PUBLIC' : 'TESTNET';

  // Allow explicit override via env var
  const network = (process.env.NEXT_PUBLIC_STELLAR_NETWORK ||
    defaultNetwork) as
    | 'PUBLIC'
    | 'FUTURENET'
    | 'TESTNET'
    | 'LOCAL'
    | 'STANDALONE';

  // Set network passphrase based on network
  // Allow explicit override via env var
  let networkPassphrase: WalletNetwork;
  if (process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE) {
    networkPassphrase = process.env
      .NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE as WalletNetwork;
  } else {
    // Auto-set passphrase based on network
    const normalizedNetwork = network.toUpperCase();
    if (normalizedNetwork === 'PUBLIC' || normalizedNetwork === 'MAINNET') {
      networkPassphrase =
        'Public Global Stellar Network ; September 2015' as WalletNetwork;
    } else if (normalizedNetwork === 'TESTNET') {
      networkPassphrase = 'Test SDF Network ; September 2015' as WalletNetwork;
    } else if (normalizedNetwork === 'FUTURENET') {
      networkPassphrase =
        'Test SDF Future Network ; October 2022' as WalletNetwork;
    } else {
      // Default to testnet passphrase
      networkPassphrase = 'Test SDF Network ; September 2015' as WalletNetwork;
    }
  }

  // Get RPC URL based on network, defaulting to testnet
  const getRpcUrlForNetwork = (net: string): string => {
    const normalizedNet = net.toUpperCase();
    switch (normalizedNet) {
      case 'PUBLIC':
      case 'MAINNET':
        // Use gateway.fm for mainnet (same as Soroban CLI default)
        return 'https://soroban-rpc.mainnet.stellar.gateway.fm';
      case 'TESTNET':
        // Use gateway.fm as it's more reliable and has better CORS support
        return 'https://soroban-rpc.testnet.stellar.gateway.fm';
      case 'FUTURENET':
        return 'https://rpc-futurenet.stellar.org';
      case 'LOCAL':
      case 'STANDALONE':
        return 'http://localhost:8000/soroban/rpc';
      default:
        return 'https://soroban-rpc.testnet.stellar.gateway.fm'; // Default to testnet
    }
  };

  // Get RPC URL - environment variable takes precedence, then network-based selection
  const rpcUrl =
    process.env.NEXT_PUBLIC_STELLAR_RPC_URL || getRpcUrlForNetwork(network);

  // Get Horizon URL based on network if not explicitly provided
  const getHorizonUrlForNetworkInternal = (net: string): string => {
    const normalizedNet = net.toUpperCase();
    switch (normalizedNet) {
      case 'PUBLIC':
      case 'MAINNET':
        return 'https://horizon.stellar.org';
      case 'TESTNET':
        return 'https://horizon-testnet.stellar.org';
      case 'FUTURENET':
        return 'https://horizon-futurenet.stellar.org';
      case 'LOCAL':
      case 'STANDALONE':
        return 'http://localhost:8000';
      default:
        return 'https://horizon-testnet.stellar.org';
    }
  };

  const horizonUrl =
    process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL ||
    getHorizonUrlForNetworkInternal(network);

  return {
    stellarNetwork: network === 'STANDALONE' ? 'LOCAL' : network,
    networkPassphrase,
    rpcUrl,
    horizonUrl,
  };
};

/**
 * Get Horizon URL for a given network name
 */
export const getHorizonUrlForNetwork = (
  networkName: string | undefined
): string => {
  if (!networkName) {
    return getStellarNetworkConfig().horizonUrl;
  }

  const normalizedNetwork = networkName.toUpperCase();

  switch (normalizedNetwork) {
    case 'PUBLIC':
    case 'MAINNET':
      return 'https://horizon.stellar.org';
    case 'TESTNET':
      return 'https://horizon-testnet.stellar.org';
    case 'FUTURENET':
      return 'https://horizon-futurenet.stellar.org';
    case 'LOCAL':
    case 'STANDALONE':
      return 'http://localhost:8000';
    default:
      // Fallback to testnet if unknown
      return 'https://horizon-testnet.stellar.org';
  }
};

export const { stellarNetwork, networkPassphrase, rpcUrl, horizonUrl } =
  getStellarNetworkConfig();

/**
 * Check if the current network is mainnet (PUBLIC)
 */
export const isMainnet = (): boolean => {
  const network = getStellarNetworkConfig().stellarNetwork;
  const normalized = network.toUpperCase();
  return normalized === 'PUBLIC' || normalized === 'MAINNET';
};

/**
 * Check if the current network is testnet
 */
export const isTestnet = (): boolean => {
  const network = getStellarNetworkConfig().stellarNetwork;
  const normalized = network.toUpperCase();
  return normalized === 'TESTNET';
};

/**
 * Get the current network name (normalized)
 * @returns 'PUBLIC' for mainnet, 'TESTNET' for testnet, etc.
 */
export const getCurrentNetwork = (): string => {
  return getStellarNetworkConfig().stellarNetwork.toUpperCase();
};

/**
 * Get NFT contract address from environment variable
 * Supports network-specific addresses with fallback to single address
 *
 * Priority:
 * 1. NEXT_PUBLIC_NFT_CONTRACT_ADDRESS_MAINNET (if on mainnet)
 * 2. NEXT_PUBLIC_NFT_CONTRACT_ADDRESS_TESTNET (if on testnet)
 * 3. NEXT_PUBLIC_NFT_CONTRACT_ADDRESS (fallback for all networks)
 *
 * @param customNetworkPassphrase - Optional network passphrase to determine network (uses wallet's network if provided)
 * @returns The NFT contract address, or empty string if not configured
 */
export const getNFTContractAddress = (
  customNetworkPassphrase?: string
): string => {
  // Determine network from passphrase if provided, otherwise use app config
  let network: string;
  if (customNetworkPassphrase) {
    if (customNetworkPassphrase.includes('Public')) {
      network = 'PUBLIC';
    } else if (
      customNetworkPassphrase.includes('Test') &&
      !customNetworkPassphrase.includes('Future')
    ) {
      network = 'TESTNET';
    } else if (customNetworkPassphrase.includes('Future')) {
      network = 'FUTURENET';
    } else {
      network = getCurrentNetwork();
    }
  } else {
    network = getCurrentNetwork();
  }

  // Try network-specific address first
  if (network === 'PUBLIC' || network === 'MAINNET') {
    const mainnetAddress = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS_MAINNET;
    if (mainnetAddress) return mainnetAddress.trim();
  } else if (network === 'TESTNET') {
    const testnetAddress = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS_TESTNET;
    if (testnetAddress) return testnetAddress.trim();
  }

  // Fallback to generic address
  const fallbackAddress = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || '';
  return fallbackAddress.trim();
};

/**
 * Get Simple Payment contract address from environment variable
 * Supports network-specific addresses with fallback to single address
 *
 * Priority:
 * 1. NEXT_PUBLIC_SIMPLE_PAYMENT_CONTRACT_ADDRESS_MAINNET (if on mainnet)
 * 2. NEXT_PUBLIC_SIMPLE_PAYMENT_CONTRACT_ADDRESS_TESTNET (if on testnet)
 * 3. NEXT_PUBLIC_SIMPLE_PAYMENT_CONTRACT_ADDRESS (fallback for all networks)
 *
 * @param customNetworkPassphrase - Optional network passphrase to determine network (uses wallet's network if provided)
 * @returns The Simple Payment contract address, or empty string if not configured
 */
export const getSimplePaymentContractAddress = (
  customNetworkPassphrase?: string
): string => {
  // Determine network from passphrase if provided, otherwise use app config
  let network: string;
  if (customNetworkPassphrase) {
    if (customNetworkPassphrase.includes('Public')) {
      network = 'PUBLIC';
    } else if (
      customNetworkPassphrase.includes('Test') &&
      !customNetworkPassphrase.includes('Future')
    ) {
      network = 'TESTNET';
    } else if (customNetworkPassphrase.includes('Future')) {
      network = 'FUTURENET';
    } else {
      network = getCurrentNetwork();
    }
  } else {
    network = getCurrentNetwork();
  }

  // Try network-specific address first
  if (network === 'PUBLIC' || network === 'MAINNET') {
    const mainnetAddress =
      process.env.NEXT_PUBLIC_SIMPLE_PAYMENT_CONTRACT_ADDRESS_MAINNET;
    if (mainnetAddress) return mainnetAddress.trim();
  } else if (network === 'TESTNET') {
    const testnetAddress =
      process.env.NEXT_PUBLIC_SIMPLE_PAYMENT_CONTRACT_ADDRESS_TESTNET;
    if (testnetAddress) return testnetAddress.trim();
  }

  // Fallback to generic address
  const fallbackAddress =
    process.env.NEXT_PUBLIC_SIMPLE_PAYMENT_CONTRACT_ADDRESS || '';
  return fallbackAddress.trim();
};
