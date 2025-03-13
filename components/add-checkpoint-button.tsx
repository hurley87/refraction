"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { usePrivy } from "@privy-io/react-auth";

interface AddCheckpointButtonProps {
  onSuccess?: (hash: string) => void;
  className?: string;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  label?: string;
}

export function AddCheckpointButton({
  onSuccess,
  className,
  variant = "default",
  size = "default",
  label = "Add Checkpoint",
}: AddCheckpointButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { authenticated } = usePrivy();

  const handleAddCheckpoint = async () => {
    if (!authenticated) {
      toast.error("Please connect your wallet first");
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch("/api/add-checkpoint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add checkpoint");
      }

      const data = await response.json();

      toast.success("Checkpoint added successfully", {
        description: `Transaction hash: ${data.hash.slice(0, 10)}...`,
      });

      if (onSuccess) {
        onSuccess(data.hash);
      }
    } catch (error) {
      console.error("Error adding checkpoint:", error);
      toast.error("Failed to add checkpoint", {
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleAddCheckpoint}
      disabled={isLoading || !authenticated}
      className={className}
      variant={variant}
      size={size}
    >
      {isLoading ? "Adding..." : label}
    </Button>
  );
}
