'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';
import { adminApiAuthHeaders } from '@/lib/admin-api-auth-headers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Globe, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';

interface City {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  aliases: string[];
  isActive: boolean;
  sortOrder: number;
}

const EMPTY_FORM = {
  name: '',
  country: '',
  aliases: '',
  isActive: true,
  sortOrder: 0,
};

function CityDialog({
  city,
  open,
  onOpenChange,
  getAccessToken,
}: {
  city: City | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  getAccessToken: () => Promise<string | null | undefined>;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(city);

  useEffect(() => {
    if (open && city) {
      setForm({
        name: city.name,
        country: city.country ?? '',
        aliases: city.aliases.join(', '),
        isActive: city.isActive,
        sortOrder: city.sortOrder,
      });
    } else if (open) {
      setForm(EMPTY_FORM);
    }
  }, [open, city]);

  const handleSave = async () => {
    setError(null);
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    try {
      const auth = await adminApiAuthHeaders(getAccessToken);
      const aliases = form.aliases
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
      const body = {
        ...(city?.id ? { id: city.id } : {}),
        name: form.name.trim(),
        country: form.country.trim() || null,
        aliases,
        isActive: form.isActive,
        sortOrder: Number.isFinite(form.sortOrder) ? form.sortOrder : 0,
      };
      const res = await fetch('/api/admin/cities', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? 'Failed to save city');
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ['admin-cities'] });
      await queryClient.invalidateQueries({ queryKey: ['cities'] });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = (next: boolean) => {
    if (!next) setError(null);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-md"
        overlayClassName="bg-white backdrop-blur-[2px]"
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit City' : 'Add City'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update this city. Changes affect event and guide filters.'
              : 'Add a canonical city for filtering events and guides.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div>
            <Label htmlFor="city-name">Name *</Label>
            <Input
              id="city-name"
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g. New York"
            />
          </div>
          <div>
            <Label htmlFor="city-country">Country</Label>
            <Input
              id="city-country"
              value={form.country}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, country: e.target.value }))
              }
              placeholder="e.g. USA"
            />
          </div>
          <div>
            <Label htmlFor="city-aliases">Aliases</Label>
            <Input
              id="city-aliases"
              value={form.aliases}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, aliases: e.target.value }))
              }
              placeholder="Comma-separated, e.g. NYC, New York City"
            />
            <p className="mt-1 text-xs text-gray-500">
              Alternate spellings used to match external/DICE city names to this
              city.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="city-sort">Sort order</Label>
              <Input
                id="city-sort"
                type="number"
                value={String(form.sortOrder)}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    sortOrder: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="flex items-end">
              <div className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5">
                <Label htmlFor="city-active" className="cursor-pointer">
                  Active
                </Label>
                <Switch
                  id="city-active"
                  checked={form.isActive}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, isActive: checked }))
                  }
                />
              </div>
            </div>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : isEdit ? (
              'Update City'
            ) : (
              'Add City'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminCitiesPage() {
  const { user, login, getAccessToken } = usePrivy();
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminLoading, setAdminLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogCity, setDialogCity] = useState<City | null>(null);

  const checkAdminStatus = useCallback(async () => {
    if (!user?.email?.address) return false;
    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await adminApiAuthHeaders(getAccessToken)),
        },
        body: JSON.stringify({}),
      });
      const responseData = await response.json();
      const data = responseData.data || responseData;
      return data.isAdmin;
    } catch {
      return false;
    }
  }, [user?.email?.address, getAccessToken]);

  useEffect(() => {
    const verify = async () => {
      if (user?.email?.address) {
        setIsAdmin(await checkAdminStatus());
        setAdminLoading(false);
      } else if (user === null) {
        setIsAdmin(false);
        setAdminLoading(false);
      }
    };
    verify();
  }, [user, checkAdminStatus]);

  const { data: cities, isLoading } = useQuery<City[]>({
    queryKey: ['admin-cities'],
    queryFn: async () => {
      const auth = await adminApiAuthHeaders(getAccessToken);
      const res = await fetch('/api/admin/cities', { headers: auth });
      if (!res.ok) throw new Error('Failed to fetch cities');
      const body = await res.json();
      return body.data ?? [];
    },
    enabled: !!isAdmin,
  });

  const deleteCity = useMutation({
    mutationFn: async (id: string) => {
      const auth = await adminApiAuthHeaders(getAccessToken);
      const res = await fetch('/api/admin/cities', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? 'Failed to delete');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cities'] });
      queryClient.invalidateQueries({ queryKey: ['cities'] });
    },
  });

  if (adminLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <p className="text-gray-500">Verifying access...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center space-y-4">
        <p>Please login to access admin features</p>
        <Button onClick={login}>Login</Button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Access denied. Admin permissions required.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cities</h1>
            <p className="mt-1 text-gray-500">
              Canonical cities used to filter events and guides.
            </p>
          </div>
          <Button
            onClick={() => {
              setDialogCity(null);
              setDialogOpen(true);
            }}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Add City
          </Button>
        </div>

        {isLoading ? (
          <div className="flex min-h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : cities && cities.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Country</th>
                  <th className="px-4 py-3 font-medium">Aliases</th>
                  <th className="px-4 py-3 font-medium">Sort</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cities.map((city) => (
                  <tr key={city.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {city.name}
                      </div>
                      <div className="text-xs text-gray-400">{city.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {city.country || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {city.aliases.length > 0 ? city.aliases.join(', ') : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {city.sortOrder}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          city.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-gray-100 text-gray-500 border border-gray-200'
                        }`}
                      >
                        {city.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => {
                            setDialogCity(city);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700"
                          disabled={deleteCity.isPending}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Delete "${city.name}"? Events linked to it will lose their city.`
                              )
                            ) {
                              deleteCity.mutate(city.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
              <Globe className="h-6 w-6 text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              No cities yet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Add your first city to enable filtering.
            </p>
          </div>
        )}
      </div>

      <CityDialog
        city={dialogCity}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        getAccessToken={getAccessToken}
      />
    </div>
  );
}
