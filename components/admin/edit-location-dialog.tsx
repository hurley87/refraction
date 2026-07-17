'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Image from 'next/image';
import { usePrivy } from '@privy-io/react-auth';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import { toast } from 'sonner';

import LocationSearch from '@/components/shared/location-search';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Location } from '@/lib/types';
import { deriveDisplayNameAndAddress } from '@/lib/utils/location-autofill';

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
};

const editLocationSchema = z.object({
  placeId: z.string().min(3, 'Place ID is required'),
  name: z.string().min(3, 'Name is required'),
  address: z.string().max(500).optional(),
  description: z.string().max(500).optional(),
  latitude: z
    .string()
    .min(1, 'Latitude is required')
    .pipe(
      z.coerce.number().refine((value) => value >= -90 && value <= 90, {
        message: 'Latitude must be between -90 and 90',
      })
    ),
  longitude: z
    .string()
    .min(1, 'Longitude is required')
    .pipe(
      z.coerce.number().refine((value) => value >= -180 && value <= 180, {
        message: 'Longitude must be between -180 and 180',
      })
    ),
  walletAddress: z.string().optional(),
  username: z.string().optional(),
  /** `categories.id` persisted on `locations.category_id`. */
  categoryId: z.string().min(1, 'Category is required'),
  eventUrl: z
    .union([z.string().url('Event URL must be a valid URL'), z.literal('')])
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
});

type EditLocationFormState = {
  placeId: string;
  name: string;
  address: string;
  description: string;
  latitude: string;
  longitude: string;
  walletAddress: string;
  username: string;
  currentImageUrl: string;
  locationImageFile: File | null;
  categoryId: string;
  eventUrl: string;
};

const EMPTY_FORM: EditLocationFormState = {
  placeId: '',
  name: '',
  address: '',
  description: '',
  latitude: '',
  longitude: '',
  walletAddress: '',
  username: '',
  currentImageUrl: '',
  locationImageFile: null,
  categoryId: '',
  eventUrl: '',
};

function formFromLocation(location: Location): EditLocationFormState {
  return {
    placeId: location.place_id,
    name: location.name,
    address: location.address ?? location.name,
    description: location.description ?? '',
    latitude: location.latitude?.toString() ?? '',
    longitude: location.longitude?.toString() ?? '',
    walletAddress: location.creator_wallet_address ?? '',
    username: location.creator_username ?? '',
    currentImageUrl: location.coin_image_url ?? '',
    locationImageFile: null,
    categoryId: location.category_id ?? location.category?.id ?? '',
    eventUrl: location.event_url ?? '',
  };
}

export type EditLocationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: Location | null;
  onSaved?: () => void;
};

/**
 * Shared admin dialog for editing a location.
 * Category options come from `/api/categories`; selected id is saved as `locations.category_id`.
 */
export function EditLocationDialog({
  open,
  onOpenChange,
  location,
  onSaved,
}: EditLocationDialogProps) {
  const { getAccessToken } = usePrivy();
  const [form, setForm] = useState<EditLocationFormState>(EMPTY_FORM);
  const [fileInputKey, setFileInputKey] = useState(0);

  const { data: categories = [] } = useQuery<CategoryOption[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      const responseData = await response.json();
      const data = responseData.data ?? responseData;
      return Array.isArray(data) ? data : [];
    },
  });

  useEffect(() => {
    if (!open || !location) return;
    setForm(formFromLocation(location));
    setFileInputKey((prev) => prev + 1);
  }, [open, location]);

  const locationId = location?.id;

  const mutation = useMutation({
    mutationFn: async () => {
      if (locationId == null) {
        throw new Error('Missing location id');
      }

      const parsed = editLocationSchema.safeParse({
        placeId: form.placeId,
        name: form.name,
        address: form.address,
        description: form.description,
        latitude: form.latitude,
        longitude: form.longitude,
        walletAddress: form.walletAddress,
        username: form.username,
        categoryId: form.categoryId,
        eventUrl: form.eventUrl,
      });

      if (!parsed.success) {
        const firstError = parsed.error.errors[0]?.message;
        throw new Error(firstError || 'Please check the fields and try again.');
      }

      const payload = parsed.data;
      let imageUrl = form.currentImageUrl;

      if (form.locationImageFile) {
        const uploadForm = new FormData();
        uploadForm.append('file', form.locationImageFile);

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: uploadForm,
        });

        if (!uploadResponse.ok) {
          const errorBody = await uploadResponse.json().catch(() => ({}));
          throw new Error(
            typeof errorBody.error === 'string'
              ? errorBody.error
              : 'Failed to upload image'
          );
        }

        const uploadResponseData = await uploadResponse.json();
        const uploadData = uploadResponseData.data || uploadResponseData;
        imageUrl = uploadData.imageUrl || uploadData.url || '';
      }

      const token = await getAccessToken();
      if (!token) {
        throw new Error('Missing authorization token');
      }

      const response = await fetch(`/api/admin/locations/${locationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          placeId: payload.placeId,
          name: payload.name,
          address: form.address.trim() || payload.name,
          description: payload.description?.trim() || null,
          latitude: payload.latitude,
          longitude: payload.longitude,
          walletAddress: payload.walletAddress?.trim() || null,
          username: payload.username?.trim() || null,
          imageUrl: imageUrl || null,
          categoryId: payload.categoryId,
          eventUrl: payload.eventUrl?.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(
          typeof errorBody.error === 'string'
            ? errorBody.error
            : 'Failed to update location'
        );
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Location updated');
      onOpenChange(false);
      onSaved?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Unable to update location');
    },
  });

  const handleSearchAutofill = useCallback(
    (picked: {
      longitude: number;
      latitude: number;
      id: string;
      name?: string;
      placeFormatted?: string;
      featureType?: string;
    }) => {
      const { displayName, address } = deriveDisplayNameAndAddress({
        name: picked.name,
        placeFormatted: picked.placeFormatted,
        featureType: picked.featureType,
      });
      setForm((prev) => ({
        ...prev,
        placeId: picked.id || prev.placeId,
        name: displayName || prev.name,
        address: address || prev.address,
        latitude: picked.latitude?.toString() ?? prev.latitude,
        longitude: picked.longitude?.toString() ?? prev.longitude,
      }));
      toast.info('Loaded details from search. Review and save to apply.');
    },
    []
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle>
            {location?.name ? `Edit ${location.name}` : 'Edit location'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label>Place ID</Label>
            <Input
              value={form.placeId}
              disabled
              className="bg-gray-100 text-gray-500"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-location-name">Name</Label>
            <Input
              id="edit-location-name"
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-location-address">Address</Label>
            <Input
              id="edit-location-address"
              value={form.address}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, address: event.target.value }))
              }
              placeholder="Street address"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-location-description">Description</Label>
            <Textarea
              id="edit-location-description"
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              rows={2}
              maxLength={500}
            />
          </div>

          <div className="space-y-1">
            <Label>Category</Label>
            <Select
              value={form.categoryId || undefined}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, categoryId: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-location-event-url">Event URL</Label>
            <Input
              id="edit-location-event-url"
              type="url"
              value={form.eventUrl}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, eventUrl: event.target.value }))
              }
              placeholder="https://example.com/event"
            />
            <p className="text-xs text-gray-500">
              Optional. Shown as a button on the map marker when set.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="edit-location-latitude">Latitude</Label>
              <Input
                id="edit-location-latitude"
                value={form.latitude}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    latitude: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-location-longitude">Longitude</Label>
              <Input
                id="edit-location-longitude"
                value={form.longitude}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    longitude: event.target.value,
                  }))
                }
                required
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="edit-location-wallet">Creator wallet</Label>
              <Input
                id="edit-location-wallet"
                value={form.walletAddress}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    walletAddress: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-location-username">Creator username</Label>
              <Input
                id="edit-location-username"
                value={form.username}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    username: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-2 rounded-2xl border border-gray-200/70 bg-white/60 p-3">
            <div className="text-xs text-gray-600">
              Use Mapbox search to refresh coordinates and names.
            </div>
            <LocationSearch
              placeholder="Search to autofill"
              proximity={null}
              onSelect={handleSearchAutofill}
              className="w-full"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-location-image">Location image</Label>
            {form.currentImageUrl && (
              <div className="relative h-32 w-full">
                <Image
                  src={form.currentImageUrl}
                  alt={form.name}
                  fill
                  className="rounded-2xl object-cover"
                  unoptimized
                />
              </div>
            )}
            <Input
              key={fileInputKey}
              id="edit-location-image"
              type="file"
              accept="image/*"
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  locationImageFile: event.target.files?.[0] ?? null,
                }))
              }
            />
            <p className="text-xs text-gray-500">
              Uploading a new image replaces the current one.
            </p>
          </div>

          <Button
            type="submit"
            disabled={mutation.isPending || locationId == null}
            className="w-full bg-[#171717] text-white hover:bg-black"
          >
            {mutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save location
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
