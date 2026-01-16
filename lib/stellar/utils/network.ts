import { WalletNetwork } from "@creit.tech/stellar-wallets-kit";

/**
 * Get Stellar network configuration from environment variables
 * Adapts from Vite's import.meta.env to Next.js's process.env
 */
export const getStellarNetworkConfig = () => {
  const network = (process.env.NEXT_PUBLIC_STELLAR_NETWORK ||
    "TESTNET") as "PUBLIC" | "FUTURENET" | "TESTNET" | "LOCAL" | "STANDALONE";

  const networkPassphrase =
    (process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ||
      "Test SDF Network ; September 2015") as WalletNetwork;

  // Get RPC URL based on network, defaulting to testnet
  const getRpcUrlForNetwork = (net: string): string => {
    const normalizedNet = net.toUpperCase();
    switch (normalizedNet) {
      case "PUBLIC":
      case "MAINNET":
        return "https://rpc-mainnet.stellar.org";
      case "TESTNET":
        // Use gateway.fm as it's more reliable and has better CORS support
        return "https://soroban-rpc.testnet.stellar.gateway.fm";
      case "FUTURENET":
        return "https://rpc-futurenet.stellar.org";
      case "LOCAL":
      case "STANDALONE":
        return "http://localhost:8000/soroban/rpc";
      default:
        return "https://soroban-rpc.testnet.stellar.gateway.fm"; // Default to testnet
    }
  };

  // Get RPC URL - environment variable takes precedence, then network-based selection
  const rpcUrl = process.env.NEXT_PUBLIC_STELLAR_RPC_URL || getRpcUrlForNetwork(network);

  const horizonUrl =
    process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL ||
    "https://horizon-testnet.stellar.org";

  return {
    stellarNetwork: network === "STANDALONE" ? "LOCAL" : network,
    networkPassphrase,
    rpcUrl,
    horizonUrl,
  };
};

/**
 * Get Horizon URL for a given network name
 */
export const getHorizonUrlForNetwork = (networkName: string | undefined): string => {
  if (!networkName) {
    return getStellarNetworkConfig().horizonUrl;
  }

  const normalizedNetwork = networkName.toUpperCase();
  
  switch (normalizedNetwork) {
    case "PUBLIC":
    case "MAINNET":
      return "https://horizon.stellar.org";
    case "TESTNET":
      return "https://horizon-testnet.stellar.org";
    case "FUTURENET":
      return "https://horizon-futurenet.stellar.org";
    case "LOCAL":
    case "STANDALONE":
      return "http://localhost:8000";
    default:
      // Fallback to testnet if unknown
      return "https://horizon-testnet.stellar.org";
  }
};

export const { stellarNetwork, networkPassphrase, rpcUrl, horizonUrl } =
  getStellarNetworkConfig();

/**
 * Get NFT contract address from environment variable
 * @returns The NFT contract address, or empty string if not configured
 */
export const getNFTContractAddress = (): string => {
  return process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || "";
};
