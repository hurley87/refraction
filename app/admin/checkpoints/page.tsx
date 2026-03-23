'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FormData = {
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
};

const EMPTY_FORM: FormData = {
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
};

const CHAIN_LABELS: Record<ChainType, string> = {
  evm: 'EVM (Base)',
  solana: 'Solana',
  stellar: 'Stellar',
  aptos: 'Aptos',
};

// ---------------------------------------------------------------------------
// Collapsible Section
// ---------------------------------------------------------------------------

function Section({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-5 py-3.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm font-semibold text-gray-800">{title}</span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-5 py-4 space-y-4">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Slide-over Panel
// ---------------------------------------------------------------------------

function SlideOver({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in-0"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-2xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Sticky header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">{children}</div>

        {/* Sticky footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 shrink-0 flex items-center justify-end gap-3">
          {footer}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Checkpoint Card
// ---------------------------------------------------------------------------

function CheckpointCard({
  checkpoint,
  onEdit,
  onDelete,
  onCopy,
  isDeleting,
}: {
  checkpoint: Checkpoint;
  onEdit: () => void;
  onDelete: () => void;
  onCopy: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="group bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <h3 className="text-base font-semibold text-gray-900 truncate">
              {checkpoint.name}
            </h3>
            <span
              className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded-full ${
                checkpoint.checkpoint_mode === 'spend'
                  ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-200'
                  : 'bg-sky-50 text-sky-700 ring-1 ring-sky-200'
              }`}
            >
              {checkpoint.checkpoint_mode === 'spend' ? 'Spend' : 'Check-in'}
            </span>
            <span
              className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded-full ${
                checkpoint.is_active
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                  : 'bg-red-50 text-red-600 ring-1 ring-red-200'
              }`}
            >
              {checkpoint.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>

          {/* Description */}
          {checkpoint.description && (
            <p className="text-sm text-gray-500 line-clamp-2 mb-3">
              {checkpoint.description}
            </p>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="inline-flex items-center gap-1">
              <span className="font-medium text-gray-500">
                {checkpoint.checkpoint_mode === 'spend' ? 'Cost' : 'Points'}:
              </span>{' '}
              {checkpoint.points_value}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="font-medium text-gray-500">Chain:</span>{' '}
              {CHAIN_LABELS[checkpoint.chain_type]}
            </span>
            <span
              className="font-mono text-blue-600 cursor-pointer hover:underline"
              onClick={onCopy}
            >
              /c/{checkpoint.id}
            </span>
            {checkpoint.created_at && (
              <span>
                {new Date(checkpoint.created_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={onCopy}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
            title="Copy URL"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
            className="p-2 rounded-lg hover:bg-red-50 transition-colors text-gray-400 hover:text-red-600 disabled:opacity-50"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function AdminCheckpointsPage() {
  const { user, login } = usePrivy();
  const queryClient = useQueryClient();

  // Admin auth
  const checkAdminStatus = useCallback(async () => {
    if (!user?.email?.address) return false;
    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  useEffect(() => {
    const verifyAdmin = async () => {
      if (user?.email?.address) {
        setIsAdmin(await checkAdminStatus());
        setAdminLoading(false);
      } else if (user === null) {
        setIsAdmin(false);
        setAdminLoading(false);
      }
    };
    verifyAdmin();
  }, [user, checkAdminStatus]);

  // Slide-over state
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingCheckpoint, setEditingCheckpoint] = useState<Checkpoint | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [partnerImageFile, setPartnerImageFile] = useState<File | null>(null);
  const [partnerImagePreview, setPartnerImagePreview] = useState<string | null>(null);

  // Data fetching
  const { data: checkpoints = [], isLoading: checkpointsLoading } = useQuery<Checkpoint[]>({
    queryKey: ['admin-checkpoints'],
    queryFn: async () => {
      const response = await fetch('/api/admin/checkpoints', {
        headers: { 'x-user-email': user?.email?.address || '' },
      });
      if (!response.ok) throw new Error('Failed to fetch checkpoints');
      const responseData = await response.json();
      return (responseData.data || responseData).checkpoints;
    },
    enabled: !!isAdmin,
  });

  // Mutations
  const createCheckpointMutation = useMutation({
    mutationFn: async ({
      checkpointData,
      imageFile,
    }: {
      checkpointData: Omit<Checkpoint, 'id' | 'created_at' | 'updated_at'>;
      imageFile?: File | null;
    }) => {
      if (imageFile) {
        const fd = new FormData();
        fd.append('name', checkpointData.name);
        fd.append('description', checkpointData.description || '');
        fd.append('login_cta_text', checkpointData.login_cta_text?.trim() || '');
        fd.append('chain_type', checkpointData.chain_type);
        fd.append('checkpoint_mode', checkpointData.checkpoint_mode);
        fd.append('points_value', String(checkpointData.points_value));
        fd.append('is_active', String(checkpointData.is_active));
        if (checkpointData.background_gradient) fd.append('background_gradient', checkpointData.background_gradient);
        if (checkpointData.font_family) fd.append('font_family', checkpointData.font_family);
        if (checkpointData.font_color) fd.append('font_color', checkpointData.font_color);
        if (checkpointData.footer_title) fd.append('footer_title', checkpointData.footer_title);
        if (checkpointData.footer_description) fd.append('footer_description', checkpointData.footer_description);
        if (checkpointData.cta_text) fd.append('cta_text', checkpointData.cta_text);
        if (checkpointData.cta_url) fd.append('cta_url', checkpointData.cta_url);
        fd.append('partner_image', imageFile);

        const response = await fetch('/api/admin/checkpoints', {
          method: 'POST',
          headers: { 'x-user-email': user?.email?.address || '' },
          body: fd,
        });
        if (!response.ok) {
          const err = await response.json().catch(() => null);
          throw new Error(err?.error || 'Failed to create checkpoint');
        }
        const rd = await response.json();
        return rd.data || rd;
      }

      const response = await fetch('/api/admin/checkpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-email': user?.email?.address || '' },
        body: JSON.stringify(checkpointData),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.error || 'Failed to create checkpoint');
      }
      const rd = await response.json();
      return rd.data || rd;
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
              navigator.clipboard.writeText(`${window.location.origin}${data.url}`);
              toast.success('URL copied!');
            }}
          >
            Copy URL
          </Button>
        </div>,
        { duration: 10000 }
      );
      closePanel();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create checkpoint');
    },
  });

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
      let response: Response;
      if (imageFile) {
        const fd = new FormData();
        Object.entries(updates).forEach(([key, value]) => {
          if (value === undefined) return;
          fd.append(key, value === null ? '' : String(value));
        });
        fd.append('partner_image', imageFile);
        response = await fetch(`/api/admin/checkpoints/${id}`, {
          method: 'PATCH',
          headers: { 'x-user-email': user?.email?.address || '' },
          body: fd,
        });
      } else {
        response = await fetch(`/api/admin/checkpoints/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-user-email': user?.email?.address || '' },
          body: JSON.stringify(updates),
        });
      }
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.error || 'Failed to update checkpoint');
      }
      const rd = await response.json();
      return (rd.data || rd).checkpoint;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-checkpoints'] });
      toast.success('Checkpoint updated');
      closePanel();
    },
    onError: () => {
      toast.error('Failed to update checkpoint');
    },
  });

  const deleteCheckpointMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/checkpoints/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-email': user?.email?.address || '' },
      });
      if (!response.ok) throw new Error('Failed to delete checkpoint');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-checkpoints'] });
      toast.success('Checkpoint deleted');
    },
    onError: () => {
      toast.error('Failed to delete checkpoint');
    },
  });

  // Helpers
  const setField = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setEditingCheckpoint(null);
    setFormData(EMPTY_FORM);
    setPartnerImageFile(null);
    setPartnerImagePreview(null);
    setPanelOpen(true);
  };

  const openEdit = (cp: Checkpoint) => {
    const mode = cp.checkpoint_mode || 'checkin';
    setEditingCheckpoint(cp);
    setFormData({
      name: cp.name,
      description: cp.description || '',
      login_cta_text: cp.login_cta_text ?? '',
      chain_type: mode === 'spend' ? 'evm' : cp.chain_type,
      checkpoint_mode: mode,
      points_value: cp.points_value,
      is_active: cp.is_active,
      background_gradient: cp.background_gradient ?? '',
      font_family: cp.font_family ?? '',
      font_color: cp.font_color ?? '',
      footer_title: cp.footer_title ?? '',
      footer_description: cp.footer_description ?? '',
      cta_text: cp.cta_text ?? '',
      cta_url: cp.cta_url ?? '',
    });
    setPartnerImageFile(null);
    setPartnerImagePreview(cp.partner_image_url || null);
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setEditingCheckpoint(null);
    setFormData(EMPTY_FORM);
    setPartnerImageFile(null);
    setPartnerImagePreview(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedChain = formData.checkpoint_mode === 'spend' ? 'evm' as ChainType : formData.chain_type;
    const payload = {
      ...formData,
      chain_type: normalizedChain,
      login_cta_text: formData.login_cta_text.trim() || null,
      background_gradient: formData.background_gradient.trim() || null,
      font_family: formData.font_family.trim() || null,
      font_color: formData.font_color.trim() || null,
      footer_title: formData.footer_title.trim() || null,
      footer_description: formData.footer_description.trim() || null,
      cta_text: formData.cta_text.trim() || null,
      cta_url: formData.cta_url.trim() || null,
    };

    if (editingCheckpoint) {
      updateCheckpointMutation.mutate({ id: editingCheckpoint.id, updates: payload, imageFile: partnerImageFile });
    } else {
      createCheckpointMutation.mutate({ checkpointData: payload, imageFile: partnerImageFile });
    }
  };

  const handleCopyUrl = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/c/${id}`);
    toast.success('URL copied!');
  };

  const isMutating = createCheckpointMutation.isPending || updateCheckpointMutation.isPending;
  const isSpendMode = formData.checkpoint_mode === 'spend';

  // -------------------------------------------------------------------------
  // Auth guards
  // -------------------------------------------------------------------------

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex items-center gap-3 text-gray-500">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading&hellip;
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 gap-4">
        <p className="text-gray-600">Please log in to access admin features.</p>
        <Button onClick={login}>Log In</Button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-600">Access denied. Admin permissions required.</p>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Checkpoints</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {checkpoints.length} checkpoint{checkpoints.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Checkpoint
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="max-w-5xl mx-auto px-6 py-6">
        {checkpointsLoading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <svg className="w-5 h-5 animate-spin mr-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading checkpoints&hellip;
          </div>
        ) : checkpoints.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="text-gray-500 mb-4">No checkpoints yet.</p>
            <Button variant="outline" onClick={openCreate}>
              Create your first checkpoint
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {checkpoints.map((cp) => (
              <CheckpointCard
                key={cp.id}
                checkpoint={cp}
                onEdit={() => openEdit(cp)}
                onDelete={() => {
                  if (confirm('Delete this checkpoint?')) deleteCheckpointMutation.mutate(cp.id);
                }}
                onCopy={() => handleCopyUrl(cp.id)}
                isDeleting={deleteCheckpointMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>

      {/* Slide-over form */}
      <SlideOver
        open={panelOpen}
        onClose={closePanel}
        title={editingCheckpoint ? 'Edit Checkpoint' : 'New Checkpoint'}
        footer={
          <>
            <Button type="button" variant="outline" onClick={closePanel} disabled={isMutating}>
              Cancel
            </Button>
            <Button type="submit" form="checkpoint-form" disabled={isMutating}>
              {isMutating ? 'Saving\u2026' : editingCheckpoint ? 'Save Changes' : 'Create Checkpoint'}
            </Button>
          </>
        }
      >
        <form id="checkpoint-form" onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* ---- Basic Info ---- */}
          <Section title="Basic Information">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="e.g., Art Basel Miami 2025"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="w-full min-h-[80px] p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                value={formData.description}
                onChange={(e) => setField('description', e.target.value)}
                placeholder="Optional description"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setField('is_active', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Label htmlFor="is_active" className="text-sm cursor-pointer">
                Active &mdash; visible to the public
              </Label>
            </div>
          </Section>

          {/* ---- Configuration ---- */}
          <Section title="Configuration">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="checkpoint_mode">Type</Label>
                <Select
                  value={formData.checkpoint_mode}
                  onValueChange={(v: CheckpointMode) =>
                    setFormData((prev) => ({
                      ...prev,
                      checkpoint_mode: v,
                      chain_type: v === 'spend' ? 'evm' : prev.chain_type,
                    }))
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checkin">Check-in (earn)</SelectItem>
                    <SelectItem value="spend">Spend (redeem)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="chain_type">Wallet</Label>
                <Select
                  value={formData.chain_type}
                  onValueChange={(v: ChainType) => setField('chain_type', v)}
                  disabled={isSpendMode}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="evm">EVM (Base)</SelectItem>
                    <SelectItem value="solana">Solana</SelectItem>
                    <SelectItem value="stellar">Stellar</SelectItem>
                    <SelectItem value="aptos">Aptos</SelectItem>
                  </SelectContent>
                </Select>
                {isSpendMode && (
                  <p className="text-xs text-gray-400 mt-1">Spend mode uses EVM.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="points_value">
                  {isSpendMode ? 'Points Cost' : 'Points Value'}
                </Label>
                <Input
                  id="points_value"
                  type="number"
                  min={1}
                  max={10000}
                  value={formData.points_value}
                  onChange={(e) => setField('points_value', parseInt(e.target.value) || 100)}
                />
              </div>
              <div>
                <Label htmlFor="login_cta_text">Login CTA Text</Label>
                <Input
                  id="login_cta_text"
                  value={formData.login_cta_text}
                  onChange={(e) => setField('login_cta_text', e.target.value)}
                  placeholder="Default: Find spots nearby"
                />
              </div>
            </div>
          </Section>

          {/* ---- Media ---- */}
          <Section title="Partner Image">
            <div>
              <p className="text-xs text-gray-500 mb-2">
                PNG, JPEG, or WebP &middot; max 5 MB
              </p>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-6 cursor-pointer hover:border-gray-300 hover:bg-gray-50 transition-colors">
                {partnerImagePreview ? (
                  <div className="relative w-full h-40">
                    <Image
                      src={partnerImagePreview}
                      alt="Preview"
                      fill
                      className="object-contain rounded-lg"
                      unoptimized
                    />
                  </div>
                ) : (
                  <>
                    <svg className="w-8 h-8 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                    </svg>
                    <span className="text-sm text-gray-500">Click to upload</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setPartnerImageFile(file);
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setPartnerImagePreview(reader.result as string);
                      reader.readAsDataURL(file);
                    } else {
                      setPartnerImagePreview(null);
                    }
                  }}
                />
              </label>
              {partnerImagePreview && (
                <button
                  type="button"
                  className="text-xs text-red-500 hover:underline mt-2"
                  onClick={() => {
                    setPartnerImageFile(null);
                    setPartnerImagePreview(null);
                  }}
                >
                  Remove image
                </button>
              )}
            </div>
          </Section>

          {/* ---- Page Styling ---- */}
          <Section title="Page Styling" defaultOpen={false}>
            <div>
              <Label>Background Gradient</Label>
              <p className="text-xs text-gray-400 mb-2">Overlay on the hero image</p>
              <GradientPicker
                value={formData.background_gradient}
                onChange={(val) => setField('background_gradient', val)}
              />
            </div>

            <div>
              <Label>Font Family (Google Fonts)</Label>
              <FontPicker
                value={formData.font_family}
                onChange={(val) => setField('font_family', val)}
              />
            </div>

            <div>
              <Label htmlFor="font_color">Font Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.font_color || '#FFFFFF'}
                  onChange={(e) => setField('font_color', e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                />
                <Input
                  id="font_color"
                  value={formData.font_color}
                  onChange={(e) => setField('font_color', e.target.value)}
                  placeholder="#FFFFFF"
                  className="flex-1"
                />
              </div>
            </div>
          </Section>

          {/* ---- Footer Content ---- */}
          <Section title="Footer Content" defaultOpen={false}>
            <div>
              <Label htmlFor="footer_title">Footer Title</Label>
              <Input
                id="footer_title"
                value={formData.footer_title}
                onChange={(e) => setField('footer_title', e.target.value)}
                placeholder="e.g., Your Local Guide To What's Good"
              />
            </div>
            <div>
              <Label htmlFor="footer_description">Footer Description</Label>
              <textarea
                id="footer_description"
                className="w-full min-h-[60px] p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                value={formData.footer_description}
                onChange={(e) => setField('footer_description', e.target.value)}
                placeholder="Shown below the hero section"
              />
            </div>
          </Section>

          {/* ---- CTA ---- */}
          <Section title="Call to Action (Authenticated)" defaultOpen={false}>
            <div>
              <Label htmlFor="cta_text">Button Text</Label>
              <Input
                id="cta_text"
                value={formData.cta_text}
                onChange={(e) => setField('cta_text', e.target.value)}
                placeholder="Default: Explore The IRL Map"
              />
              <p className="text-xs text-gray-400 mt-1">Shown after check-in.</p>
            </div>
            <div>
              <Label htmlFor="cta_url">Button URL</Label>
              <Input
                id="cta_url"
                value={formData.cta_url}
                onChange={(e) => setField('cta_url', e.target.value)}
                placeholder="/interactive-map or https://..."
              />
            </div>
          </Section>
        </form>
      </SlideOver>
    </div>
  );
}
