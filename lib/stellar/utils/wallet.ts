import storage from './storage';
import {
  ISupportedWallet,
  StellarWalletsKit,
  WalletNetwork,
  sep43Modules,
  type ModuleInterface,
} from '@creit.tech/stellar-wallets-kit';
import {
  WalletConnectModule,
  WalletConnectAllowedMethods,
} from '@creit.tech/stellar-wallets-kit/modules/walletconnect.module';
import { Horizon } from '@stellar/stellar-sdk';
import {
  networkPassphrase,
  getHorizonUrlForNetwork,
  stellarNetwork,
} from './network';

/**
 * Build the modules array including WalletConnect if configured
 */
const buildModules = (): ModuleInterface[] => {
  const modules = [...sep43Modules()];

  // Add WalletConnect if project ID is configured
  const walletConnectProjectId =
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
  if (walletConnectProjectId) {
    const walletConnectModule = new WalletConnectModule({
      projectId: walletConnectProjectId,
      name: process.env.NEXT_PUBLIC_APP_NAME || 'Refraction',
      description:
        process.env.NEXT_PUBLIC_APP_DESCRIPTION || 'Refraction Stellar Wallet',
      url:
        process.env.NEXT_PUBLIC_APP_URL || typeof window !== 'undefined'
          ? window.location.origin
          : '',
      icons: process.env.NEXT_PUBLIC_APP_ICONS
        ? process.env.NEXT_PUBLIC_APP_ICONS.split(',').map((icon) =>
            icon.trim()
          )
        : [
            typeof window !== 'undefined'
              ? `${window.location.origin}/favicon.ico`
              : '',
          ],
      method: WalletConnectAllowedMethods.SIGN,
      network: networkPassphrase as WalletNetwork,
      onSessionDeleted: (sessionId: string) => {
        console.log('[Stellar] WalletConnect session deleted:', sessionId);
        // Clear storage if the deleted session was the active one
        const currentWalletId = storage.getItem('walletId');
        if (currentWalletId === 'wallet_connect') {
          storage.setItem('walletId', '');
          storage.setItem('walletAddress', '');
          storage.setItem('walletNetwork', '');
          storage.setItem('networkPassphrase', '');
        }
      },
    });
    modules.push(walletConnectModule);
  }

  return modules;
};

const kit: StellarWalletsKit = new StellarWalletsKit({
  network: networkPassphrase as WalletNetwork,
  modules: buildModules(),
});

export const connectWallet = async () => {
  await kit.openModal({
    modalTitle: 'Connect to your wallet',
    onWalletSelected: (option: ISupportedWallet) => {
      const selectedId = option.id;
      kit.setWallet(selectedId);

      // Now open selected wallet's login flow by calling `getAddress` --
      // Yes, it's strange that a getter has a side effect of opening a modal
      void kit.getAddress().then((address) => {
        // Once `getAddress` returns successfully, we know they actually
        // connected the selected wallet, and we set our localStorage
        if (address.address) {
          storage.setItem('walletId', selectedId);
          storage.setItem('walletAddress', address.address);
        } else {
          storage.setItem('walletId', '');
          storage.setItem('walletAddress', '');
        }
      });
      // Handle network detection for wallets that support it
      if (
        selectedId === 'freighter' ||
        selectedId === 'hot-wallet' ||
        selectedId === 'wallet_connect'
      ) {
        void kit
          .getNetwork()
          .then((network) => {
            if (network.network && network.networkPassphrase) {
              storage.setItem('walletNetwork', network.network);
              storage.setItem('networkPassphrase', network.networkPassphrase);
            } else {
              storage.setItem('walletNetwork', '');
              storage.setItem('networkPassphrase', '');
            }
          })
          .catch((error) => {
            console.error('[Stellar] Error getting network:', error);
            // For WalletConnect, fallback to app's network config
            if (selectedId === 'wallet_connect') {
              storage.setItem('walletNetwork', stellarNetwork);
              storage.setItem('networkPassphrase', networkPassphrase);
            }
          });
      }
    },
  });
};

export const disconnectWallet = async () => {
  await kit.disconnect();
  storage.removeItem('walletId');
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

  // Only Freighter, Hot-wallet, and WalletConnect support network detection
  if (
    walletId !== 'freighter' &&
    walletId !== 'hot-wallet' &&
    walletId !== 'wallet_connect'
  ) {
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
