'use client';

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import { wallet, detectWalletNetwork } from '../utils/wallet';
import storage from '../utils/storage';
import { fetchBalances } from '../utils/wallet';
import type { MappedBalances } from '../utils/wallet';

const signTransaction = wallet.signTransaction.bind(wallet);

/**
 * A good-enough implementation of deepEqual.
 *
 * Used in this file to compare MappedBalances.
 *
 * Should maybe add & use a new dependency instead, if needed elsewhere.
 */
function deepEqual<T>(a: T, b: T): boolean {
  if (a === b) {
    return true;
  }

  const bothAreObjects =
    a && b && typeof a === 'object' && typeof b === 'object';

  return Boolean(
    bothAreObjects &&
      Object.keys(a).length === Object.keys(b).length &&
      Object.entries(a).every(([k, v]) => deepEqual(v, b[k as keyof T]))
  );
}

export interface WalletContextType {
  address?: string;
  balances: MappedBalances;
  isPending: boolean;
  network?: string;
  networkPassphrase?: string;
  accountExists: boolean;
  signTransaction: typeof wallet.signTransaction;
  updateBalances: () => Promise<void>;
}

const POLL_INTERVAL = 1000;

export const WalletContext = createContext<WalletContextType>({
  isPending: true,
  balances: {},
  accountExists: true,
  updateBalances: async () => {},
  signTransaction,
});

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  const [balances, setBalances] = useState<MappedBalances>({});
  const [address, setAddress] = useState<string>();
  const [network, setNetwork] = useState<string>();
  const [networkPassphrase, setNetworkPassphrase] = useState<string>();
  const [accountExists, setAccountExists] = useState<boolean>(true);
  const [isPending, startTransition] = useTransition();
  const popupLock = useRef(false);
  const lastFetchedNetwork = useRef<string | undefined>(undefined);
  const lastFetchedAddress = useRef<string | undefined>(undefined);
  const accountExistsRef = useRef<boolean>(true);
  const isFetchingRef = useRef<boolean>(false);
  const hasInitializedRef = useRef<boolean>(false);

  const nullify = () => {
    setAddress(undefined);
    setNetwork(undefined);
    setNetworkPassphrase(undefined);
    setBalances({});
    setAccountExists(true); // Reset to true so we try fetching when a new wallet connects
    accountExistsRef.current = true;
    lastFetchedNetwork.current = undefined;
    lastFetchedAddress.current = undefined;
    hasInitializedRef.current = false; // Reset initialization flag
    storage.setItem('walletId', '');
    storage.setItem('walletAddress', '');
    storage.setItem('walletNetwork', '');
    storage.setItem('networkPassphrase', '');
  };

  const updateBalances = useCallback(async () => {
    if (!address) {
      setBalances({});
      setAccountExists(true); // Reset when no address
      accountExistsRef.current = true;
      isFetchingRef.current = false;
      return;
    }

    // Normalize network for comparison
    const normalizedNetwork = network?.toUpperCase() || 'default';
    const normalizedLastNetwork = lastFetchedNetwork.current?.toUpperCase();

    // Create a unique key for this network/address combination
    const fetchKey = `${normalizedNetwork}:${address}`;
    const lastFetchKey = `${normalizedLastNetwork || 'default'}:${lastFetchedAddress.current || ''}`;

    // If we're already fetching for this key, skip
    if (isFetchingRef.current && fetchKey === lastFetchKey) {
      console.log('[Stellar] Already fetching for', fetchKey, ', skipping');
      return;
    }

    // Check if we've already fetched for this exact network/address combination
    // and the account doesn't exist - don't fetch again
    if (!accountExistsRef.current && fetchKey === lastFetchKey) {
      console.log(
        '[Stellar] Account already known to not exist for',
        fetchKey,
        ', skipping fetch'
      );
      return;
    }

    // If we're fetching for the same key and account exists, check if we really need to refetch
    // (only refetch if balances might have changed, not on every render)
    if (
      accountExistsRef.current &&
      fetchKey === lastFetchKey &&
      !isFetchingRef.current
    ) {
      // Don't refetch if we just fetched - let the polling interval handle updates
      return;
    }

    // Mark as fetching
    isFetchingRef.current = true;

    // Update tracking refs before fetching (use normalized network)
    lastFetchedNetwork.current = network;
    lastFetchedAddress.current = address;

    try {
      // Use the wallet's network if available, otherwise fall back to app config
      const networkToUse = network || undefined;
      console.log('[Stellar] Fetching balances for', fetchKey, {
        address,
        network: networkToUse,
        walletNetwork: network,
      });
      const result = await fetchBalances(address, networkToUse);

      // Update account existence state (both state and ref)
      setAccountExists(result.accountExists);
      accountExistsRef.current = result.accountExists;

      // Only update balances if account exists or if we got balances (account might have been funded)
      if (result.accountExists || Object.keys(result.balances).length > 0) {
        setBalances((prev) => {
          if (deepEqual(result.balances, prev)) return prev;
          return result.balances;
        });
      } else {
        // Account doesn't exist, clear balances
        setBalances({});
      }
    } finally {
      // Always clear fetching flag
      isFetchingRef.current = false;
    }
  }, [address, network]);

  useEffect(() => {
    // Don't do anything if we don't have an address or network
    if (!address || !network) {
      console.log(
        '[Stellar] useEffect: Skipping balance fetch - missing address or network',
        { address: !!address, network: !!network }
      );
      return;
    }

    // Normalize network for comparison
    const normalizedNetwork = network.toUpperCase();
    const normalizedLastNetwork =
      lastFetchedNetwork.current?.toUpperCase() || '';

    // Create fetch key for comparison (use normalized network)
    const currentFetchKey = `${normalizedNetwork}:${address}`;
    const lastFetchKey = `${normalizedLastNetwork}:${lastFetchedAddress.current || ''}`;

    // Check if network or address has changed
    const hasChanged = currentFetchKey !== lastFetchKey;

    console.log('[Stellar] useEffect: Balance fetch check', {
      currentFetchKey,
      lastFetchKey,
      hasChanged,
      accountExists: accountExistsRef.current,
    });

    // If we've already fetched for this exact network/address combination
    // and account doesn't exist, don't fetch again
    if (!hasChanged && !accountExistsRef.current) {
      console.log(
        "[Stellar] Skipping fetch - account doesn't exist for",
        currentFetchKey
      );
      return;
    }

    // If we've already fetched for this exact network/address combination
    // and account exists, don't refetch immediately (let polling handle updates)
    // BUT allow the first fetch if we haven't fetched yet (lastFetchKey is empty)
    if (!hasChanged && accountExistsRef.current && lastFetchKey !== '') {
      console.log(
        '[Stellar] Skipping fetch - already fetched for',
        currentFetchKey
      );
      return;
    }

    // If network/address changed or this is the first fetch, reset accountExists to allow fetch
    if (hasChanged || lastFetchKey === '') {
      if (hasChanged) {
        console.log(
          '[Stellar] Network/address changed, resetting accountExists. From:',
          lastFetchKey,
          'To:',
          currentFetchKey
        );
      } else {
        console.log('[Stellar] First fetch for', currentFetchKey);
      }
      setAccountExists(true);
      accountExistsRef.current = true;
    }

    // Fetch balances (updateBalances will check if we should skip)
    console.log(
      '[Stellar] useEffect: Triggering balance update for',
      currentFetchKey
    );
    void updateBalances();
  }, [updateBalances, address, network]);

  // Poll balances every 10 seconds
  useEffect(() => {
    if (!address || !network) {
      return;
    }

    // Initial fetch
    void updateBalances();

    // Set up interval to fetch balances every 10 seconds
    const balancePollInterval = setInterval(() => {
      console.log('[Stellar] Polling balances (10s interval)');
      void updateBalances();
    }, 10000); // 10 seconds

    // Cleanup interval on unmount or when address/network changes
    return () => {
      clearInterval(balancePollInterval);
    };
  }, [updateBalances, address, network]);

  const updateCurrentWalletState = async () => {
    // There is no way, with StellarWalletsKit, to check if the wallet is
    // installed/connected/authorized. We need to manage that on our side by
    // checking our storage item.
    const walletId = storage.getItem('walletId');
    const walletNetwork = storage.getItem('walletNetwork');
    const walletAddr = storage.getItem('walletAddress');
    const passphrase = storage.getItem('networkPassphrase');

    // Only restore address from storage initially - network will be fetched from wallet
    // This ensures we always get the current network from the wallet, not a stale value from storage
    if (
      !hasInitializedRef.current &&
      address === undefined &&
      network === undefined &&
      walletAddr !== null
    ) {
      console.log(
        '[Stellar] Restoring wallet address from storage, will fetch network from wallet:',
        {
          address: walletAddr,
        }
      );
      // Set address temporarily so we can check wallet state
      // But don't set hasInitializedRef yet - we want to fetch network from wallet
      setAddress(walletAddr);
      // Don't restore network from storage - always fetch from wallet to ensure accuracy
    }

    if (!walletId) {
      nullify();
    } else {
      // For WalletConnect, allow state updates even if popupLock is set
      // This ensures we can detect connections that happen asynchronously
      const isWalletConnect = walletId === 'wallet_connect';
      if (popupLock.current && !isWalletConnect) {
        return;
      }
      // If our storage item is there, then we try to get the user's address &
      // network from their wallet. Note: `getAddress` MAY open their wallet
      // extension, depending on which wallet they select!
      try {
        popupLock.current = true;
        wallet.setWallet(walletId);

        // For Freighter, Hot-wallet, and WalletConnect, always check network to detect changes
        // For other wallets, only check if we don't have an address yet
        const shouldCheckNetwork =
          walletId === 'freighter' ||
          walletId === 'hot-wallet' ||
          walletId === 'wallet_connect';
        if (!shouldCheckNetwork && walletAddr !== null) {
          console.log('[Stellar] Skipping network check for wallet:', walletId);
          return;
        }

        console.log(
          '[Stellar] Checking wallet state for:',
          walletId,
          'shouldCheckNetwork:',
          shouldCheckNetwork
        );

        // For wallets that support network detection, always fetch both address and network
        // This allows us to detect network changes even if address is already known
        // For WalletConnect, use storage address as fallback if getAddress fails
        // NOTE: WalletConnect does NOT support getNetwork(), so we always use storage values
        let addressPromise = wallet.getAddress();
        if (isWalletConnect && walletAddr) {
          // Wrap in a catch to fallback to storage address if getAddress fails
          addressPromise = addressPromise.catch((error) => {
            console.warn(
              '[Stellar] WalletConnect getAddress failed, using storage address:',
              error
            );
            return { address: walletAddr };
          });
        }

        // WalletConnect does not support getNetwork(), so always use storage values
        const networkPromise = isWalletConnect
          ? Promise.resolve({
              network: walletNetwork || undefined,
              networkPassphrase: passphrase || undefined,
            })
          : shouldCheckNetwork
            ? wallet.getNetwork().catch((error) => {
                // For other wallets, if getNetwork fails, try to use storage values
                if (walletNetwork && passphrase) {
                  console.warn(
                    '[Stellar] getNetwork failed, using storage network:',
                    error
                  );
                  return {
                    network: walletNetwork,
                    networkPassphrase: passphrase,
                  };
                }
                throw error;
              })
            : Promise.resolve({
                network: walletNetwork || undefined,
                networkPassphrase: passphrase || undefined,
              });

        const [a, n] = await Promise.all([addressPromise, networkPromise]);

        console.log('[Stellar] Wallet state fetched:', {
          address: a.address,
          network: n.network,
          networkPassphrase: n.networkPassphrase,
          walletId,
        });

        if (!a.address) {
          // For WalletConnect, if address is empty but we have it in storage,
          // use the storage address and set state immediately
          if (isWalletConnect && walletAddr) {
            console.warn(
              '[Stellar] WalletConnect returned empty address but storage has address. ' +
                'Using storage address and setting state immediately.'
            );
            // Use storage address and network
            const storageNetwork = walletNetwork || undefined;
            const storagePassphrase = passphrase || undefined;

            // Set state immediately using storage values
            setAddress(walletAddr);
            if (storageNetwork) {
              setNetwork(storageNetwork);
            }
            if (storagePassphrase) {
              setNetworkPassphrase(storagePassphrase);
            }
            if (!hasInitializedRef.current) {
              hasInitializedRef.current = true;
            }
            popupLock.current = false;
            return;
          }
          storage.setItem('walletId', '');
          return;
        }

        // Always update storage with the latest network from wallet
        // This ensures we have the correct network even if it was changed in the extension
        // For WalletConnect, if network is missing, use app config or storage values
        let effectiveNetwork = n.network;
        let effectivePassphrase = n.networkPassphrase;

        if (isWalletConnect && !effectiveNetwork) {
          // WalletConnect doesn't support getNetwork(), so detect network from wallet address
          if (walletNetwork) {
            console.log(
              '[Stellar] WalletConnect: Using network from storage:',
              walletNetwork
            );
            effectiveNetwork = walletNetwork;
            effectivePassphrase = passphrase || undefined;
          } else if (a.address) {
            // Detect network by checking which Horizon server the address exists on
            console.log(
              '[Stellar] WalletConnect: Detecting network from wallet address...'
            );
            try {
              const detectedNetwork = await detectWalletNetwork(a.address);
              if (detectedNetwork) {
                console.log(
                  '[Stellar] WalletConnect network detected:',
                  detectedNetwork.network
                );
                effectiveNetwork = detectedNetwork.network;
                effectivePassphrase = detectedNetwork.networkPassphrase;
                // Save to storage
                storage.setItem('walletNetwork', detectedNetwork.network);
                storage.setItem(
                  'networkPassphrase',
                  detectedNetwork.networkPassphrase
                );
              } else {
                // Account not found on either network (unfunded)
                // Default to PUBLIC (mainnet) since WalletConnect is initialized with PUBLIC
                console.log(
                  '[Stellar] WalletConnect: Account unfunded, defaulting to PUBLIC (mainnet)'
                );
                effectiveNetwork = 'PUBLIC';
                effectivePassphrase =
                  'Public Global Stellar Network ; September 2015';
                storage.setItem('walletNetwork', 'PUBLIC');
                storage.setItem('networkPassphrase', effectivePassphrase);
              }
            } catch (detectError) {
              console.warn(
                '[Stellar] Failed to detect WalletConnect network:',
                detectError
              );
              // Default to PUBLIC (mainnet) on error since WalletConnect is initialized with PUBLIC
              effectiveNetwork = 'PUBLIC';
              effectivePassphrase =
                'Public Global Stellar Network ; September 2015';
              storage.setItem('walletNetwork', 'PUBLIC');
              storage.setItem('networkPassphrase', effectivePassphrase);
            }
          } else {
            // No address yet, can't detect network - default to PUBLIC (mainnet)
            // since WalletConnect is initialized with PUBLIC
            console.log(
              '[Stellar] WalletConnect: No address yet, defaulting to PUBLIC (mainnet)'
            );
            effectiveNetwork = 'PUBLIC';
            effectivePassphrase =
              'Public Global Stellar Network ; September 2015';
            storage.setItem('walletNetwork', 'PUBLIC');
            storage.setItem('networkPassphrase', effectivePassphrase);
          }
        }

        if (effectiveNetwork && effectivePassphrase) {
          storage.setItem('walletNetwork', effectiveNetwork);
          storage.setItem('networkPassphrase', effectivePassphrase);
        }

        // Normalize network names for comparison (handle case differences)
        const normalizedCurrentNetwork = network?.toUpperCase();
        const normalizedNewNetwork = effectiveNetwork?.toUpperCase();

        // CRITICAL: For WalletConnect, ALWAYS set state when we have address and network
        // This ensures the UI updates immediately after connection and network detection
        if (isWalletConnect && a.address && effectiveNetwork) {
          // Ensure passphrase is set - use detected or fallback to testnet
          const finalPassphrase =
            effectivePassphrase ||
            (effectiveNetwork === 'TESTNET'
              ? 'Test SDF Network ; September 2015'
              : effectiveNetwork === 'PUBLIC'
                ? 'Public Global Stellar Network ; September 2015'
                : 'Test SDF Network ; September 2015');

          console.log(
            '[Stellar] WalletConnect: Setting state with detected network:',
            {
              address: a.address,
              network: effectiveNetwork,
              passphrase: finalPassphrase?.substring(0, 30) + '...',
              currentAddress: address,
              currentNetwork: network,
              networkChanged: normalizedCurrentNetwork !== normalizedNewNetwork,
            }
          );
          storage.setItem('walletAddress', a.address);
          storage.setItem('walletNetwork', effectiveNetwork);
          storage.setItem('networkPassphrase', finalPassphrase);
          setAddress(a.address);
          setNetwork(effectiveNetwork);
          setNetworkPassphrase(finalPassphrase);
          if (!hasInitializedRef.current) {
            hasInitializedRef.current = true;
          }
          // Reset fetch tracking to ensure balances are fetched with correct network
          lastFetchedNetwork.current = undefined;
          lastFetchedAddress.current = undefined;
          setAccountExists(true);
          accountExistsRef.current = true;
          return; // State is set, let balance fetch happen via useEffect
        }

        // If we don't have a network set yet, always set it (even if address matches)
        // This handles the case where we restored address from storage but network wasn't available
        // For WalletConnect, always ensure state is set if we have an address
        if (
          network === undefined ||
          normalizedCurrentNetwork !== normalizedNewNetwork ||
          (isWalletConnect && address === undefined)
        ) {
          console.log('[Stellar] Setting or updating network:', {
            currentNetwork: network,
            newNetwork: effectiveNetwork,
            normalizedCurrent: normalizedCurrentNetwork,
            normalizedNew: normalizedNewNetwork,
            addressMatches: address === a.address,
            isWalletConnect,
            addressUndefined: address === undefined,
          });
          storage.setItem('walletAddress', a.address);
          setAddress(a.address);
          setNetwork(effectiveNetwork);
          setNetworkPassphrase(effectivePassphrase);

          // If this is the first time setting values, mark as initialized
          if (!hasInitializedRef.current) {
            console.log('[Stellar] First time initialization complete');
            hasInitializedRef.current = true;
          }

          // If network changed, reset fetch tracking
          if (normalizedCurrentNetwork !== normalizedNewNetwork) {
            lastFetchedNetwork.current = undefined;
            lastFetchedAddress.current = undefined;
            setAccountExists(true);
            accountExistsRef.current = true;
          }

          return; // Let the useEffect handle balance fetch
        }

        // If values are already set and match exactly, don't do anything
        // This prevents unnecessary state updates during polling
        // BUT: For WalletConnect or when state isn't initialized, always ensure state is set
        const valuesMatch =
          address === a.address &&
          normalizedCurrentNetwork === normalizedNewNetwork &&
          networkPassphrase === n.networkPassphrase &&
          address !== undefined &&
          network !== undefined;

        // For WalletConnect or uninitialized state, always set state even if values match
        // This handles cases where connection succeeded but React state wasn't properly initialized
        if (valuesMatch && (isWalletConnect || !hasInitializedRef.current)) {
          console.log(
            `[Stellar] ${isWalletConnect ? 'WalletConnect' : 'Uninitialized'}: Values match but ensuring state is set`,
            {
              address: a.address,
              network: n.network,
              currentAddress: address,
              currentNetwork: network,
            }
          );
          // Always set state to ensure React state is synchronized
          setAddress(a.address);
          setNetwork(n.network);
          setNetworkPassphrase(n.networkPassphrase);
          // Update storage to ensure consistency
          storage.setItem('walletAddress', a.address);
          if (n.network && n.networkPassphrase) {
            storage.setItem('walletNetwork', n.network);
            storage.setItem('networkPassphrase', n.networkPassphrase);
          }
          if (!hasInitializedRef.current) {
            hasInitializedRef.current = true;
          }
          return; // State is now set, let balance fetch happen
        }

        if (valuesMatch) {
          return; // No change, skip update
        }

        // Only consider it a change if we had a previous value and it's different
        // This prevents undefined -> value from being treated as a change
        const addressChanged = address !== undefined && a.address !== address;
        const networkChanged =
          network !== undefined &&
          (normalizedCurrentNetwork !== normalizedNewNetwork ||
            n.networkPassphrase !== networkPassphrase);

        // Only update if there's an actual change (not initial set)
        // Explicitly check that we had previous values before treating as change
        const hadPreviousValues =
          address !== undefined && network !== undefined;

        if (hadPreviousValues && (addressChanged || networkChanged)) {
          console.log('[Stellar] Wallet state changed:', {
            addressChanged,
            networkChanged,
            oldNetwork: network,
            newNetwork: n.network,
            oldAddress: address,
            newAddress: a.address,
          });
          storage.setItem('walletAddress', a.address);

          // Always update network in storage when it changes
          if (networkChanged && n.network && n.networkPassphrase) {
            storage.setItem('walletNetwork', n.network);
            storage.setItem('networkPassphrase', n.networkPassphrase);
          }

          setAddress(a.address);
          setNetwork(n.network);
          setNetworkPassphrase(n.networkPassphrase);
          // Reset accountExists when network or address changes to allow retry
          setAccountExists(true);
          accountExistsRef.current = true;
          // Reset fetch tracking when network/address changes
          lastFetchedNetwork.current = undefined;
          lastFetchedAddress.current = undefined;
          // Trigger balance update when network changes
          if (networkChanged) {
            console.log(
              '[Stellar] Network changed from',
              network,
              'to',
              n.network,
              '- will update balances'
            );
            // Balance update will be triggered by the useEffect that depends on network
          }
        } else if (!hadPreviousValues && !hasInitializedRef.current) {
          // If we don't have previous values and haven't initialized, this is initialization, not a change
          // Set values without triggering change detection
          console.log(
            '[Stellar] Setting initial wallet state (not a change):',
            {
              network: n.network,
              address: a.address,
              hadAddress: address !== undefined,
              hadNetwork: network !== undefined,
            }
          );
          storage.setItem('walletAddress', a.address);
          setAddress(a.address);
          setNetwork(n.network);
          setNetworkPassphrase(n.networkPassphrase);
          // Don't set fetch tracking here - let the effect handle the first fetch
          hasInitializedRef.current = true;
        }
      } catch (e) {
        // For WalletConnect, errors might be temporary (connection still establishing)
        // Don't immediately disconnect if we have address in storage
        const errorMessage = e instanceof Error ? e.message : String(e);
        const isConnectionError =
          errorMessage.includes('not connected') ||
          errorMessage.includes('connection') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('pending');

        if (isWalletConnect && walletAddr && isConnectionError) {
          console.warn(
            '[Stellar] WalletConnect connection error (might be temporary):',
            errorMessage,
            'Keeping connection state, will retry on next poll'
          );
          // Don't disconnect - let the next poll attempt to reconnect
          popupLock.current = false;
          return;
        }

        // For other wallets or non-connection errors, disconnect
        console.error('[Stellar] Wallet state check error:', e);
        nullify();
      } finally {
        popupLock.current = false;
      }
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    let isMounted = true;

    // Create recursive polling function to check wallet state continuously
    const pollWalletState = async () => {
      if (!isMounted) return;

      await updateCurrentWalletState();

      if (isMounted) {
        timer = setTimeout(() => void pollWalletState(), POLL_INTERVAL);
      }
    };

    // Listen for wallet connection events to trigger immediate state refresh
    const handleWalletConnected = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log(
        '[Stellar] Wallet connected event received:',
        customEvent.detail
      );
      console.log('[Stellar] Immediately refreshing wallet state...');

      // Force immediate state update by clearing lock and updating
      startTransition(async () => {
        // Clear popup lock to ensure we can update
        popupLock.current = false;
        // Small delay to ensure storage is written
        await new Promise((resolve) => setTimeout(resolve, 100));
        await updateCurrentWalletState();
      });
    };

    // Listen for wallet disconnection events to immediately clear state
    const handleWalletDisconnected = () => {
      console.log('[Stellar] Wallet disconnected event received');
      console.log('[Stellar] Immediately clearing wallet state...');

      // Force immediate state clear
      startTransition(() => {
        popupLock.current = false;
        nullify();
      });
    };

    const handleWalletNetworkChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{
        network: string;
        networkPassphrase: string;
      }>;
      console.log(
        '[Stellar] Wallet network changed event received:',
        customEvent.detail
      );

      // Update state immediately
      startTransition(() => {
        if (
          customEvent.detail.network &&
          customEvent.detail.networkPassphrase
        ) {
          setNetwork(customEvent.detail.network);
          setNetworkPassphrase(customEvent.detail.networkPassphrase);
          // Reset fetch tracking to force balance refresh
          lastFetchedNetwork.current = undefined;
          lastFetchedAddress.current = undefined;
          console.log(
            '[Stellar] Network state updated:',
            customEvent.detail.network
          );
        }
      });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('walletConnected', handleWalletConnected);
      window.addEventListener('walletDisconnected', handleWalletDisconnected);
      window.addEventListener(
        'walletNetworkChanged',
        handleWalletNetworkChanged
      );
      console.log('[Stellar] Wallet event listeners registered');
    }

    // Get the wallet address when the component is mounted for the first time
    startTransition(async () => {
      await updateCurrentWalletState();
      // Start polling after initial state is loaded

      if (isMounted) {
        timer = setTimeout(() => void pollWalletState(), POLL_INTERVAL);
      }
    });

    // Clear the timeout and stop polling when the component unmounts
    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('walletConnected', handleWalletConnected);
        window.removeEventListener(
          'walletDisconnected',
          handleWalletDisconnected
        );
        window.removeEventListener(
          'walletNetworkChanged',
          handleWalletNetworkChanged
        );
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- it SHOULD only run once per component mount

  const contextValue = useMemo(
    () => ({
      address,
      network,
      networkPassphrase,
      balances,
      accountExists,
      updateBalances,
      isPending,
      signTransaction,
    }),
    [
      address,
      network,
      networkPassphrase,
      balances,
      accountExists,
      updateBalances,
      isPending,
    ]
  );

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
};
