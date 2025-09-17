"use client";

import { useState, useEffect } from "react";
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
import {
  type Perk,
  type PerkDiscountCode,
} from "@/lib/supabase";
import { usePrivy } from "@privy-io/react-auth";

export default function AdminPerksPage() {
  const { user, login } = usePrivy();
  const queryClient = useQueryClient();

  // Check admin status with simple POST request
  const checkAdminStatus = async () => {
    if (!user?.email?.address) return false;

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email.address })
      });
      const data = await response.json();
      return data.isAdmin;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  };
  const [editingPerk, setEditingPerk] = useState<Perk | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Perk>>({
    title: "",
    description: "",
    location: "",
    points_threshold: 0,
    website_url: "",
    type: "",
    end_date: "",
    is_active: true,
  });
  const [selectedPerkForCodes, setSelectedPerkForCodes] = useState<Perk | null>(
    null,
  );
  const [isCodesDialogOpen, setIsCodesDialogOpen] = useState(false);
  const [newCodes, setNewCodes] = useState("");
  const [perkCodes, setPerkCodes] = useState<PerkDiscountCode[]>([]);

  // Admin check will be done server-side
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminLoading, setAdminLoading] = useState(true);

  // Check admin status when user is available
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
  }, [user]);

  // Fetch all perks
  const { data: perks = [], isLoading: perksLoading } = useQuery({
    queryKey: ["admin-perks"],
    queryFn: async () => {
      const response = await fetch("/api/admin/perks?activeOnly=false");
      if (!response.ok) throw new Error("Failed to fetch perks");
      const data = await response.json();
      return data.perks;
    },
    enabled: !!isAdmin,
  });

  // Create perk mutation
  const createPerkMutation = useMutation({
    mutationFn: async (
      perkData: Omit<Perk, "id" | "created_at" | "updated_at">,
    ) => {
      const response = await fetch("/api/admin/perks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(perkData),
      });
      if (!response.ok) throw new Error("Failed to create perk");
      const data = await response.json();
      return data.perk;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-perks"] });
      toast.success("Perk created successfully");
      handleCloseDialog();
    },
    onError: (error) => {
      console.error("Error creating perk:", error);
      toast.error("Failed to create perk");
    },
  });

  // Update perk mutation
  const updatePerkMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Perk>;
    }) => {
      const response = await fetch(`/api/admin/perks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update perk");
      const data = await response.json();
      return data.perk;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-perks"] });
      toast.success("Perk updated successfully");
      handleCloseDialog();
    },
    onError: (error) => {
      console.error("Error updating perk:", error);
      toast.error("Failed to update perk");
    },
  });

  // Delete perk mutation
  const deletePerkMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/perks/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete perk");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-perks"] });
      toast.success("Perk deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting perk:", error);
      toast.error("Failed to delete perk");
    },
  });

  // Create discount codes mutation
  const createCodesMutation = useMutation({
    mutationFn: async ({
      perkId,
      codes,
    }: {
      perkId: string;
      codes: string[];
    }) => {
      const response = await fetch(`/api/admin/perks/${perkId}/codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes }),
      });
      if (!response.ok) throw new Error("Failed to create discount codes");
      const data = await response.json();
      return data.codes;
    },
    onSuccess: () => {
      toast.success("Discount codes added successfully");
      setNewCodes("");
      if (selectedPerkForCodes?.id) {
        loadPerkCodes(selectedPerkForCodes.id);
      }
    },
    onError: (error) => {
      console.error("Error creating codes:", error);
      toast.error("Failed to add discount codes");
    },
  });

  // Delete discount code mutation
  const deleteCodeMutation = useMutation({
    mutationFn: async (codeId: string) => {
      const response = await fetch(`/api/admin/perks/codes/${codeId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete discount code");
    },
    onSuccess: () => {
      toast.success("Discount code deleted successfully");
      if (selectedPerkForCodes?.id) {
        loadPerkCodes(selectedPerkForCodes.id);
      }
    },
    onError: (error) => {
      console.error("Error deleting code:", error);
      toast.error("Failed to delete discount code");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingPerk) {
      updatePerkMutation.mutate({
        id: editingPerk.id!,
        updates: formData,
      });
    } else {
      createPerkMutation.mutate(
        formData as Omit<Perk, "id" | "created_at" | "updated_at">,
      );
    }
  };

  const handleEdit = (perk: Perk) => {
    setEditingPerk(perk);
    setFormData(perk);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this perk?")) return;
    deletePerkMutation.mutate(id);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      location: "",
      points_threshold: 0,
      website_url: "",
      type: "",
      end_date: "",
      is_active: true,
    });
  };

  const loadPerkCodes = async (perkId: string) => {
    try {
      const response = await fetch(`/api/admin/perks/${perkId}/codes`);
      if (!response.ok) throw new Error("Failed to fetch discount codes");
      const data = await response.json();
      setPerkCodes(data.codes);
    } catch (error) {
      console.error("Error loading codes:", error);
    }
  };

  const handleManageCodes = async (perk: Perk) => {
    setSelectedPerkForCodes(perk);
    setIsCodesDialogOpen(true);
    if (perk.id) {
      await loadPerkCodes(perk.id);
    }
  };

  const handleAddCodes = () => {
    if (!selectedPerkForCodes?.id || !newCodes.trim()) return;

    const codes = newCodes
      .split("\n")
      .map((code) => code.trim())
      .filter((code) => code.length > 0);

    if (codes.length === 0) {
      toast.error("Please enter at least one discount code");
      return;
    }

    createCodesMutation.mutate({
      perkId: selectedPerkForCodes.id,
      codes,
    });
  };

  const handleDeleteCode = (codeId: string) => {
    if (confirm("Are you sure you want to delete this discount code?")) {
      deleteCodeMutation.mutate(codeId);
    }
  };

  const handleNewPerk = () => {
    setEditingPerk(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPerk(null);
    resetForm();
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
    createPerkMutation.isPending ||
    updatePerkMutation.isPending ||
    deletePerkMutation.isPending;

  return (
    <div className="container mx-auto p-6 bg-white relative min-h-screen z-40">
      <div className="flex justify-between items-center mb-6 bg-white">
        <h1 className="text-3xl font-bold">Perks Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNewPerk}>Add New Perk</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl bg-white border shadow-lg">
            <DialogHeader>
              <DialogTitle>
                {editingPerk ? "Edit Perk" : "Create New Perk"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
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
                  required
                />
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="points_threshold">Points Threshold</Label>
                <Input
                  id="points_threshold"
                  type="number"
                  value={formData.points_threshold}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      points_threshold: parseInt(e.target.value),
                    })
                  }
                  required
                  min="0"
                />
              </div>

              <div>
                <Label htmlFor="website_url">Website URL</Label>
                <Input
                  id="website_url"
                  type="url"
                  value={formData.website_url || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, website_url: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select perk type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="food">Food & Drink</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="entertainment">Entertainment</SelectItem>
                    <SelectItem value="services">Services</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="end_date">End Date (Optional)</Label>
                <Input
                  id="end_date"
                  type="datetime-local"
                  value={
                    formData.end_date
                      ? new Date(formData.end_date).toISOString().slice(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      end_date: e.target.value
                        ? new Date(e.target.value).toISOString()
                        : "",
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

              <div className="flex justify-end space-x-2">
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
                    : editingPerk
                      ? "Update Perk"
                      : "Create Perk"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {perksLoading ? (
        <div className="flex justify-center py-8">Loading perks...</div>
      ) : (
        <div className="grid gap-4 bg-white">
          {perks.map((perk) => (
            <div
              key={perk.id}
              className="border rounded-lg p-4 bg-white shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold">{perk.title}</h3>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        perk.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {perk.is_active ? "Active" : "Inactive"}
                    </span>
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                      {perk.type}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-2">{perk.description}</p>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-500">
                    <div>Points: {perk.points_threshold}</div>
                    {perk.location && <div>Location: {perk.location}</div>}
                    {perk.end_date && (
                      <div
                        className={`${new Date(perk.end_date) < new Date() ? "text-red-600" : ""}`}
                      >
                        Ends: {new Date(perk.end_date).toLocaleDateString()}
                      </div>
                    )}
                    {perk.website_url && (
                      <div>
                        Website:{" "}
                        <a
                          href={perk.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          {perk.website_url}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col space-y-2">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(perk)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(perk.id!)}
                      disabled={deletePerkMutation.isPending}
                    >
                      Delete
                    </Button>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleManageCodes(perk)}
                  >
                    Manage Codes
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {perks.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No perks found. Click &quot;Add New Perk&quot; to create your
              first perk.
            </div>
          )}
        </div>
      )}

      {/* Discount Codes Management Dialog */}
      <Dialog open={isCodesDialogOpen} onOpenChange={setIsCodesDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-white border shadow-lg">
          <DialogHeader>
            <DialogTitle>
              Manage Discount Codes - {selectedPerkForCodes?.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Add new codes section */}
            <div>
              <Label htmlFor="newCodes">
                Add New Discount Codes (one per line)
              </Label>
              <textarea
                id="newCodes"
                className="w-full min-h-[120px] p-3 border rounded-md mt-2"
                placeholder={`Enter discount codes, one per line:\nCODE001\nCODE002\nCODE003`}
                value={newCodes}
                onChange={(e) => setNewCodes(e.target.value)}
              />
              <Button
                onClick={handleAddCodes}
                className="mt-2"
                disabled={createCodesMutation.isPending || !newCodes.trim()}
              >
                {createCodesMutation.isPending ? "Adding..." : "Add Codes"}
              </Button>
            </div>

            {/* Existing codes section */}
            <div>
              <h3 className="text-lg font-semibold mb-3">
                Existing Codes ({perkCodes.length} total)
              </h3>

              {perkCodes.length === 0 ? (
                <p className="text-gray-500">No discount codes created yet.</p>
              ) : (
                <div className="grid gap-2 max-h-[300px] overflow-y-auto">
                  <div className="grid grid-cols-4 gap-2 p-2 bg-gray-100 rounded font-semibold text-sm">
                    <div>Code</div>
                    <div>Status</div>
                    <div>Claimed By</div>
                    <div>Actions</div>
                  </div>

                  {perkCodes.map((code) => (
                    <div
                      key={code.id}
                      className="grid grid-cols-4 gap-2 p-2 border rounded"
                    >
                      <div className="font-mono text-sm">{code.code}</div>
                      <div>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            code.is_claimed
                              ? "bg-red-100 text-red-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {code.is_claimed ? "Claimed" : "Available"}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {code.claimed_by_wallet_address ? (
                          <span title={code.claimed_by_wallet_address}>
                            {code.claimed_by_wallet_address.slice(0, 6)}...
                            {code.claimed_by_wallet_address.slice(-4)}
                          </span>
                        ) : (
                          <span>-</span>
                        )}
                      </div>
                      <div>
                        {!code.is_claimed && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteCode(code.id!)}
                            disabled={deleteCodeMutation.isPending}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary stats */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total Codes:</span>{" "}
                  <span className="font-semibold">{perkCodes.length}</span>
                </div>
                <div>
                  <span className="text-gray-600">Available:</span>{" "}
                  <span className="font-semibold text-green-600">
                    {perkCodes.filter((c) => !c.is_claimed).length}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Claimed:</span>{" "}
                  <span className="font-semibold text-red-600">
                    {perkCodes.filter((c) => c.is_claimed).length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => setIsCodesDialogOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
