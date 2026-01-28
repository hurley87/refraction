import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';

interface StellarWalletResponse {
  success: boolean;
  address?: string;
  walletId?: string;
  error?: string;
}

async function fetchStellarWallet(
  privyUserId: string
): Promise<StellarWalletResponse> {
  const response = await fetch(
    `/api/stellar-wallet?privyUserId=${encodeURIComponent(privyUserId)}`
  );
  const json = await response.json();
  // Unwrap the nested data from apiSuccess wrapper
  return {
    success: json.success,
    address: json.data?.address,
    walletId: json.data?.walletId,
    error: json.error,
  };
}

async function createStellarWallet(
  privyUserId: string
): Promise<StellarWalletResponse> {
  const response = await fetch('/api/stellar-wallet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ privyUserId }),
  });

  const json = await response.json();

  if (!response.ok || !json.success) {
    throw new Error(json.error || 'Failed to create Stellar wallet');
  }

  // Unwrap the nested data from apiSuccess wrapper
  return {
    success: json.success,
    address: json.data?.address,
    walletId: json.data?.walletId,
  };
}

export const useStellarWallet = () => {
  const { user } = usePrivy();
  const queryClient = useQueryClient();

  // Query for fetching existing wallet
  const {
    data: walletData,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ['stellarWallet', user?.id],
    queryFn: () => fetchStellarWallet(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000, // 1 minute
  });

  // Mutation for creating new wallet
  const {
    mutateAsync: connect,
    isPending: isConnecting,
    error: mutationError,
  } = useMutation({
    mutationFn: createStellarWallet,
    onSuccess: (data) => {
      // Invalidate and refetch wallet query
      queryClient.setQueryData(['stellarWallet', user?.id], data);
    },
  });

  const disconnect = () => {
    // Clear cache when disconnecting
    queryClient.setQueryData(['stellarWallet', user?.id], {
      success: false,
    });
  };

  const address = walletData?.success ? (walletData.address ?? null) : null;
  const walletId = walletData?.success ? (walletData.walletId ?? null) : null;
  const error =
    queryError || mutationError
      ? queryError instanceof Error
        ? queryError.message
        : mutationError instanceof Error
          ? mutationError.message
          : 'An error occurred'
      : null;

  return {
    address,
    walletId,
    isConnecting,
    isLoading,
    error,
    connect: async () => {
      if (!user?.id) {
        throw new Error('Please log in first');
      }
      const result = await connect(user.id);
      return result.address;
    },
    disconnect,
    isConnected: !!address,
  };
};
