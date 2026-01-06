"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Checkpoint, ChainType } from "@/lib/types";
import { usePrivy } from "@privy-io/react-auth";

export default function AdminCheckpointsPage() {
  const { user, login } = usePrivy();
  const queryClient = useQueryClient();

  const checkAdminStatus = useCallback(async () => {
    if (!user?.email?.address) return false;

    try {
      const response = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email.address }),
      });
      const data = await response.json();
      return data.isAdmin;
    } catch (error) {
      console.error("Error checking admin status:", error);
      return false;
    }
  }, [user?.email?.address]);

  const [editingCheckpoint, setEditingCheckpoint] = useState<Checkpoint | null>(
    null,
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    chain_type: ChainType;
    points_value: number;
    is_active: boolean;
  }>({
    name: "",
    description: "",
    chain_type: "evm",
    points_value: 100,
    is_active: true,
  });

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminLoading, setAdminLoading] = useState(true);

  useEffect(() => {
    const verifyAdmin = async () => {
      if (user?.email?.address) {
        const adminStatus = await checkAdminStatus();
        setIsAdmin(adminStatus);
        setAdminLoading(false);
      } else if (user === null) {
        setIsAdmin(false);
        setAdminLoading(false);
      }
    };

    verifyAdmin();
  }, [user, checkAdminStatus]);

  // Fetch all checkpoints
  const { data: checkpoints = [], isLoading: checkpointsLoading } = useQuery<
    Checkpoint[]
  >({
    queryKey: ["admin-checkpoints"],
    queryFn: async () => {
      const response = await fetch("/api/admin/checkpoints");
      if (!response.ok) throw new Error("Failed to fetch checkpoints");
      const data = await response.json();
      return data.checkpoints;
    },
    enabled: !!isAdmin,
  });

  // Create checkpoint mutation
  const createCheckpointMutation = useMutation({
    mutationFn: async (
      checkpointData: Omit<Checkpoint, "id" | "created_at" | "updated_at">,
    ) => {
      const response = await fetch("/api/admin/checkpoints", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": user?.email?.address || "",
        },
        body: JSON.stringify(checkpointData),
      });
      if (!response.ok) throw new Error("Failed to create checkpoint");
      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-checkpoints"] });
      toast.success(
        <div>
          <p>Checkpoint created!</p>
          <p className="mt-1 font-mono text-sm">URL: {data.data.url}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => {
              navigator.clipboard.writeText(
                `${window.location.origin}${data.data.url}`,
              );
              toast.success("URL copied to clipboard!");
            }}
          >
            Copy URL
          </Button>
        </div>,
        { duration: 10000 },
      );
      handleCloseDialog();
    },
    onError: (error) => {
      console.error("Error creating checkpoint:", error);
      toast.error("Failed to create checkpoint");
    },
  });

  // Update checkpoint mutation
  const updateCheckpointMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Checkpoint>;
    }) => {
      const response = await fetch(`/api/admin/checkpoints/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update checkpoint");
      const data = await response.json();
      return data.data.checkpoint;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-checkpoints"] });
      toast.success("Checkpoint updated successfully");
      handleCloseDialog();
    },
    onError: (error) => {
      console.error("Error updating checkpoint:", error);
      toast.error("Failed to update checkpoint");
    },
  });

  // Delete checkpoint mutation
  const deleteCheckpointMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/checkpoints/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete checkpoint");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-checkpoints"] });
      toast.success("Checkpoint deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting checkpoint:", error);
      toast.error("Failed to delete checkpoint");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingCheckpoint) {
      updateCheckpointMutation.mutate({
        id: editingCheckpoint.id,
        updates: formData,
      });
    } else {
      createCheckpointMutation.mutate(formData);
    }
  };

  const handleEdit = (checkpoint: Checkpoint) => {
    setEditingCheckpoint(checkpoint);
    setFormData({
      name: checkpoint.name,
      description: checkpoint.description || "",
      chain_type: checkpoint.chain_type,
      points_value: checkpoint.points_value,
      is_active: checkpoint.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this checkpoint?")) return;
    deleteCheckpointMutation.mutate(id);
  };

  const handleCopyUrl = (id: string) => {
    const url = `${window.location.origin}/c/${id}`;
    navigator.clipboard.writeText(url);
    toast.success("URL copied to clipboard!");
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      chain_type: "evm",
      points_value: 100,
      is_active: true,
    });
  };

  const handleNewCheckpoint = () => {
    setEditingCheckpoint(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCheckpoint(null);
    resetForm();
  };

  const chainTypeLabel = (chainType: ChainType) => {
    switch (chainType) {
      case "evm":
        return "EVM (Base)";
      case "solana":
        return "Solana";
      case "stellar":
        return "Stellar";
      default:
        return chainType;
    }
  };

  if (adminLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen space-y-4">
        <p>Please login to access admin features</p>
        <Button onClick={login}>Login</Button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Access denied. Admin permissions required.</p>
      </div>
    );
  }

  const isLoading =
    createCheckpointMutation.isPending ||
    updateCheckpointMutation.isPending ||
    deleteCheckpointMutation.isPending;

  return (
    <div className="container mx-auto p-6 bg-white relative min-h-screen z-40">
      <div className="flex justify-between items-center mb-6 bg-white">
        <h1 className="text-3xl font-bold">Checkpoints Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNewCheckpoint}>Create Checkpoint</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg bg-white border shadow-lg">
            <DialogHeader>
              <DialogTitle>
                {editingCheckpoint ? "Edit Checkpoint" : "Create New Checkpoint"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Art Basel Miami 2025"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <textarea
                  id="description"
                  className="w-full min-h-[80px] p-2 border rounded-md"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Optional description for this checkpoint"
                />
              </div>

              <div>
                <Label htmlFor="chain_type">Wallet Type</Label>
                <Select
                  value={formData.chain_type}
                  onValueChange={(value: ChainType) =>
                    setFormData({ ...formData, chain_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select wallet type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="evm">EVM (Base)</SelectItem>
                    <SelectItem value="solana">Solana</SelectItem>
                    <SelectItem value="stellar">Stellar</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Users will need this wallet type to check in
                </p>
              </div>

              <div>
                <Label htmlFor="points_value">Points Value</Label>
                <Input
                  id="points_value"
                  type="number"
                  min="1"
                  max="10000"
                  value={formData.points_value}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      points_value: parseInt(e.target.value) || 100,
                    })
                  }
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                />
                <Label htmlFor="is_active">Active</Label>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading
                    ? "Saving..."
                    : editingCheckpoint
                      ? "Update"
                      : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {checkpointsLoading ? (
        <div className="flex justify-center py-8">Loading checkpoints...</div>
      ) : (
        <div className="grid gap-4 bg-white">
          {checkpoints.map((checkpoint) => (
            <div
              key={checkpoint.id}
              className="border rounded-lg p-4 bg-white shadow-sm"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold">{checkpoint.name}</h3>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        checkpoint.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {checkpoint.is_active ? "Active" : "Inactive"}
                    </span>
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                      {chainTypeLabel(checkpoint.chain_type)}
                    </span>
                  </div>
                  {checkpoint.description && (
                    <p className="text-gray-600 mb-2">{checkpoint.description}</p>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-500">
                    <div>Points: {checkpoint.points_value}</div>
                    <div>
                      URL:{" "}
                      <span className="font-mono text-blue-600">
                        /c/{checkpoint.id}
                      </span>
                    </div>
                    <div>
                      Created:{" "}
                      {checkpoint.created_at
                        ? new Date(checkpoint.created_at).toLocaleDateString()
                        : "N/A"}
                    </div>
                    {checkpoint.created_by && (
                      <div>Created by: {checkpoint.created_by}</div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col space-y-2">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyUrl(checkpoint.id)}
                    >
                      Copy URL
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(checkpoint)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(checkpoint.id)}
                      disabled={deleteCheckpointMutation.isPending}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {checkpoints.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No checkpoints found. Click &quot;Create Checkpoint&quot; to create
              your first checkpoint.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
