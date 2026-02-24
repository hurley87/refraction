"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Image from "next/image";
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
import type { SpendItem, SpendRedemption } from "@/lib/types";
import { usePrivy } from "@privy-io/react-auth";

export default function AdminSpendPage() {
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
      const responseData = await response.json();
      const data = responseData.data || responseData;
      return data.isAdmin;
    } catch {
      return false;
    }
  }, [user?.email?.address]);

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminLoading, setAdminLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<SpendItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    image_url: "",
    points_cost: 0,
    is_active: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Redemptions dialog state
  const [selectedItemForRedemptions, setSelectedItemForRedemptions] =
    useState<SpendItem | null>(null);
  const [isRedemptionsDialogOpen, setIsRedemptionsDialogOpen] = useState(false);

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

  const { data: items = [], isLoading: itemsLoading } = useQuery<SpendItem[]>({
    queryKey: ["admin-spend-items"],
    queryFn: async () => {
      const response = await fetch("/api/admin/spend", {
        headers: { "x-user-email": user?.email?.address || "" },
      });
      if (!response.ok) throw new Error("Failed to fetch spend items");
      const responseData = await response.json();
      const data = responseData.data || responseData;
      return data.items;
    },
    enabled: !!isAdmin,
  });

  const { data: redemptions = [], refetch: refetchRedemptions } = useQuery<
    SpendRedemption[]
  >({
    queryKey: [
      "admin-spend-redemptions",
      selectedItemForRedemptions?.id,
    ],
    queryFn: async () => {
      if (!selectedItemForRedemptions?.id) return [];
      const response = await fetch(
        `/api/admin/spend/${selectedItemForRedemptions.id}/redemptions`,
        { headers: { "x-user-email": user?.email?.address || "" } }
      );
      if (!response.ok) throw new Error("Failed to fetch redemptions");
      const responseData = await response.json();
      const data = responseData.data || responseData;
      return data.redemptions ?? [];
    },
    enabled: !!selectedItemForRedemptions?.id && isRedemptionsDialogOpen,
  });

  const createMutation = useMutation({
    mutationFn: async (itemData: typeof formData) => {
      const response = await fetch("/api/admin/spend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": user?.email?.address || "",
        },
        body: JSON.stringify(itemData),
      });
      if (!response.ok) throw new Error("Failed to create spend item");
      const responseData = await response.json();
      return (responseData.data || responseData).item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-spend-items"] });
      toast.success("Spend item created");
      handleCloseDialog();
    },
    onError: () => toast.error("Failed to create spend item"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: typeof formData }) => {
      const response = await fetch(`/api/admin/spend/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": user?.email?.address || "",
        },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update spend item");
      const responseData = await response.json();
      return (responseData.data || responseData).item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-spend-items"] });
      toast.success("Spend item updated");
      handleCloseDialog();
    },
    onError: () => toast.error("Failed to update spend item"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/spend/${id}`, {
        method: "DELETE",
        headers: { "x-user-email": user?.email?.address || "" },
      });
      if (!response.ok) throw new Error("Failed to delete spend item");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-spend-items"] });
      toast.success("Spend item deleted");
    },
    onError: () => toast.error("Failed to delete spend item"),
  });

  const fulfillMutation = useMutation({
    mutationFn: async (redemptionId: string) => {
      const response = await fetch(
        `/api/admin/spend/redemptions/${redemptionId}/fulfill`,
        {
          method: "POST",
          headers: { "x-user-email": user?.email?.address || "" },
        }
      );
      if (!response.ok) throw new Error("Failed to fulfill redemption");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-spend-redemptions"] });
      refetchRedemptions();
      toast.success("Redemption fulfilled");
    },
    onError: () => toast.error("Failed to fulfill redemption"),
  });

  const uploadImage = async (file: File): Promise<string> => {
    const uploadFormData = new FormData();
    uploadFormData.append("file", file);
    const response = await fetch("/api/upload", {
      method: "POST",
      body: uploadFormData,
    });
    if (!response.ok) throw new Error("Failed to upload image");
    const responseData = await response.json();
    const result = responseData.data || responseData;
    if (!result.url) throw new Error("No URL returned from upload");
    return result.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      let imageUrl = formData.image_url;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const submitData = { ...formData, image_url: imageUrl };

      if (editingItem) {
        updateMutation.mutate({ id: editingItem.id!, updates: submitData });
      } else {
        createMutation.mutate(submitData);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Upload failed";
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleEdit = (item: SpendItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || "",
      image_url: item.image_url || "",
      points_cost: item.points_cost,
      is_active: item.is_active ?? true,
    });
    setImagePreview(item.image_url || null);
    setImageFile(null);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this spend item?")) return;
    deleteMutation.mutate(id);
  };

  const handleNewItem = () => {
    setEditingItem(null);
    setFormData({
      name: "",
      description: "",
      image_url: "",
      points_cost: 0,
      is_active: true,
    });
    setImageFile(null);
    setImagePreview(null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleViewRedemptions = (item: SpendItem) => {
    setSelectedItemForRedemptions(item);
    setIsRedemptionsDialogOpen(true);
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

  const isMutating =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  return (
    <div className="container mx-auto p-6 bg-white relative min-h-screen z-40">
      <div className="flex justify-between items-center mb-6 bg-white">
        <h1 className="text-3xl font-bold">Spend Items Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNewItem}>Add New Spend Item</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] bg-white border shadow-lg flex flex-col overflow-hidden">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>
                {editingItem ? "Edit Spend Item" : "Create New Spend Item"}
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto flex-1 pr-2 -mr-2">
              <form onSubmit={handleSubmit} className="space-y-4 pb-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    className="w-full min-h-[100px] p-2 border rounded-md"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="image">Image</Label>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="mt-1"
                  />
                  {imagePreview && (
                    <div className="mt-2">
                      <Image
                        src={imagePreview}
                        alt="Preview"
                        width={300}
                        height={192}
                        className="max-w-xs max-h-48 object-cover rounded-md border"
                        unoptimized
                      />
                    </div>
                  )}
                  {formData.image_url && !imageFile && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600 mb-1">
                        Current image:
                      </p>
                      <Image
                        src={formData.image_url}
                        alt="Current"
                        width={300}
                        height={192}
                        className="max-w-xs max-h-48 object-cover rounded-md border"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="points_cost">Points Cost</Label>
                  <Input
                    id="points_cost"
                    type="number"
                    min={1}
                    value={formData.points_cost}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        points_cost: parseInt(e.target.value) || 0,
                      })
                    }
                    required
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
              </form>
            </div>
            <div className="flex justify-end space-x-2 pt-4 border-t bg-white flex-shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isMutating || isUploading}
                onClick={(e) => {
                  e.preventDefault();
                  const form = document.querySelector("form");
                  if (form) form.requestSubmit();
                }}
              >
                {isMutating || isUploading
                  ? "Saving..."
                  : editingItem
                    ? "Update Item"
                    : "Create Item"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {itemsLoading ? (
        <div className="flex justify-center py-8">Loading spend items...</div>
      ) : (
        <div className="grid gap-4 bg-white">
          {items.map((item) => (
            <div
              key={item.id}
              className="border rounded-lg p-4 bg-white shadow-sm"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="title3 text-[#020303]">{item.name}</div>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        item.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {item.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="flex gap-4 mb-2">
                    {item.image_url && (
                      <div className="flex-shrink-0">
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          width={120}
                          height={120}
                          className="rounded-lg object-cover border"
                          style={{ width: "120px", height: "120px" }}
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      {item.description && (
                        <p className="text-gray-600 mb-2 break-words">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    Cost: {item.points_cost.toLocaleString()} points
                  </div>
                </div>
                <div className="flex flex-col space-y-2">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(item)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(item.id!)}
                      disabled={deleteMutation.isPending}
                    >
                      Delete
                    </Button>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleViewRedemptions(item)}
                  >
                    View Redemptions
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No spend items found. Click &quot;Add New Spend Item&quot; to
              create your first item.
            </div>
          )}
        </div>
      )}

      {/* Redemptions Dialog */}
      <Dialog
        open={isRedemptionsDialogOpen}
        onOpenChange={setIsRedemptionsDialogOpen}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-white border shadow-lg">
          <DialogHeader>
            <DialogTitle>
              Redemptions - {selectedItemForRedemptions?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {redemptions.length === 0 ? (
              <p className="text-gray-500">No redemptions yet.</p>
            ) : (
              <div className="grid gap-2">
                <div className="grid grid-cols-5 gap-2 p-2 bg-gray-100 rounded font-semibold text-sm">
                  <div>Wallet</div>
                  <div>Points Spent</div>
                  <div>Date</div>
                  <div>Status</div>
                  <div>Actions</div>
                </div>
                {redemptions.map((redemption) => (
                  <div
                    key={redemption.id}
                    className="grid grid-cols-5 gap-2 p-2 border rounded items-center"
                  >
                    <div className="text-sm font-mono" title={redemption.user_wallet_address}>
                      {redemption.user_wallet_address.slice(0, 6)}...
                      {redemption.user_wallet_address.slice(-4)}
                    </div>
                    <div className="text-sm">
                      {redemption.points_spent.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">
                      {redemption.created_at
                        ? new Date(redemption.created_at).toLocaleDateString()
                        : "-"}
                    </div>
                    <div>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          redemption.is_fulfilled
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {redemption.is_fulfilled ? "Fulfilled" : "Pending"}
                      </span>
                    </div>
                    <div>
                      {!redemption.is_fulfilled && (
                        <Button
                          size="sm"
                          onClick={() =>
                            fulfillMutation.mutate(redemption.id!)
                          }
                          disabled={fulfillMutation.isPending}
                        >
                          Fulfill
                        </Button>
                      )}
                      {redemption.is_fulfilled && redemption.fulfilled_at && (
                        <span className="text-xs text-gray-500">
                          {new Date(
                            redemption.fulfilled_at
                          ).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Summary</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total:</span>{" "}
                  <span className="font-semibold">{redemptions.length}</span>
                </div>
                <div>
                  <span className="text-gray-600">Fulfilled:</span>{" "}
                  <span className="font-semibold text-green-600">
                    {redemptions.filter((r) => r.is_fulfilled).length}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Pending:</span>{" "}
                  <span className="font-semibold text-yellow-600">
                    {redemptions.filter((r) => !r.is_fulfilled).length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => setIsRedemptionsDialogOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
