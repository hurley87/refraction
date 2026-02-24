"use client";

import { useParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSpendItem, useSpendPoints } from "@/hooks/useSpend";
import { useCurrentPlayer } from "@/hooks/usePlayer";
import { usePrivy } from "@privy-io/react-auth";

export default function SpendItemPage() {
  const { id } = useParams<{ id: string }>();
  const { user, login } = usePrivy();
  const walletAddress = user?.wallet?.address;

  const { data: item, isLoading: itemLoading } = useSpendItem(id);
  const { data: player } = useCurrentPlayer();
  const spendMutation = useSpendPoints();

  const currentPoints = player?.total_points ?? 0;
  const canAfford = item ? currentPoints >= item.points_cost : false;

  const handleSpend = () => {
    if (!walletAddress || !id) return;
    spendMutation.mutate(
      { spendItemId: id, walletAddress },
      {
        onSuccess: () => toast.success("Points spent successfully!"),
        onError: (error) => {
          const msg = error instanceof Error ? error.message : "Failed to spend points";
          toast.error(msg);
        },
      }
    );
  };

  if (itemLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Item not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-lg">
      {item.image_url && (
        <div className="mb-6">
          <Image
            src={item.image_url}
            alt={item.name}
            width={600}
            height={400}
            className="w-full rounded-lg object-cover"
          />
        </div>
      )}

      <h1 className="text-2xl font-bold mb-2">{item.name}</h1>

      {item.description && (
        <p className="text-gray-600 mb-4">{item.description}</p>
      )}

      <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Cost</span>
          <span className="font-semibold">
            {item.points_cost.toLocaleString()} points
          </span>
        </div>
        {walletAddress && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Your Balance</span>
            <span className="font-semibold">
              {currentPoints.toLocaleString()} points
            </span>
          </div>
        )}
      </div>

      {!user ? (
        <Button className="w-full" onClick={login}>
          Login to Spend Points
        </Button>
      ) : (
        <Button
          className="w-full"
          onClick={handleSpend}
          disabled={!canAfford || spendMutation.isPending}
        >
          {spendMutation.isPending
            ? "Spending..."
            : !canAfford
              ? "Insufficient Points"
              : `Spend ${item.points_cost.toLocaleString()} Points`}
        </Button>
      )}
    </div>
  );
}
