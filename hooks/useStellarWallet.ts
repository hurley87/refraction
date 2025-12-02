import { useState, useEffect, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";

export const useStellarWallet = () => {
  const { user } = usePrivy();
  const [address, setAddress] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch Stellar wallet from server on mount and when user changes
  useEffect(() => {
    const fetchWallet = async () => {
      if (!user?.id) {
        setAddress(null);
        setWalletId(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(
          `/api/stellar-wallet?privyUserId=${encodeURIComponent(user.id)}`,
        );
        const data = await response.json();

        if (data.success && data.address) {
          setAddress(data.address);
          setWalletId(data.walletId || null);
        } else {
          setAddress(null);
          setWalletId(null);
        }
      } catch (err) {
        console.error("Failed to fetch Stellar wallet:", err);
        setAddress(null);
        setWalletId(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWallet();
  }, [user?.id]);

  const connect = useCallback(async () => {
    if (!user?.id) {
      setError("Please log in first");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Create Stellar wallet via server-side API
      const response = await fetch("/api/stellar-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ privyUserId: user.id }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to create Stellar wallet");
      }

      setAddress(data.address);
      setWalletId(data.walletId || null);
      return data.address;
    } catch (err: any) {
      const errorMessage =
        err?.message || "Failed to create Stellar wallet. Please try again.";
      setError(errorMessage);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [user?.id]);

  const disconnect = useCallback(() => {
    // Privy manages wallet state server-side, so we just clear local state
    setAddress(null);
    setWalletId(null);
    setError(null);
  }, []);

  return {
    address,
    walletId,
    isConnecting,
    isLoading,
    error,
    connect,
    disconnect,
    isConnected: !!address,
  };
};
