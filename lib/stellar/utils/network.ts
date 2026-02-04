import { WalletNetwork } from '@creit.tech/stellar-wallets-kit';

/**
 * Get Stellar network configuration from environment variables
 * Adapts from Vite's import.meta.env to Next.js's process.env
 */
export const getStellarNetworkConfig = () => {
  const network = (process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'TESTNET') as
    | 'PUBLIC'
    | 'FUTURENET'
    | 'TESTNET'
    | 'LOCAL'
    | 'STANDALONE';

  const networkPassphrase = (process.env
    .NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ||
    'Test SDF Network ; September 2015') as WalletNetwork;

  // Get RPC URL based on network, defaulting to testnet
  const getRpcUrlForNetwork = (net: string): string => {
    const normalizedNet = net.toUpperCase();
    switch (normalizedNet) {
      case 'PUBLIC':
      case 'MAINNET':
        // Use gateway.fm for mainnet as it's more reliable
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

  // Get Horizon URL based on network
  const getHorizonUrlForNetwork = (net: string): string => {
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
        return 'https://horizon-testnet.stellar.org'; // Default to testnet
    }
  };

  const horizonUrl =
    process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL ||
    getHorizonUrlForNetwork(network);

  return {
    stellarNetwork: network === 'STANDALONE' ? 'LOCAL' : network,
    networkPassphrase,
    rpcUrl,
    horizonUrl,
  };
};

/**
 * Get Soroban RPC URL for a given network name (testnet, mainnet, futurenet, etc.)
 */
export const getRpcUrlForNetwork = (
  networkName: string | undefined
): string => {
  if (!networkName) {
    return getStellarNetworkConfig().rpcUrl;
  }
  const normalizedNet = networkName.toUpperCase();
  switch (normalizedNet) {
    case 'PUBLIC':
    case 'MAINNET':
      return 'https://soroban-rpc.mainnet.stellar.gateway.fm';
    case 'TESTNET':
      return 'https://soroban-rpc.testnet.stellar.gateway.fm';
    case 'FUTURENET':
      return 'https://rpc-futurenet.stellar.org';
    case 'LOCAL':
    case 'STANDALONE':
      return 'http://localhost:8000/soroban/rpc';
    default:
      return 'https://soroban-rpc.testnet.stellar.gateway.fm';
  }
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
 * Get NFT contract address from environment variable based on network
 * @param networkPassphrase - Optional network passphrase from wallet. If provided, uses wallet's network instead of app config.
 * @returns The NFT contract address, or empty string if not configured
 */
export const getNFTContractAddress = (networkPassphrase?: string): string => {
  // Determine network from wallet's passphrase if provided, otherwise use app config
  let isMainnet = false;

  if (networkPassphrase) {
    // Check wallet's network from passphrase
    isMainnet =
      networkPassphrase.includes('Public') ||
      networkPassphrase.includes('Public Global Stellar Network');
  } else {
    // Fall back to app config
    const network =
      stellarNetwork || process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'TESTNET';
    const normalizedNetwork = network.toUpperCase();
    isMainnet =
      normalizedNetwork === 'PUBLIC' || normalizedNetwork === 'MAINNET';
  }

  if (isMainnet) {
    return process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS_MAINNET || '';
  } else {
    return process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS_TESTNET || '';
  }
};

/**
 * Get Simple Payment contract address from environment variable based on network
 * @param networkPassphrase - Optional network passphrase from wallet. If provided, uses wallet's network instead of app config.
 * @returns The Simple Payment contract address, or empty string if not configured
 */
export const getSimplePaymentContractAddress = (
  networkPassphrase?: string
): string => {
  // Determine network from wallet's passphrase if provided, otherwise use app config
  let isMainnet = false;

  if (networkPassphrase) {
    // Check wallet's network from passphrase
    isMainnet =
      networkPassphrase.includes('Public') ||
      networkPassphrase.includes('Public Global Stellar Network');
  } else {
    // Fall back to app config
    const network =
      stellarNetwork || process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'TESTNET';
    const normalizedNetwork = network.toUpperCase();
    isMainnet =
      normalizedNetwork === 'PUBLIC' || normalizedNetwork === 'MAINNET';
  }

  if (isMainnet) {
    return (
      process.env.NEXT_PUBLIC_SIMPLE_PAYMENT_CONTRACT_ADDRESS_MAINNET || ''
    );
  } else {
    return (
      process.env.NEXT_PUBLIC_SIMPLE_PAYMENT_CONTRACT_ADDRESS_TESTNET || ''
    );
  }
};

/**
 * Get the claim-points (rewards) token contract address for the given network.
 * The simple payment contract sends this token via send_token(token_address, recipient, amount).
 * @param networkPassphrase - Optional network passphrase. If provided, uses wallet's network.
 * @returns The claim-points token contract address, or empty string if not configured
 */
export const getClaimPointsTokenAddress = (
  networkPassphrase?: string
): string => {
  let isMainnet = false;

  if (networkPassphrase) {
    isMainnet =
      networkPassphrase.includes('Public') ||
      networkPassphrase.includes('Public Global Stellar Network');
  } else {
    const network =
      stellarNetwork || process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'TESTNET';
    const normalizedNetwork = network.toUpperCase();
    isMainnet =
      normalizedNetwork === 'PUBLIC' || normalizedNetwork === 'MAINNET';
  }

  if (isMainnet) {
    return process.env.NEXT_PUBLIC_CLAIM_POINTS_CONTRACT_ADDRESS_MAINNET || '';
  } else {
    return process.env.NEXT_PUBLIC_CLAIM_POINTS_CONTRACT_ADDRESS_TESTNET || '';
  }
};
