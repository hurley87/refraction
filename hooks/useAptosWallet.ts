import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';

interface AptosWalletResponse {
  success: boolean;
  address?: string;
  walletId?: string;
  error?: string;
}

async function fetchAptosWallet(
  privyUserId: string,
  accessToken: string
): Promise<AptosWalletResponse> {
  const response = await fetch(
    `/api/aptos-wallet?privyUserId=${encodeURIComponent(privyUserId)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
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

async function createAptosWallet({
  privyUserId,
  accessToken,
}: {
  privyUserId: string;
  accessToken: string;
}): Promise<AptosWalletResponse> {
  const response = await fetch('/api/aptos-wallet', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ privyUserId }),
  });

  const json = await response.json();

  if (!response.ok || !json.success) {
    throw new Error(json.error || 'Failed to create Aptos wallet');
  }

  // Unwrap the nested data from apiSuccess wrapper
  return {
    success: json.success,
    address: json.data?.address,
    walletId: json.data?.walletId,
  };
}

export const useAptosWallet = () => {
  const { user, getAccessToken } = usePrivy();
  const queryClient = useQueryClient();

  // Query for fetching existing wallet
  const {
    data: walletData,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ['aptosWallet', user?.id],
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error('Not authenticated');
      return fetchAptosWallet(user!.id, token);
    },
    enabled: !!user?.id,
    staleTime: 60_000, // 1 minute
  });

  // Mutation for creating new wallet
  const {
    mutateAsync: connectMutation,
    isPending: isConnecting,
    error: mutationError,
  } = useMutation({
    mutationFn: createAptosWallet,
    onSuccess: (data) => {
      // Invalidate and refetch wallet query
      queryClient.setQueryData(['aptosWallet', user?.id], data);
    },
  });

  const disconnect = () => {
    // Clear cache when disconnecting
    queryClient.setQueryData(['aptosWallet', user?.id], {
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
      const token = await getAccessToken();
      if (!token) throw new Error('Not authenticated');
      const result = await connectMutation({
        privyUserId: user.id,
        accessToken: token,
      });
      return result.address;
    },
    disconnect,
    isConnected: !!address,
  };
};
