'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Checkpoint, ChainType, CheckpointMode } from '@/lib/types';
import { usePrivy } from '@privy-io/react-auth';
import Image from 'next/image';
import GradientPicker from '@/components/ui/gradient-picker';
import FontPicker from '@/components/ui/font-picker';

export default function AdminCheckpointsPage() {
  const { user, login } = usePrivy();
  const queryClient = useQueryClient();

  const checkAdminStatus = useCallback(async () => {
    if (!user?.email?.address) return false;

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email.address }),
      });
      const responseData = await response.json();
      // Unwrap the apiSuccess wrapper
      const data = responseData.data || responseData;
      return data.isAdmin;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }, [user?.email?.address]);

  const [editingCheckpoint, setEditingCheckpoint] = useState<Checkpoint | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    login_cta_text: string;
    chain_type: ChainType;
    checkpoint_mode: CheckpointMode;
    points_value: number;
    is_active: boolean;
    background_gradient: string;
    font_family: string;
    font_color: string;
    footer_title: string;
    footer_description: string;
    cta_text: string;
    cta_url: string;
  }>({
    name: '',
    description: '',
    login_cta_text: '',
    chain_type: 'evm',
    checkpoint_mode: 'checkin',
    points_value: 100,
    is_active: true,
    background_gradient: '',
    font_family: '',
    font_color: '',
    footer_title: '',
    footer_description: '',
    cta_text: '',
    cta_url: '',
  });
  const [partnerImageFile, setPartnerImageFile] = useState<File | null>(null);
  const [partnerImagePreview, setPartnerImagePreview] = useState<string | null>(
    null
  );

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

  const { data: checkpoints = [], isLoading: checkpointsLoading } = useQuery<
    Checkpoint[]
  >({
    queryKey: ['admin-checkpoints'],
    queryFn: async () => {
      const response = await fetch('/api/admin/checkpoints', {
        headers: {
          'x-user-email': user?.email?.address || '',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch checkpoints');
      const responseData = await response.json();
      // Unwrap the apiSuccess wrapper
      const data = responseData.data || responseData;
      return data.checkpoints;
    },
    enabled: !!isAdmin,
  });

  // Create checkpoint mutation
  const createCheckpointMutation = useMutation({
    mutationFn: async ({
      checkpointData,
      imageFile,
    }: {
      checkpointData: Omit<Checkpoint, 'id' | 'created_at' | 'updated_at'>;
      imageFile?: File | null;
    }) => {
      // If image file is provided, use FormData; otherwise use JSON
      if (imageFile) {
        const formData = new FormData();
        formData.append('name', checkpointData.name);
        formData.append('description', checkpointData.description || '');
        formData.append(
          'login_cta_text',
          checkpointData.login_cta_text?.trim() || ''
        );
        formData.append('chain_type', checkpointData.chain_type);
        formData.append('checkpoint_mode', checkpointData.checkpoint_mode);
        formData.append('points_value', String(checkpointData.points_value));
        formData.append('is_active', String(checkpointData.is_active));
        formData.append('partner_image', imageFile);

        const response = await fetch('/api/admin/checkpoints', {
          method: 'POST',
          headers: {
            'x-user-email': user?.email?.address || '',
          },
          body: formData,
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error || 'Failed to create checkpoint');
        }
        const responseData = await response.json();
        // Unwrap the apiSuccess wrapper
        return responseData.data || responseData;
      } else {
        const response = await fetch('/api/admin/checkpoints', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-email': user?.email?.address || '',
          },
          body: JSON.stringify(checkpointData),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error || 'Failed to create checkpoint');
        }
        const responseData = await response.json();
        // Unwrap the apiSuccess wrapper
        return responseData.data || responseData;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-checkpoints'] });
      toast.success(
        <div>
          <p>Checkpoint created!</p>
          <p className="mt-1 font-mono text-sm">URL: {data.url}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => {
              navigator.clipboard.writeText(
                `${window.location.origin}${data.url}`
              );
              toast.success('URL copied to clipboard!');
            }}
          >
            Copy URL
          </Button>
        </div>,
        { duration: 10000 }
      );
      handleCloseDialog();
    },
    onError: (error) => {
      console.error('Error creating checkpoint:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create checkpoint';
      toast.error(errorMessage);
    },
  });

  // Update checkpoint mutation
  const updateCheckpointMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
      imageFile,
    }: {
      id: string;
      updates: Partial<Checkpoint>;
      imageFile?: File | null;
    }) => {
      const hasImageUpload = !!imageFile;
      let response: Response;

      if (hasImageUpload) {
        const formDataToSend = new FormData();
        Object.entries(updates).forEach(([key, value]) => {
          if (value === undefined) return;
          formDataToSend.append(key, value === null ? '' : String(value));
        });
        formDataToSend.append('partner_image', imageFile!);

        response = await fetch(`/api/admin/checkpoints/${id}`, {
          method: 'PATCH',
          headers: {
            'x-user-email': user?.email?.address || '',
          },
          body: formDataToSend,
        });
      } else {
        response = await fetch(`/api/admin/checkpoints/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-user-email': user?.email?.address || '',
          },
          body: JSON.stringify(updates),
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to update checkpoint');
      }
      const responseData = await response.json();
      // Unwrap the apiSuccess wrapper
      const data = responseData.data || responseData;
      return data.checkpoint;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-checkpoints'] });
      toast.success('Checkpoint updated successfully');
      handleCloseDialog();
    },
    onError: (error) => {
      console.error('Error updating checkpoint:', error);
      toast.error('Failed to update checkpoint');
    },
  });

  // Delete checkpoint mutation
  const deleteCheckpointMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/checkpoints/${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-email': user?.email?.address || '',
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to delete checkpoint');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-checkpoints'] });
      toast.success('Checkpoint deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting checkpoint:', error);
      toast.error('Failed to delete checkpoint');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedChainType =
      formData.checkpoint_mode === 'spend' ? 'evm' : formData.chain_type;
    const loginCtaText = formData.login_cta_text.trim() || null;
    const payload = {
      ...formData,
      chain_type: normalizedChainType,
      login_cta_text: loginCtaText,
      background_gradient: formData.background_gradient.trim() || null,
      font_family: formData.font_family.trim() || null,
      font_color: formData.font_color.trim() || null,
      footer_title: formData.footer_title.trim() || null,
      footer_description: formData.footer_description.trim() || null,
      cta_text: formData.cta_text.trim() || null,
      cta_url: formData.cta_url.trim() || null,
    };

    if (editingCheckpoint) {
      updateCheckpointMutation.mutate({
        id: editingCheckpoint.id,
        updates: payload,
        imageFile: partnerImageFile,
      });
    } else {
      createCheckpointMutation.mutate({
        checkpointData: payload,
        imageFile: partnerImageFile,
      });
    }
  };

  const handleEdit = (checkpoint: Checkpoint) => {
    const checkpointMode = checkpoint.checkpoint_mode || 'checkin';
    setEditingCheckpoint(checkpoint);
    setFormData({
      name: checkpoint.name,
      description: checkpoint.description || '',
      login_cta_text: checkpoint.login_cta_text ?? '',
      chain_type: checkpointMode === 'spend' ? 'evm' : checkpoint.chain_type,
      checkpoint_mode: checkpointMode,
      points_value: checkpoint.points_value,
      is_active: checkpoint.is_active,
      background_gradient: checkpoint.background_gradient ?? '',
      font_family: checkpoint.font_family ?? '',
      font_color: checkpoint.font_color ?? '',
      footer_title: checkpoint.footer_title ?? '',
      footer_description: checkpoint.footer_description ?? '',
      cta_text: checkpoint.cta_text ?? '',
      cta_url: checkpoint.cta_url ?? '',
    });
    setPartnerImageFile(null);
    setPartnerImagePreview(checkpoint.partner_image_url || null);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this checkpoint?')) return;
    deleteCheckpointMutation.mutate(id);
  };

  const handleCopyUrl = (id: string) => {
    const url = `${window.location.origin}/c/${id}`;
    navigator.clipboard.writeText(url);
    toast.success('URL copied to clipboard!');
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      login_cta_text: '',
      chain_type: 'evm',
      checkpoint_mode: 'checkin',
      points_value: 100,
      is_active: true,
      background_gradient: '',
      font_family: '',
      font_color: '',
      footer_title: '',
      footer_description: '',
      cta_text: '',
      cta_url: '',
    });
    setPartnerImageFile(null);
    setPartnerImagePreview(null);
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
      case 'evm':
        return 'EVM (Base)';
      case 'solana':
        return 'Solana';
      case 'stellar':
        return 'Stellar';
      case 'aptos':
        return 'Aptos';
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
  const isSpendMode = formData.checkpoint_mode === 'spend';

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
                {editingCheckpoint
                  ? 'Edit Checkpoint'
                  : 'Create New Checkpoint'}
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
                <Label htmlFor="checkpoint_mode">Checkpoint Type</Label>
                <Select
                  value={formData.checkpoint_mode}
                  onValueChange={(value: CheckpointMode) =>
                    setFormData((prev) => ({
                      ...prev,
                      checkpoint_mode: value,
                      chain_type: value === 'spend' ? 'evm' : prev.chain_type,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select checkpoint type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checkin">Check-in (earn points)</SelectItem>
                    <SelectItem value="spend">Spend (redeem points)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="login_cta_text">
                  Login CTA text (Optional)
                </Label>
                <Input
                  id="login_cta_text"
                  value={formData.login_cta_text}
                  onChange={(e) =>
                    setFormData({ ...formData, login_cta_text: e.target.value })
                  }
                  placeholder="e.g., Get Started"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Button text when user is not logged in; leave blank for
                  default.
                </p>
              </div>

              <div>
                <Label htmlFor="chain_type">Wallet Type</Label>
                <Select
                  value={formData.chain_type}
                  onValueChange={(value: ChainType) =>
                    setFormData({ ...formData, chain_type: value })
                  }
                  disabled={isSpendMode}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select wallet type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="evm">EVM (Base)</SelectItem>
                    <SelectItem value="solana">Solana</SelectItem>
                    <SelectItem value="stellar">Stellar</SelectItem>
                    <SelectItem value="aptos">Aptos</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  {isSpendMode
                    ? 'Spend checkpoints currently use EVM wallets.'
                    : 'Users will need this wallet type to check in.'}
                </p>
              </div>

              <div>
                <Label htmlFor="points_value">
                  {isSpendMode ? 'Points Cost' : 'Points Value'}
                </Label>
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
                <p className="text-xs text-gray-500 mt-1">
                  {isSpendMode
                    ? 'This is how many points are deducted when redeemed.'
                    : 'This is the point reward for a successful check-in.'}
                </p>
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

              <div>
                <Label htmlFor="partner_image">Partner Image (Optional)</Label>
                <p className="text-xs text-gray-500 mb-2">
                  Upload a partner logo image (PNG, JPEG, or WebP, max 5MB)
                </p>
                <input
                  id="partner_image"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setPartnerImageFile(file);
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setPartnerImagePreview(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    } else {
                      setPartnerImagePreview(null);
                    }
                  }}
                  className="w-full p-2 border rounded-md"
                />
                {partnerImagePreview && (
                  <div className="mt-2 relative w-full max-w-xs h-32">
                    <p className="text-xs text-gray-500 mb-1">Preview:</p>
                    <Image
                      src={partnerImagePreview}
                      alt="Partner image preview"
                      fill
                      className="object-contain border rounded"
                      unoptimized
                    />
                  </div>
                )}
              </div>

              <div className="border-t pt-4 mt-2">
                <p className="text-sm font-semibold mb-3">Page Customization</p>

                <div className="space-y-4">
                  <div>
                    <Label>Background Gradient</Label>
                    <p className="text-xs text-gray-500 mb-2">
                      Gradient overlay on the hero image
                    </p>
                    <GradientPicker
                      value={formData.background_gradient}
                      onChange={(val) =>
                        setFormData({ ...formData, background_gradient: val })
                      }
                    />
                  </div>

                  <div>
                    <Label>Font Family (Google Fonts)</Label>
                    <p className="text-xs text-gray-500 mb-1">
                      Used for headings and body text
                    </p>
                    <FontPicker
                      value={formData.font_family}
                      onChange={(val) =>
                        setFormData({ ...formData, font_family: val })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="font_color">Font Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.font_color || '#FFFFFF'}
                        onChange={(e) =>
                          setFormData({ ...formData, font_color: e.target.value })
                        }
                        className="w-10 h-10 border rounded cursor-pointer"
                      />
                      <Input
                        id="font_color"
                        value={formData.font_color}
                        onChange={(e) =>
                          setFormData({ ...formData, font_color: e.target.value })
                        }
                        placeholder="#FFFFFF"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="footer_title">Footer Title</Label>
                    <Input
                      id="footer_title"
                      value={formData.footer_title}
                      onChange={(e) =>
                        setFormData({ ...formData, footer_title: e.target.value })
                      }
                      placeholder="e.g., Your Local Guide To What's Good"
                    />
                  </div>

                  <div>
                    <Label htmlFor="footer_description">Footer Description</Label>
                    <textarea
                      id="footer_description"
                      className="w-full min-h-[60px] p-2 border rounded-md text-sm"
                      value={formData.footer_description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          footer_description: e.target.value,
                        })
                      }
                      placeholder="Description shown in footer section"
                    />
                  </div>

                  <div>
                    <Label htmlFor="cta_text">CTA Button Text</Label>
                    <Input
                      id="cta_text"
                      value={formData.cta_text}
                      onChange={(e) =>
                        setFormData({ ...formData, cta_text: e.target.value })
                      }
                      placeholder="e.g., Explore The IRL Map"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Shown after check-in on authenticated page
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="cta_url">CTA Button URL</Label>
                    <Input
                      id="cta_url"
                      value={formData.cta_url}
                      onChange={(e) =>
                        setFormData({ ...formData, cta_url: e.target.value })
                      }
                      placeholder="e.g., /interactive-map or https://..."
                    />
                  </div>
                </div>
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
                    ? 'Saving...'
                    : editingCheckpoint
                      ? 'Update'
                      : 'Create'}
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
                        checkpoint.checkpoint_mode === 'spend'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-sky-100 text-sky-800'
                      }`}
                    >
                      {checkpoint.checkpoint_mode === 'spend'
                        ? 'Spend'
                        : 'Check-in'}
                    </span>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        checkpoint.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {checkpoint.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                      {chainTypeLabel(checkpoint.chain_type)}
                    </span>
                  </div>
                  {checkpoint.description && (
                    <p className="text-gray-600 mb-2">
                      {checkpoint.description}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-500">
                    <div>
                      {checkpoint.checkpoint_mode === 'spend'
                        ? `Cost: ${checkpoint.points_value}`
                        : `Points: ${checkpoint.points_value}`}
                    </div>
                    <div>
                      URL:{' '}
                      <span className="font-mono text-blue-600">
                        /c/{checkpoint.id}
                      </span>
                    </div>
                    <div>
                      Created:{' '}
                      {checkpoint.created_at
                        ? new Date(checkpoint.created_at).toLocaleDateString()
                        : 'N/A'}
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
              No checkpoints found. Click &quot;Create Checkpoint&quot; to
              create your first checkpoint.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
