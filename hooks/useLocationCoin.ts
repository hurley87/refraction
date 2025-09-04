import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { createLocationCoin } from "@/lib/zora-coins";
import { toast } from "sonner";

interface LocationData {
  place_id: string;
  display_name: string;
  name: string;
  lat: string;
  lon: string;
  type?: string;
  context?: string;
}

interface CreateLocationWithCoinParams {
  locationData: LocationData;
  createCoin?: boolean;
}

interface CreateLocationWithCoinResult {
  success: boolean;
  location?: any;
  coinAddress?: string;
  coinTransactionHash?: string;
  error?: string;
}

export const useLocationCoin = () => {
  const { user } = usePrivy();
  const [isCreating, setIsCreating] = useState(false);

  const createLocationWithCoin = async ({
    locationData,
    createCoin = true,
  }: CreateLocationWithCoinParams): Promise<CreateLocationWithCoinResult> => {
    if (!user?.wallet?.address) {
      toast.error("Please connect your wallet");
      return { success: false, error: "No wallet connected" };
    }

    setIsCreating(true);

    try {
      // Step 1: Create location in database first
      const locationResponse = await fetch("/api/locations/create-with-coin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: user.wallet.address,
          locationData,
          createCoin,
          username:
            (user as any)?.username ??
            ((user as any)?.email
              ? String((user as any).email).split("@")[0]
              : undefined),
        }),
      });

      const locationResult = await locationResponse.json();

      if (!locationResponse.ok) {
        throw new Error(locationResult.error || "Failed to create location");
      }

      if (!createCoin) {
        toast.success("Location created successfully!");
        return {
          success: true,
          location: locationResult.location,
        };
      }

      // Step 2: Create coin if requested
      if (locationResult.shouldCreateCoin && locationResult.coinInfo) {
        try {
          // Check if MetaMask is available
          const ethereum = (window as any).ethereum;
          if (!ethereum) {
            toast.error(
              "MetaMask not found. Please install MetaMask to create coins.",
            );
            return {
              success: true,
              location: locationResult.location,
              error: "MetaMask required for coin creation",
            };
          }

          toast.info(
            "Creating coin... Please confirm the transaction in your wallet.",
          );

          const coinResult = await createLocationCoin({
            locationName: locationResult.coinInfo.locationName,
            locationDescription: locationResult.coinInfo.description,
            creatorAddress: user.wallet.address,
            ethereum,
          });

          if (coinResult.success && coinResult.coinAddress) {
            // Step 3: Update location with coin information
            await fetch("/api/locations/create-with-coin", {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                locationId: locationResult.location.id,
                coinAddress: coinResult.coinAddress,
                coinTransactionHash: coinResult.transactionHash,
              }),
            });

            toast.success(
              `Location and coin created successfully! Coin: ${locationResult.coinInfo.symbol}`,
            );

            return {
              success: true,
              location: locationResult.location,
              coinAddress: coinResult.coinAddress,
              coinTransactionHash: coinResult.transactionHash,
            };
          } else {
            toast.warning(
              "Location created, but coin creation failed. You can try creating the coin later.",
            );
            return {
              success: true,
              location: locationResult.location,
              error: coinResult.error || "Coin creation failed",
            };
          }
        } catch (coinError) {
          console.error("Coin creation error:", coinError);
          toast.warning(
            "Location created, but coin creation failed. You can try creating the coin later.",
          );
          return {
            success: true,
            location: locationResult.location,
            error:
              coinError instanceof Error
                ? coinError.message
                : "Unknown coin creation error",
          };
        }
      }

      toast.success("Location created successfully!");
      return {
        success: true,
        location: locationResult.location,
      };
    } catch (error) {
      console.error("Create location with coin error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to create location: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsCreating(false);
    }
  };

  const getLocationCoinInfo = async (locationId: number) => {
    try {
      const response = await fetch(`/api/locations/${locationId}`);
      if (response.ok) {
        const data = await response.json();
        return data.location;
      }
      return null;
    } catch (error) {
      console.error("Error getting location coin info:", error);
      return null;
    }
  };

  return {
    createLocationWithCoin,
    getLocationCoinInfo,
    isCreating,
  };
};
