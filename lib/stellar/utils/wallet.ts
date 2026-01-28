import storage from './storage';
import {
  ISupportedWallet,
  StellarWalletsKit,
  WalletNetwork,
  sep43Modules,
} from '@creit.tech/stellar-wallets-kit';
import {
  WalletConnectModule,
  WalletConnectAllowedMethods,
} from '@creit.tech/stellar-wallets-kit/modules/walletconnect.module';
import { Horizon } from '@stellar/stellar-sdk';
import {  getHorizonUrlForNetwork } from './network';

// Get WalletConnect project ID from environment
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

// Build modules array - include WalletConnect if project ID is configured
const modules = [...sep43Modules()];

// Determine network for both WalletConnect module and StellarWalletsKit
// They must use the same network to avoid chainId mismatches
const wcNetworkEnv =
  process.env.NEXT_PUBLIC_WALLETCONNECT_NETWORK?.toUpperCase();
const envNetwork = process.env.NEXT_PUBLIC_STELLAR_NETWORK?.toUpperCase();

// Use explicit WalletConnect network if set
// If not set, we'll default to PUBLIC (mainnet) to support both networks
// WalletConnect will adapt to the user's actual network when they connect
// IMPORTANT: This network must match what we use to initialize the StellarWalletsKit
// Note: WalletConnect module initialization network is just a hint - the actual network
// is determined when the user connects and we detect it from their wallet address
const currentNetwork =
  wcNetworkEnv === 'PUBLIC' || wcNetworkEnv === 'MAINNET'
    ? WalletNetwork.PUBLIC
    : wcNetworkEnv === 'FUTURENET'
      ? WalletNetwork.FUTURENET
      : wcNetworkEnv === 'TESTNET'
        ? WalletNetwork.TESTNET
        : // Default to PUBLIC to support both networks (WalletConnect will adapt)
          // Users can connect on either network and we'll detect and adapt
          WalletNetwork.PUBLIC;

if (walletConnectProjectId) {
  // Get app metadata from environment or use defaults
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'IRL';
  const appDescription =
    process.env.NEXT_PUBLIC_APP_DESCRIPTION || 'IRL Rewards Program';
  const appUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || 'https://irl.xyz';
  const appIcons = process.env.NEXT_PUBLIC_APP_ICONS
    ? [process.env.NEXT_PUBLIC_APP_ICONS]
    : ['https://irl.xyz/favicon.ico'];

  modules.push(
    new WalletConnectModule({
      url: appUrl,
      projectId: walletConnectProjectId,
      method: WalletConnectAllowedMethods.SIGN,
      description: appDescription,
      name: appName,
      icons: appIcons,
      network: currentNetwork,
    })
  );
}

// Initialize kit network to match WalletConnect module initialization
// This ensures consistency between kit network and WalletConnect module network
// Both should use the same network to avoid chainId mismatches
const kitNetwork = walletConnectProjectId
  ? // If WalletConnect is enabled, use the same network as WalletConnect module
    currentNetwork
  : // If WalletConnect is not enabled, use network from environment
    envNetwork === 'PUBLIC' || envNetwork === 'MAINNET'
    ? WalletNetwork.PUBLIC
    : envNetwork === 'FUTURENET'
      ? WalletNetwork.FUTURENET
      : WalletNetwork.TESTNET;

const kit: StellarWalletsKit = new StellarWalletsKit({
  network: kitNetwork,
  modules,
});

export const connectWallet = async () => {
  return new Promise<void>((resolve, reject) => {
    kit
      .openModal({
        modalTitle: 'Connect to your wallet',
        onWalletSelected: async (option: ISupportedWallet) => {
          const selectedId = option.id;
          kit.setWallet(selectedId);

          try {
            // Now open selected wallet's login flow by calling `getAddress` --
            // Yes, it's strange that a getter has a side effect of opening a modal
            const address = await kit.getAddress();

            // Once `getAddress` returns successfully, we know they actually
            // connected the selected wallet, and we set our localStorage
            if (address.address) {
              storage.setItem('walletId', selectedId);
              storage.setItem('walletAddress', address.address);

              // Fetch network for wallets that support network detection
              // NOTE: WalletConnect does NOT support getNetwork(), so skip it
              if (selectedId === 'freighter' || selectedId === 'hot-wallet') {
                try {
                  const network = await kit.getNetwork();
                  if (network.network && network.networkPassphrase) {
                    storage.setItem('walletNetwork', network.network);
                    storage.setItem(
                      'networkPassphrase',
                      network.networkPassphrase
                    );
                  } else {
                    storage.setItem('walletNetwork', '');
                    storage.setItem('networkPassphrase', '');
                  }
                } catch (networkError) {
                  console.warn(
                    '[Stellar] Failed to fetch network after connection:',
                    networkError
                  );
                  // Don't fail the connection if network fetch fails
                }
              } else if (selectedId === 'wallet_connect') {
                // WalletConnect doesn't support getNetwork()
                // Detect network by checking which Horizon server the address exists on
                console.log(
                  '[Stellar] WalletConnect connected - detecting network from wallet address...'
                );
                try {
                  const detectedNetwork = await detectWalletNetwork(
                    address.address
                  );
                  if (detectedNetwork) {
                    console.log(
                      '[Stellar] WalletConnect network detected:',
                      detectedNetwork.network
                    );
                    storage.setItem('walletNetwork', detectedNetwork.network);
                    storage.setItem(
                      'networkPassphrase',
                      detectedNetwork.networkPassphrase
                    );
                  } else {
                    // Account not found on either network (unfunded)
                    // Default to PUBLIC (mainnet) since WalletConnect is initialized with PUBLIC
                    // This ensures users connecting on mainnet get the correct network
                    console.log(
                      '[Stellar] WalletConnect: Account unfunded, defaulting to PUBLIC (mainnet)'
                    );
                    storage.setItem('walletNetwork', 'PUBLIC');
                    storage.setItem(
                      'networkPassphrase',
                      'Public Global Stellar Network ; September 2015'
                    );
                  }
                } catch (detectError) {
                  console.warn(
                    '[Stellar] Failed to detect WalletConnect network:',
                    detectError
                  );
                  // Default to PUBLIC (mainnet) on error since WalletConnect is initialized with PUBLIC
                  storage.setItem('walletNetwork', 'PUBLIC');
                  storage.setItem(
                    'networkPassphrase',
                    'Public Global Stellar Network ; September 2015'
                  );
                }
              }

              // For WalletConnect, ensure state is immediately available
              console.log('[Stellar] Wallet connected successfully:', {
                walletId: selectedId,
                address: address.address,
              });

              // Dispatch a custom event to trigger wallet provider to refresh state
              // Do this immediately, not in setTimeout, so the provider can start updating
              if (typeof window !== 'undefined') {
                console.log('[Stellar] Dispatching walletConnected event');
                window.dispatchEvent(
                  new CustomEvent('walletConnected', {
                    detail: {
                      walletId: selectedId,
                      address: address.address,
                    },
                  })
                );
              }

              // Resolve after a small delay to ensure WalletConnect state is fully established
              setTimeout(() => {
                resolve();
              }, 300);
            } else {
              storage.setItem('walletId', '');
              storage.setItem('walletAddress', '');
              reject(new Error('No address returned from wallet'));
            }
          } catch (error) {
            storage.setItem('walletId', '');
            storage.setItem('walletAddress', '');
            reject(error);
          }
        },
      })
      .catch((error) => {
        reject(error);
      });
  });
};

export const disconnectWallet = async () => {
  try {
    await kit.disconnect();
  } catch (error) {
    console.warn('[Stellar] Error disconnecting from kit:', error);
    // Continue with cleanup even if kit.disconnect() fails
  }

  // Clear all wallet-related storage
  storage.removeItem('walletId');
  storage.removeItem('walletAddress');
  storage.removeItem('walletNetwork');
  storage.removeItem('networkPassphrase');

  // Dispatch a custom event to trigger wallet provider to update state immediately
  if (typeof window !== 'undefined') {
    console.log('[Stellar] Dispatching walletDisconnected event');
    window.dispatchEvent(new CustomEvent('walletDisconnected'));
  }
};

/**
 * Check and update network. For wallets like Freighter and Hot-wallet,
 * the network is controlled by the wallet extension. This function
 * will check the wallet's current network and update storage accordingly.
 * The wallet provider's polling mechanism will detect when the user switches
 * networks in their wallet extension.
 */
export const switchNetwork = async (
  network: 'PUBLIC' | 'TESTNET' | 'FUTURENET'
): Promise<void> => {
  const walletId = storage.getItem('walletId');
  if (!walletId) {
    throw new Error('No wallet connected');
  }

  // WalletConnect doesn't support getNetwork(), so handle it separately
  if (walletId === 'wallet_connect') {
    const networkPassphrase =
      network === 'PUBLIC'
        ? 'Public Global Stellar Network ; September 2015'
        : network === 'FUTURENET'
          ? 'Test SDF Future Network ; October 2022'
          : 'Test SDF Network ; September 2015';

    storage.setItem('walletNetwork', network);
    storage.setItem('networkPassphrase', networkPassphrase);

    // Dispatch event to trigger wallet provider refresh
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('walletNetworkChanged', {
          detail: { network, networkPassphrase },
        })
      );
    }

    console.log(
      '[Stellar] Network preference updated for WalletConnect:',
      network
    );
    return;
  }

  // Freighter and Hot-wallet support network detection via getNetwork()
  if (walletId !== 'freighter' && walletId !== 'hot-wallet') {
    throw new Error(
      `Network switching not supported for wallet: ${walletId}. Please switch networks in your wallet extension.`
    );
  }

  // Set the wallet first
  kit.setWallet(walletId);

  // Get the current network from the wallet
  const networkInfo = await kit.getNetwork();
  if (networkInfo.network && networkInfo.networkPassphrase) {
    storage.setItem('walletNetwork', networkInfo.network);
    storage.setItem('networkPassphrase', networkInfo.networkPassphrase);

    // Check if the wallet's network matches what we requested
    const walletNetworkUpper = networkInfo.network.toUpperCase();
    const requestedNetworkUpper = network.toUpperCase();

    // For PUBLIC network, check if it's "MAINNET" as well
    const isPublicNetwork =
      walletNetworkUpper === 'PUBLIC' || walletNetworkUpper === 'MAINNET';
    const requestingPublic = requestedNetworkUpper === 'PUBLIC';

    if (!isPublicNetwork && requestingPublic) {
      throw new Error(
        `Please switch your ${walletId} wallet to Mainnet (Public Network) in your wallet extension.`
      );
    } else if (
      walletNetworkUpper !== requestedNetworkUpper &&
      !requestingPublic
    ) {
      const networkName =
        requestedNetworkUpper === 'TESTNET' ? 'Testnet' : requestedNetworkUpper;
      throw new Error(
        `Please switch your ${walletId} wallet to ${networkName} in your wallet extension.`
      );
    }

    console.log('[Stellar] Network updated:', networkInfo.network);
  } else {
    throw new Error('Could not get network information from wallet');
  }
};

// Cache Horizon servers by network to avoid recreating them
const horizonServers: Map<string, Horizon.Server> = new Map();

const getHorizonServer = (networkName?: string) => {
  const url = getHorizonUrlForNetwork(networkName);
  const normalizedNetwork = networkName?.toUpperCase() || 'TESTNET';
  const isLocal =
    normalizedNetwork === 'LOCAL' || normalizedNetwork === 'STANDALONE';

  if (!horizonServers.has(url)) {
    const server = new Horizon.Server(url, {
      allowHttp: isLocal,
    });
    horizonServers.set(url, server);
    console.log(
      '[Stellar] Horizon server initialized:',
      url,
      'Network:',
      normalizedNetwork
    );
  }

  return horizonServers.get(url)!;
};

const formatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 7,
});

export type MappedBalances = Record<
  string,
  Horizon.HorizonApi.BalanceLine & { formattedBalance?: string }
>;

export type FetchBalancesResult = {
  balances: MappedBalances;
  accountExists: boolean;
};

/**
 * Detect which Stellar network a wallet address exists on
 * Checks both testnet and mainnet Horizon servers
 */
/**
 * Convert network passphrase to WalletConnect chainId format
 * @param networkPassphrase - The Stellar network passphrase
 * @returns WalletConnect chainId (e.g., "stellar:testnet" or "stellar:mainnet")
 */
export const getWalletConnectChainId = (networkPassphrase?: string): string => {
  if (!networkPassphrase) {
    return 'stellar:testnet'; // Default to testnet
  }

  if (networkPassphrase.includes('Test')) {
    return 'stellar:testnet';
  } else if (networkPassphrase.includes('Public')) {
    return 'stellar:mainnet';
  } else if (networkPassphrase.includes('Future')) {
    return 'stellar:futurenet';
  }

  return 'stellar:testnet'; // Default fallback
};

/**
 * Detect which Stellar network a wallet address exists on
 * Checks both testnet and mainnet Horizon servers
 */
export const detectWalletNetwork = async (
  address: string
): Promise<{ network: string; networkPassphrase: string } | null> => {
  const { Horizon } = await import('@stellar/stellar-sdk');

  // Check both networks in parallel to see which one the account exists on
  // Note: An account can exist on both networks, so we check both
  const testnetServer = new Horizon.Server(
    'https://horizon-testnet.stellar.org'
  );
  const mainnetServer = new Horizon.Server('https://horizon.stellar.org');

  const [testnetResult, mainnetResult] = await Promise.allSettled([
    testnetServer.accounts().accountId(address).call(),
    mainnetServer.accounts().accountId(address).call(),
  ]);

  const testnetExists = testnetResult.status === 'fulfilled';
  const mainnetExists = mainnetResult.status === 'fulfilled';

  console.log('[Stellar] Network detection results:', {
    address,
    testnetExists,
    mainnetExists,
  });

  // If account exists on both networks, prefer mainnet (PUBLIC) since WalletConnect
  // is initialized with PUBLIC by default. This ensures users connecting on mainnet
  // get the correct network even if their account exists on both networks.
  // If only one exists, use that one
  if (mainnetExists) {
    console.log('[Stellar] Wallet detected on MAINNET:', address);
    return {
      network: 'PUBLIC',
      networkPassphrase: 'Public Global Stellar Network ; September 2015',
    };
  } else if (testnetExists) {
    console.log('[Stellar] Wallet detected on TESTNET:', address);
    return {
      network: 'TESTNET',
      networkPassphrase: 'Test SDF Network ; September 2015',
    };
  } else {
    // Account not found on either network (unfunded)
    console.log(
      '[Stellar] Wallet not found on either network (unfunded):',
      address
    );
    return null;
  }
};

export const fetchBalances = async (
  address: string,
  networkName?: string
): Promise<FetchBalancesResult> => {
  try {
    const server = getHorizonServer(networkName);
    console.log(
      '[Stellar] Fetching balances for address:',
      address,
      'on network:',
      networkName || 'default'
    );
    const account = await server.accounts().accountId(address).call();
    console.log('[Stellar] Account data received:', {
      balances: account.balances.length,
      accountId: account.account_id,
    });

    const mapped = account.balances.reduce((acc, b) => {
      const balanceNum = Number(b.balance);
      const formattedBalance = formatter.format(balanceNum);
      const key =
        b.asset_type === 'native'
          ? 'xlm'
          : b.asset_type === 'liquidity_pool_shares'
            ? b.liquidity_pool_id
            : `${b.asset_code}:${b.asset_issuer}`;

      // Create a new object with the formatted balance, preserving original
      acc[key] = {
        ...b,
        formattedBalance,
      };

      console.log('[Stellar] Balance:', key, '=', formattedBalance, 'XLM');
      return acc;
    }, {} as MappedBalances);

    console.log('[Stellar] Mapped balances:', Object.keys(mapped));
    return { balances: mapped, accountExists: true };
  } catch (err) {
    // `not found` is sort of expected, indicating an unfunded wallet, which
    // the consumer of `balances` can understand via the lack of `xlm` key.
    // If the error does NOT match 'not found', log the error.
    if (err instanceof Error) {
      if (err.message.match(/not found/i)) {
        console.log(
          '[Stellar] Account not found (unfunded) on network:',
          networkName || 'default',
          'Address:',
          address
        );
        // Return empty balances and mark account as not existing
        return { balances: {}, accountExists: false };
      } else {
        console.error('[Stellar] Error fetching balances:', err.message, err);
        // For other errors, we don't know if account exists, so return true to allow retry
        return { balances: {}, accountExists: true };
      }
    } else {
      console.error('[Stellar] Unknown error fetching balances:', err);
      return { balances: {}, accountExists: true };
    }
  }
};

export const wallet = kit;
