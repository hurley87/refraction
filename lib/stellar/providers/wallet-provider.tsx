"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { wallet } from "../utils/wallet";
import storage from "../utils/storage";
import { fetchBalances } from "../utils/wallet";
import type { MappedBalances } from "../utils/wallet";

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
    a && b && typeof a === "object" && typeof b === "object";

  return Boolean(
    bothAreObjects &&
      Object.keys(a).length === Object.keys(b).length &&
      Object.entries(a).every(([k, v]) => deepEqual(v, b[k as keyof T])),
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

export const WalletContext =
  createContext<WalletContextType>({
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
    storage.setItem("walletId", "");
    storage.setItem("walletAddress", "");
    storage.setItem("walletNetwork", "");
    storage.setItem("networkPassphrase", "");
  };

  const updateBalances = useCallback(async () => {
    if (!address) {
      setBalances({});
      setAccountExists(true); // Reset when no address
      accountExistsRef.current = true;
      isFetchingRef.current = false;
      return;
    }

    // Create a unique key for this network/address combination
    const fetchKey = `${network || 'default'}:${address}`;
    const lastFetchKey = `${lastFetchedNetwork.current || 'default'}:${lastFetchedAddress.current || ''}`;

    // If we're already fetching for this key, skip
    if (isFetchingRef.current && fetchKey === lastFetchKey) {
      console.log("[Stellar] Already fetching for", fetchKey, ", skipping");
      return;
    }

    // Check if we've already fetched for this exact network/address combination
    // and the account doesn't exist - don't fetch again
    if (!accountExistsRef.current && fetchKey === lastFetchKey) {
      console.log("[Stellar] Account already known to not exist for", fetchKey, ", skipping fetch");
      return;
    }

    // If we're fetching for the same key and account exists, check if we really need to refetch
    // (only refetch if balances might have changed, not on every render)
    if (accountExistsRef.current && fetchKey === lastFetchKey && !isFetchingRef.current) {
      // Don't refetch if we just fetched - let the polling interval handle updates
      return;
    }

    // Mark as fetching
    isFetchingRef.current = true;
    
    // Update tracking refs before fetching
    lastFetchedNetwork.current = network;
    lastFetchedAddress.current = address;

    try {
      // Use the wallet's network if available, otherwise fall back to app config
      const networkToUse = network || undefined;
      console.log("[Stellar] Fetching balances for", fetchKey);
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
      return;
    }

    // Create fetch key for comparison
    const currentFetchKey = `${network}:${address}`;
    const lastFetchKey = `${lastFetchedNetwork.current || ''}:${lastFetchedAddress.current || ''}`;
    
    // Check if network or address has changed
    const hasChanged = currentFetchKey !== lastFetchKey;
    
    // If we've already fetched for this exact network/address combination
    // and account doesn't exist, don't fetch again
    if (!hasChanged && !accountExistsRef.current) {
      console.log("[Stellar] Skipping fetch - account doesn't exist for", currentFetchKey);
      return;
    }
    
    // If we've already fetched for this exact network/address combination
    // and account exists, don't refetch immediately (let polling handle updates)
    // BUT allow the first fetch if we haven't fetched yet (lastFetchKey is empty)
    if (!hasChanged && accountExistsRef.current && lastFetchKey !== '') {
      return;
    }
    
    // If network/address changed or this is the first fetch, reset accountExists to allow fetch
    if (hasChanged || lastFetchKey === '') {
      if (hasChanged) {
        console.log("[Stellar] Network/address changed, resetting accountExists. From:", lastFetchKey, "To:", currentFetchKey);
      } else {
        console.log("[Stellar] First fetch for", currentFetchKey);
      }
      setAccountExists(true);
      accountExistsRef.current = true;
    }
    
    // Fetch balances (updateBalances will check if we should skip)
    void updateBalances();
  }, [updateBalances, address, network]);

  const updateCurrentWalletState = async () => {
    // There is no way, with StellarWalletsKit, to check if the wallet is
    // installed/connected/authorized. We need to manage that on our side by
    // checking our storage item.
    const walletId = storage.getItem("walletId");
    const walletNetwork = storage.getItem("walletNetwork");
    const walletAddr = storage.getItem("walletAddress");
    const passphrase = storage.getItem("networkPassphrase");

    // Only set from storage if we don't already have values AND haven't initialized yet
    // This prevents overwriting current state with storage values and prevents loops
    if (
      !hasInitializedRef.current &&
      address === undefined &&
      network === undefined &&
      walletAddr !== null &&
      walletNetwork !== null &&
      passphrase !== null
    ) {
      console.log("[Stellar] Restoring wallet state from storage:", {
        network: walletNetwork,
        address: walletAddr,
      });
      setAddress(walletAddr);
      setNetwork(walletNetwork);
      setNetworkPassphrase(passphrase);
      // Don't set fetch tracking here - let the effect handle the first fetch
      // This ensures the balance is fetched when state is restored
      hasInitializedRef.current = true;
    }

    if (!walletId) {
      nullify();
    } else {
      if (popupLock.current) return;
      // If our storage item is there, then we try to get the user's address &
      // network from their wallet. Note: `getAddress` MAY open their wallet
      // extension, depending on which wallet they select!
      try {
        popupLock.current = true;
        wallet.setWallet(walletId);
        if (walletId !== "freighter" && walletAddr !== null) return;
        const [a, n] = await Promise.all([
          wallet.getAddress(),
          wallet.getNetwork(),
        ]);

        if (!a.address) {
          storage.setItem("walletId", "");
          return;
        }

        // If values are already set and match exactly, don't do anything
        // This prevents unnecessary state updates during polling
        if (address === a.address && 
            network === n.network && 
            networkPassphrase === n.networkPassphrase &&
            address !== undefined && 
            network !== undefined) {
          return; // No change, skip update
        }

        // Only consider it a change if we had a previous value and it's different
        // This prevents undefined -> value from being treated as a change
        const addressChanged = address !== undefined && a.address !== address;
        const networkChanged = network !== undefined && (n.network !== network || n.networkPassphrase !== networkPassphrase);
        
        // If this is the first time we're setting values (both are undefined), just set them
        if (!hasInitializedRef.current && address === undefined && network === undefined && a.address && n.network) {
          console.log("[Stellar] Initial wallet state:", {
            network: n.network,
            address: a.address,
          });
          storage.setItem("walletAddress", a.address);
          setAddress(a.address);
          setNetwork(n.network);
          setNetworkPassphrase(n.networkPassphrase);
          // Don't set fetch tracking here - let the effect handle the first fetch
          // This ensures the balance is fetched when state is set
          hasInitializedRef.current = true;
          return; // Don't trigger balance fetch yet, let the effect handle it
        }
        
        // Only update if there's an actual change (not initial set)
        // Explicitly check that we had previous values before treating as change
        const hadPreviousValues = address !== undefined && network !== undefined;
        
        if (hadPreviousValues && (addressChanged || networkChanged)) {
          console.log("[Stellar] Wallet state changed:", {
            addressChanged,
            networkChanged,
            oldNetwork: network,
            newNetwork: n.network,
            oldAddress: address,
            newAddress: a.address,
          });
          storage.setItem("walletAddress", a.address);
          setAddress(a.address);
          setNetwork(n.network);
          setNetworkPassphrase(n.networkPassphrase);
          // Reset accountExists when network or address changes to allow retry
          setAccountExists(true);
          accountExistsRef.current = true;
          // Reset fetch tracking when network/address changes
          lastFetchedNetwork.current = undefined;
          lastFetchedAddress.current = undefined;
        } else if (!hadPreviousValues && !hasInitializedRef.current) {
          // If we don't have previous values and haven't initialized, this is initialization, not a change
          // Set values without triggering change detection
          console.log("[Stellar] Setting initial wallet state (not a change):", {
            network: n.network,
            address: a.address,
            hadAddress: address !== undefined,
            hadNetwork: network !== undefined,
          });
          storage.setItem("walletAddress", a.address);
          setAddress(a.address);
          setNetwork(n.network);
          setNetworkPassphrase(n.networkPassphrase);
          // Don't set fetch tracking here - let the effect handle the first fetch
          hasInitializedRef.current = true;
        }
      } catch (e) {
        // If `getNetwork` or `getAddress` throw errors... sign the user out???
        nullify();
        // then log the error (instead of throwing) so we have visibility
        // into the error while working on Scaffold Stellar but we do not
        // crash the app process
        console.error(e);
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
    [address, network, networkPassphrase, balances, accountExists, updateBalances, isPending],
  );

  return <WalletContext.Provider value={contextValue}>{children}</WalletContext.Provider>;
};
