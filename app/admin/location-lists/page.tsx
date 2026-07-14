'use client';

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type FormEvent,
} from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { adminApiAuthHeaders } from '@/lib/admin-api-auth-headers';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  Loader2,
  Map,
  Trash2,
  XCircle,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EditLocationDialog } from '@/components/admin/edit-location-dialog';
import LocationSearch from '@/components/shared/location-search';
import { LOCATION_OPTIONS_MAX_ROWS } from '@/lib/constants';
import Image from 'next/image';
import { deriveDisplayNameAndAddress } from '@/lib/utils/location-autofill';
import type {
  Location,
  LocationListWithCount,
  LocationListLocation,
  LocationOption,
} from '@/lib/types';

const LISTS_KEY = ['admin-location-lists'] as const;
const LIST_LOCATIONS_KEY = (listId: string) => ['admin-location-list', listId];
const LOCATION_OPTIONS_KEY = ['admin-location-options'] as const;

const hexColorRegex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const blackButtonClasses =
  'bg-black text-white hover:bg-black/80 focus-visible:ring-black/80';

const createListSchema = z.object({
  title: z.string().min(3),
  description: z.string().max(500).optional(),
  accentColor: z.string().regex(hexColorRegex),
  isActive: z.boolean(),
});

const updateListSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().max(500).optional(),
  accentColor: z.string().regex(hexColorRegex).optional(),
  isActive: z.boolean().optional(),
});

const assignmentSchema = z.object({
  locationId: z.coerce.number().int().positive(),
});

type NewLocationFormState = {
  placeId: string;
  name: string;
  address: string;
  description: string;
  latitude: string;
  longitude: string;
  walletAddress: string;
  username: string;
  locationImageFile: File | null;
  /** `categories.slug` persisted as `locations.type`. */
  categorySlug: string;
  eventUrl: string;
};

type CreateLocationVariables = {
  placeId: string;
  name: string;
  address: string;
  description?: string;
  latitude: number;
  longitude: number;
  walletAddress: string;
  username?: string;
  imageFile: File;
  type: string;
  eventUrl?: string;
};

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
};

const createLocationSchema = z.object({
  placeId: z.string().min(3, 'Place ID is required'),
  name: z.string().min(3, 'Name is required'),
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
  walletAddress: z.string().min(4, 'Wallet address is required'),
  username: z.string().optional(),
  categorySlug: z.string().min(1, 'Category is required'),
  eventUrl: z
    .union([z.string().url('Event URL must be a valid URL'), z.literal('')])
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
});

export default function AdminLocationListsPage() {
  const { user, login, getAccessToken } = usePrivy();
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminLoading, setAdminLoading] = useState(true);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    accentColor: '#111827',
    isActive: true,
  });
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    accentColor: '#111827',
    isActive: true,
  });
  const [locationSearch, setLocationSearch] = useState('');
  const [debouncedLocationSearch, setDebouncedLocationSearch] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(
    null
  );

  /** Debounced so we query the API with server-side search instead of filtering a capped client list only. */
  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedLocationSearch(locationSearch.trim());
    }, 350);
    return () => window.clearTimeout(id);
  }, [locationSearch]);
  const [removalTarget, setRemovalTarget] = useState<number | null>(null);
  const [newLocationForm, setNewLocationForm] = useState<NewLocationFormState>({
    placeId: '',
    name: '',
    address: '',
    description: '',
    latitude: '',
    longitude: '',
    walletAddress: '',
    username: '',
    locationImageFile: null,
    categorySlug: '',
    eventUrl: '',
  });
  const [fileInputKey, setFileInputKey] = useState(0);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [showCreateLocationDialog, setShowCreateLocationDialog] =
    useState(false);
  const [showCsvImportDialog, setShowCsvImportDialog] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvImages, setCsvImages] = useState<File[]>([]);
  const [csvFileInputKey, setCsvFileInputKey] = useState(0);
  const [csvImportForm, setCsvImportForm] = useState({
    title: '',
    description: '',
    accentColor: '#111827',
    isActive: true,
  });

  type ImportResult = {
    row: number;
    name: string;
    status: 'created' | 'skipped' | 'failed';
    reason?: string;
  };
  type CsvImportResponse = {
    list: { id: string };
    summary: {
      total: number;
      created: number;
      skipped: number;
      failed: number;
    };
    results: ImportResult[];
  };
  const [csvImportResults, setCsvImportResults] =
    useState<CsvImportResponse | null>(null);

  const lastUserValuesRef = useRef<{
    walletAddress: string;
    email: string;
  }>({ walletAddress: '', email: '' });

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
      // Unwrap the apiSuccess wrapper
      const data = responseData.data || responseData;
      return data.isAdmin;
    } catch (error) {
      console.error('Error checking admin status', error);
      return false;
    }
  }, [user?.email?.address, getAccessToken]);

  useEffect(() => {
    const verify = async () => {
      if (user?.email?.address) {
        const adminStatus = await checkAdminStatus();
        setIsAdmin(adminStatus);
        setAdminLoading(false);
      } else if (user === null) {
        setIsAdmin(false);
        setAdminLoading(false);
      }
    };

    verify();
  }, [user, checkAdminStatus]);

  useEffect(() => {
    const userWalletAddress = user?.wallet?.address || '';
    const userEmail = user?.email?.address || '';

    const prevUserWallet = lastUserValuesRef.current.walletAddress;
    const prevUserEmail = lastUserValuesRef.current.email;

    // Check if user values actually changed
    const userValuesChanged =
      userWalletAddress !== prevUserWallet || userEmail !== prevUserEmail;

    // Detect if a different user logged in (user context changed)
    // This happens when:
    // 1. Previous user had a different non-empty wallet/email (user switch)
    // 2. Going from empty to non-empty (login after logout) - either wallet OR email
    // 3. Going from non-empty to empty (logout) - either wallet OR email
    const userContextChanged =
      (prevUserWallet !== '' &&
        userWalletAddress !== '' &&
        userWalletAddress !== prevUserWallet) ||
      (prevUserEmail !== '' &&
        userEmail !== '' &&
        userEmail !== prevUserEmail) ||
      (prevUserWallet === '' && userWalletAddress !== '') ||
      (prevUserEmail === '' && userEmail !== '') ||
      (prevUserWallet !== '' && userWalletAddress === '') ||
      (prevUserEmail !== '' && userEmail === '');

    // Update ref with current user values
    lastUserValuesRef.current = {
      walletAddress: userWalletAddress,
      email: userEmail,
    };

    // Only update form if user values changed
    if (!userValuesChanged) {
      return;
    }

    setNewLocationForm((prev) => {
      // If user context changed (different user logged in), update form to new user's data
      // Otherwise, only auto-populate if form fields are empty (preserve manually entered values)
      const newWalletAddress = userContextChanged
        ? userWalletAddress
        : prev.walletAddress || userWalletAddress;
      const newUsername = userContextChanged
        ? userEmail
        : prev.username || userEmail;

      // Only update if values actually changed
      if (
        newWalletAddress === prev.walletAddress &&
        newUsername === prev.username
      ) {
        return prev;
      }

      return {
        ...prev,
        walletAddress: newWalletAddress,
        username: newUsername,
      };
    });
  }, [user?.wallet?.address, user?.email?.address]);

  const { data: lists = [], isLoading: listsLoading } = useQuery<
    LocationListWithCount[]
  >({
    queryKey: LISTS_KEY,
    queryFn: async () => {
      const auth = await adminApiAuthHeaders(getAccessToken);
      const response = await fetch('/api/admin/location-lists', {
        headers: auth,
      });
      if (!response.ok) {
        throw new Error('Failed to fetch location lists');
      }
      const responseData = await response.json();
      // Unwrap the apiSuccess wrapper
      const data = responseData.data || responseData;
      return data.lists ?? [];
    },
    enabled: !!isAdmin && !!user?.email?.address,
  });

  const { data: categories = [] } = useQuery<CategoryOption[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      const responseData = await response.json();
      const data = responseData.data ?? responseData;
      return Array.isArray(data) ? data : [];
    },
    enabled: !!isAdmin,
  });

  const {
    data: locationOptions = [],
    isLoading: locationOptionsLoading,
    isFetching: locationOptionsFetching,
  } = useQuery<LocationOption[]>({
    queryKey: [...LOCATION_OPTIONS_KEY, debouncedLocationSearch] as const,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('limit', String(LOCATION_OPTIONS_MAX_ROWS));
      if (debouncedLocationSearch) {
        params.set('q', debouncedLocationSearch);
      }
      const auth = await adminApiAuthHeaders(getAccessToken);
      const response = await fetch(
        `/api/admin/location-lists/location-options?${params.toString()}`,
        {
          headers: auth,
        }
      );
      if (!response.ok) {
        throw new Error('Failed to fetch location options');
      }
      const responseData = await response.json();
      // Unwrap the apiSuccess wrapper
      const data = responseData.data || responseData;
      return data.locations ?? [];
    },
    enabled: !!isAdmin && !!user?.email?.address,
  });

  const selectedList = useMemo(
    () => lists.find((list) => list.id === selectedListId) ?? null,
    [lists, selectedListId]
  );

  useEffect(() => {
    if (!selectedListId && lists.length > 0) {
      setSelectedListId(lists[0].id);
    }
  }, [lists, selectedListId]);

  useEffect(() => {
    if (selectedList) {
      setEditForm({
        title: selectedList.title,
        description: selectedList.description ?? '',
        accentColor: selectedList.accent_color || '#111827',
        isActive: selectedList.is_active,
      });
    }
  }, [selectedList]);

  const listLocationsKey = selectedListId
    ? LIST_LOCATIONS_KEY(selectedListId)
    : (['admin-location-list', 'idle'] as const);

  const { data: listLocations = [], isLoading: listLocationsLoading } =
    useQuery<LocationListLocation[]>({
      queryKey: listLocationsKey,
      queryFn: async () => {
        const auth = await adminApiAuthHeaders(getAccessToken);
        const response = await fetch(
          `/api/admin/location-lists/${selectedListId}/locations`,
          {
            headers: auth,
          }
        );
        if (!response.ok) {
          throw new Error('Failed to fetch list locations');
        }
        const responseData = await response.json();
        // Unwrap the apiSuccess wrapper
        const data = responseData.data || responseData;
        return data.locations ?? [];
      },
      enabled: !!selectedListId && !!isAdmin && !!user?.email?.address,
    });

  const createListMutation = useMutation({
    mutationFn: async (payload: z.infer<typeof createListSchema>) => {
      const auth = await adminApiAuthHeaders(getAccessToken);
      const response = await fetch('/api/admin/location-lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...auth,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || 'Failed to create list');
      }

      return response.json();
    },
    onSuccess: (data: { list?: { id?: string } }) => {
      queryClient.invalidateQueries({ queryKey: LISTS_KEY });
      setCreateForm({
        title: '',
        description: '',
        accentColor: '#111827',
        isActive: true,
      });
      if (data?.list?.id) {
        setSelectedListId(data.list.id);
      }
      toast.success('List created');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Unable to create list');
    },
  });

  const updateListMutation = useMutation({
    mutationFn: async ({
      listId,
      payload,
    }: {
      listId: string;
      payload: z.infer<typeof updateListSchema>;
    }) => {
      const auth = await adminApiAuthHeaders(getAccessToken);
      const response = await fetch(`/api/admin/location-lists/${listId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...auth,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || 'Failed to update list');
      }

      return response.json();
    },
    onSuccess: () => {
      if (selectedListId) {
        queryClient.invalidateQueries({
          queryKey: LIST_LOCATIONS_KEY(selectedListId),
        });
      }
      queryClient.invalidateQueries({ queryKey: LISTS_KEY });
      toast.success('List updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Unable to update list');
    },
  });

  const addLocationMutation = useMutation({
    mutationFn: async ({
      listId,
      locationId,
    }: {
      listId: string;
      locationId: number;
    }) => {
      const auth = await adminApiAuthHeaders(getAccessToken);
      const response = await fetch(
        `/api/admin/location-lists/${listId}/locations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...auth,
          },
          body: JSON.stringify({ locationId }),
        }
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || 'Failed to add location');
      }

      return response.json();
    },
    onSuccess: () => {
      if (selectedListId) {
        queryClient.invalidateQueries({
          queryKey: LIST_LOCATIONS_KEY(selectedListId),
        });
        queryClient.invalidateQueries({ queryKey: LISTS_KEY });
      }
      setSelectedLocationId(null);
      toast.success('Location added to list');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Unable to add location');
    },
  });

  const removeLocationMutation = useMutation({
    mutationFn: async ({
      listId,
      locationId,
    }: {
      listId: string;
      locationId: number;
    }) => {
      const auth = await adminApiAuthHeaders(getAccessToken);
      const response = await fetch(
        `/api/admin/location-lists/${listId}/locations?locationId=${locationId}`,
        {
          method: 'DELETE',
          headers: auth,
        }
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || 'Failed to remove location');
      }

      return response.json();
    },
    onMutate: ({ locationId }) => {
      setRemovalTarget(locationId);
    },
    onSuccess: () => {
      if (selectedListId) {
        queryClient.invalidateQueries({
          queryKey: LIST_LOCATIONS_KEY(selectedListId),
        });
        queryClient.invalidateQueries({ queryKey: LISTS_KEY });
      }
      toast.success('Location removed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Unable to remove location');
    },
    onSettled: () => {
      setRemovalTarget(null);
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: async (listId: string) => {
      const auth = await adminApiAuthHeaders(getAccessToken);
      const response = await fetch(`/api/admin/location-lists/${listId}`, {
        method: 'DELETE',
        headers: auth,
      });
      if (!response.ok) throw new Error('Failed to delete list');
      return response.json();
    },
    onSuccess: (_data, deletedListId) => {
      queryClient.invalidateQueries({ queryKey: LISTS_KEY });
      if (selectedListId === deletedListId) {
        setSelectedListId(null);
      }
      toast.success('List deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Unable to delete list');
    },
  });

  const csvImportMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Unable to verify admin session. Please log in again.');
      }

      const response = await fetch('/api/admin/location-lists/csv-upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || 'Failed to import CSV');
      }

      const responseData = await response.json();
      return responseData.data || responseData;
    },
    onSuccess: (data: CsvImportResponse) => {
      queryClient.invalidateQueries({ queryKey: LISTS_KEY });
      queryClient.invalidateQueries({ queryKey: LOCATION_OPTIONS_KEY });
      setCsvImportResults(data);
      const { summary } = data;
      toast.success(
        `Imported ${summary.created} of ${summary.total} locations`
      );
      if (data.list?.id) {
        setSelectedListId(data.list.id);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'CSV import failed');
    },
  });

  const createLocationMutation = useMutation<
    { location?: { id?: number } },
    Error,
    CreateLocationVariables
  >({
    mutationFn: async ({
      placeId,
      name,
      address,
      description,
      latitude,
      longitude,
      walletAddress,
      username,
      imageFile,
      type,
      eventUrl,
    }: CreateLocationVariables) => {
      const uploadForm = new FormData();
      uploadForm.append('file', imageFile);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: uploadForm,
      });

      if (!uploadResponse.ok) {
        const errorBody = await uploadResponse.json().catch(() => ({}));
        throw new Error(errorBody.error || 'Failed to upload image');
      }

      const uploadResponseData = await uploadResponse.json();
      // Unwrap the apiSuccess wrapper
      const uploadData = uploadResponseData.data || uploadResponseData;
      const imageUrl = uploadData.imageUrl || uploadData.url;

      if (!imageUrl) {
        throw new Error('Upload succeeded but no image URL was returned');
      }

      const auth = await adminApiAuthHeaders(getAccessToken);
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...auth,
        },
        body: JSON.stringify({
          place_id: placeId,
          name,
          address: address || name, // Use address if provided, fallback to name
          description: description?.trim() || null,
          lat: latitude.toString(),
          lon: longitude.toString(),
          type: type || 'location',
          eventUrl: eventUrl?.trim() || null,
          walletAddress,
          username,
          locationImage: imageUrl,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || 'Failed to create location');
      }

      return response.json();
    },
    onSuccess: (data: { location?: { id?: number } }, variables) => {
      queryClient.invalidateQueries({ queryKey: LOCATION_OPTIONS_KEY });
      toast.success('Location created');
      setNewLocationForm((prev) => ({
        placeId: '',
        name: '',
        address: '',
        description: '',
        latitude: '',
        longitude: '',
        walletAddress: prev.walletAddress,
        username: prev.username,
        locationImageFile: null,
        categorySlug: '',
        eventUrl: '',
      }));
      setFileInputKey((prev) => prev + 1);
      setLocationSearch(variables.name);
      setShowCreateLocationDialog(false);

      if (data?.location?.id) {
        setSelectedLocationId(data.location.id);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Unable to create location');
    },
  });

  const handleCreateList = (event: FormEvent) => {
    event.preventDefault();
    const parsed = createListSchema.safeParse(createForm);
    if (!parsed.success) {
      toast.error('Please complete the form correctly');
      return;
    }
    createListMutation.mutate(parsed.data);
  };

  const handleUpdateList = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedListId) return;

    const parsed = updateListSchema.parse(editForm);
    updateListMutation.mutate({ listId: selectedListId, payload: parsed });
  };

  const handleAddLocation = () => {
    if (!selectedListId) return;
    const parsed = assignmentSchema.safeParse({
      locationId: selectedLocationId,
    });
    if (!parsed.success) {
      toast.error('Select a location first');
      return;
    }

    addLocationMutation.mutate({
      listId: selectedListId,
      locationId: parsed.data.locationId,
    });
  };

  const handleCsvImport = (event: FormEvent) => {
    event.preventDefault();
    if (!csvFile) {
      toast.error('Please select a CSV file');
      return;
    }
    if (csvImportForm.title.trim().length < 3) {
      toast.error('Title must be at least 3 characters');
      return;
    }

    const formData = new FormData();
    formData.append('csv', csvFile);
    formData.append('title', csvImportForm.title);
    formData.append('description', csvImportForm.description);
    formData.append('accentColor', csvImportForm.accentColor);
    formData.append('isActive', String(csvImportForm.isActive));
    formData.append(
      'creatorWalletAddress',
      newLocationForm.walletAddress || user?.wallet?.address || ''
    );
    formData.append(
      'creatorUsername',
      newLocationForm.username || user?.email?.address || ''
    );

    for (const file of csvImages) {
      formData.append('images', file);
    }

    csvImportMutation.mutate(formData);
  };

  const resetCsvImportDialog = () => {
    setCsvFile(null);
    setCsvImages([]);
    setCsvFileInputKey((prev) => prev + 1);
    setCsvImportForm({
      title: '',
      description: '',
      accentColor: '#111827',
      isActive: true,
    });
    setCsvImportResults(null);
  };

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
      setNewLocationForm((prev) => ({
        ...prev,
        placeId: picked.id || prev.placeId,
        name: displayName || prev.name, // Venue name
        address: address || prev.address, // Street address
        latitude: picked.latitude?.toString() ?? prev.latitude,
        longitude: picked.longitude?.toString() ?? prev.longitude,
      }));
      toast.info('Loaded details from search—review and tweak if needed.');
    },
    []
  );

  const handleCreateLocation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = createLocationSchema.safeParse({
      placeId: newLocationForm.placeId,
      name: newLocationForm.name,
      description: newLocationForm.description,
      latitude: newLocationForm.latitude,
      longitude: newLocationForm.longitude,
      walletAddress: newLocationForm.walletAddress,
      username: newLocationForm.username,
      categorySlug: newLocationForm.categorySlug,
      eventUrl: newLocationForm.eventUrl,
    });

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message;
      toast.error(firstError || 'Please complete the location form');
      return;
    }

    if (!newLocationForm.locationImageFile) {
      toast.error('Please upload an image for this location');
      return;
    }

    createLocationMutation.mutate({
      ...parsed.data,
      address: newLocationForm.address || parsed.data.name, // Use form address or fallback to name
      type: parsed.data.categorySlug,
      imageFile: newLocationForm.locationImageFile,
    });
  };

  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Checking access...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <p className="text-lg font-medium">Admin access required.</p>
        <Button onClick={login} className={blackButtonClasses}>
          Login with Privy
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] px-4 py-10 font-grotesk">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
              Admin
            </p>
            <h1 className="text-3xl font-bold tracking-tight">
              Location Lists
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Curate themed collections of IRL locations and control which pins
              appear in each list.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => setShowCsvImportDialog(true)}
            className="flex items-center gap-2 bg-black text-white hover:bg-black/80"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <section className="rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm">
              <div>
                <h2 className="text-lg font-semibold">Create a new list</h2>
                <p className="mt-0.5 text-sm text-gray-500">
                  Titles are public-facing. Accent colors help visually group
                  cards.
                </p>
              </div>

              <form onSubmit={handleCreateList} className="mt-6 space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="new-title">Title</Label>
                  <Input
                    id="new-title"
                    value={createForm.title}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        title: event.target.value,
                      }))
                    }
                    placeholder="Montreal gallery crawl"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="new-description">Description</Label>
                  <Textarea
                    id="new-description"
                    value={createForm.description}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Short blurb about what makes this list special"
                    rows={3}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Accent color</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="color"
                        className="h-10 w-16 cursor-pointer rounded-xl border"
                        value={createForm.accentColor}
                        onChange={(event) =>
                          setCreateForm((prev) => ({
                            ...prev,
                            accentColor: event.target.value,
                          }))
                        }
                      />
                      <Input
                        value={createForm.accentColor}
                        onChange={(event) =>
                          setCreateForm((prev) => ({
                            ...prev,
                            accentColor: event.target.value,
                          }))
                        }
                        className="uppercase"
                      />
                    </div>
                  </div>

                  <div className="flex h-full items-center gap-3 rounded-2xl border border-dashed border-gray-200 p-4">
                    <input
                      id="new-active"
                      type="checkbox"
                      checked={createForm.isActive}
                      onChange={(event) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          isActive: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="new-active" className="font-medium">
                      Active list
                    </Label>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={createListMutation.isPending}
                  className={`w-full ${blackButtonClasses}`}
                >
                  {createListMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Create list
                </Button>
              </form>
            </section>

            <section className="rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Your lists</h2>
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                  {lists.length}
                </span>
              </div>

              {listsLoading ? (
                <div className="mt-10 flex items-center justify-center text-gray-400">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading
                  lists&hellip;
                </div>
              ) : lists.length === 0 ? (
                <div className="mt-8 flex flex-col items-center gap-2 text-center">
                  <Map className="h-8 w-8 text-gray-300" />
                  <p className="text-sm text-gray-500">
                    No lists yet. Create your first curated collection above or{' '}
                    <button
                      type="button"
                      onClick={() => setShowCsvImportDialog(true)}
                      className="font-medium text-black underline underline-offset-2 hover:text-black/70"
                    >
                      import from CSV
                    </button>
                    .
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {lists.map((list) => (
                    <div
                      key={list.id}
                      onClick={() => setSelectedListId(list.id)}
                      className={`cursor-pointer rounded-xl border p-4 text-left transition hover:shadow-md ${
                        selectedListId === list.id
                          ? 'border-black bg-black text-white shadow-lg'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{
                                backgroundColor: list.accent_color || '#111827',
                              }}
                            />
                            <h3 className="truncate text-sm font-semibold">
                              {list.title}
                            </h3>
                          </div>
                          {list.description && (
                            <p
                              className={`mt-1 line-clamp-1 text-xs ${
                                selectedListId === list.id
                                  ? 'text-white/60'
                                  : 'text-gray-400'
                              }`}
                            >
                              {list.description}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              list.is_active
                                ? selectedListId === list.id
                                  ? 'bg-white/20 text-white'
                                  : 'bg-emerald-50 text-emerald-700'
                                : selectedListId === list.id
                                  ? 'bg-white/10 text-white/60'
                                  : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {list.is_active ? 'Active' : 'Draft'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (
                                confirm(
                                  `Delete "${list.title}"? This cannot be undone.`
                                )
                              ) {
                                deleteListMutation.mutate(list.id);
                              }
                            }}
                            className={`rounded p-1 transition hover:bg-red-500 hover:text-white ${
                              selectedListId === list.id
                                ? 'text-white/50'
                                : 'text-gray-300 hover:text-white'
                            }`}
                            disabled={deleteListMutation.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div
                        className={`mt-3 flex items-center gap-1.5 text-xs ${
                          selectedListId === list.id
                            ? 'text-white/60'
                            : 'text-gray-400'
                        }`}
                      >
                        <Map className="h-3.5 w-3.5" />
                        {list.location_count} location
                        {list.location_count !== 1 ? 's' : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm">
            {!selectedList ? (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-center text-gray-400">
                <Map className="h-10 w-10 text-gray-200" />
                <p className="text-sm">
                  Select a list to manage its locations.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <header>
                  <p className="text-sm uppercase tracking-wide text-gray-400">
                    Managing
                  </p>
                  <h2 className="text-2xl font-semibold">
                    {selectedList.title}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {selectedList.location_count} locations · slug{' '}
                    {selectedList.slug}
                  </p>
                </header>

                <form onSubmit={handleUpdateList} className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="edit-title">Title</Label>
                    <Input
                      id="edit-title"
                      value={editForm.title}
                      onChange={(event) =>
                        setEditForm((prev) => ({
                          ...prev,
                          title: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea
                      id="edit-description"
                      rows={3}
                      value={editForm.description}
                      onChange={(event) =>
                        setEditForm((prev) => ({
                          ...prev,
                          description: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Accent color</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="color"
                        className="h-10 w-16 cursor-pointer rounded-xl border"
                        value={editForm.accentColor}
                        onChange={(event) =>
                          setEditForm((prev) => ({
                            ...prev,
                            accentColor: event.target.value,
                          }))
                        }
                      />
                      <Input
                        value={editForm.accentColor}
                        onChange={(event) =>
                          setEditForm((prev) => ({
                            ...prev,
                            accentColor: event.target.value,
                          }))
                        }
                        className="uppercase"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      id="edit-active"
                      type="checkbox"
                      checked={editForm.isActive}
                      onChange={(event) =>
                        setEditForm((prev) => ({
                          ...prev,
                          isActive: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="edit-active">Active list</Label>
                  </div>

                  <Button
                    type="submit"
                    disabled={updateListMutation.isPending}
                    className={`w-full ${blackButtonClasses}`}
                  >
                    {updateListMutation.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Save changes
                  </Button>
                </form>

                <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">Create a new location</p>
                      <p className="text-sm text-gray-600">
                        Can&rsquo;t find it in the list? Create one.
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={() => setShowCreateLocationDialog(true)}
                      className={blackButtonClasses}
                    >
                      Create
                    </Button>
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-dashed border-gray-200 p-4">
                  <div>
                    <p className="font-semibold">Add locations</p>
                    <p className="text-sm text-gray-500">
                      Search by name or address; results load from the server
                      (up to {LOCATION_OPTIONS_MAX_ROWS} matches).
                    </p>
                  </div>

                  <Input
                    placeholder="Search by name or address"
                    value={locationSearch}
                    onChange={(event) => setLocationSearch(event.target.value)}
                    autoComplete="off"
                  />
                  {locationSearch.trim() !== debouncedLocationSearch ? (
                    <p className="text-xs text-gray-500" aria-live="polite">
                      Searching…
                    </p>
                  ) : null}

                  <Select
                    value={
                      selectedLocationId
                        ? String(selectedLocationId)
                        : undefined
                    }
                    onValueChange={(value) =>
                      setSelectedLocationId(Number(value))
                    }
                    disabled={locationOptionsLoading}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          locationOptionsLoading
                            ? 'Loading options...'
                            : locationOptionsFetching
                              ? 'Updating…'
                              : 'Choose a location'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {locationOptionsLoading ? (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          Loading locations...
                        </div>
                      ) : locationOptions.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          {debouncedLocationSearch
                            ? 'No matches'
                            : 'No locations in database yet'}
                        </div>
                      ) : (
                        locationOptions.map((option) => (
                          <SelectItem key={option.id} value={String(option.id)}>
                            <div>
                              <p className="text-sm font-medium">
                                {option.name}
                              </p>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    onClick={handleAddLocation}
                    disabled={
                      addLocationMutation.isPending || !selectedLocationId
                    }
                    className={`w-full ${blackButtonClasses}`}
                  >
                    {addLocationMutation.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Add to list
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">Assigned locations</p>
                    <span className="text-sm text-gray-500">
                      {listLocations.length} total
                    </span>
                  </div>

                  {listLocationsLoading ? (
                    <div className="flex items-center gap-2 text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading
                    </div>
                  ) : listLocations.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No locations on this list yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {listLocations.map((item) => (
                        <div
                          key={item.location_id}
                          className="space-y-3 rounded-2xl border border-gray-200 p-3 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold">
                                {item.location.name}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setEditingLocation({
                                    ...item.location,
                                    id: item.location.id ?? item.location_id,
                                  })
                                }
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                className={blackButtonClasses}
                                onClick={() =>
                                  removeLocationMutation.mutate({
                                    listId: selectedList.id,
                                    locationId: item.location_id,
                                  })
                                }
                                disabled={removalTarget === item.location_id}
                              >
                                {removalTarget === item.location_id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <XCircle className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* CSV Import Dialog */}
      <Dialog
        open={showCsvImportDialog}
        onOpenChange={(open) => {
          setShowCsvImportDialog(open);
          if (!open) resetCsvImportDialog();
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import list from CSV
            </DialogTitle>
          </DialogHeader>

          {csvImportResults ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-emerald-900">
                    Import complete
                  </p>
                  <p className="text-xs text-emerald-700">
                    {csvImportResults.summary.created} created &middot;{' '}
                    {csvImportResults.summary.skipped} skipped &middot;{' '}
                    {csvImportResults.summary.failed} failed
                  </p>
                </div>
              </div>

              <div className="max-h-60 space-y-1 overflow-y-auto rounded-xl border border-gray-100 p-3">
                {csvImportResults.results.map((r, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-xs"
                  >
                    {r.status === 'created' && (
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    )}
                    {r.status === 'skipped' && (
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    )}
                    {r.status === 'failed' && (
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                    )}
                    <div className="min-w-0">
                      <span className="font-medium">{r.name}</span>
                      {r.reason && (
                        <span className="ml-1 text-gray-400">
                          &mdash; {r.reason}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                onClick={() => {
                  setShowCsvImportDialog(false);
                  resetCsvImportDialog();
                }}
                className={`w-full ${blackButtonClasses}`}
              >
                Done
              </Button>
            </div>
          ) : (
            <form onSubmit={handleCsvImport} className="space-y-4">
              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                  <div className="text-xs text-blue-800">
                    <p className="font-medium">CSV format</p>
                    <p className="mt-0.5">
                      Columns:{' '}
                      <code className="font-mono text-[11px]">
                        Category, Location, Address, Quote, Image Link,
                        Recommended By
                      </code>
                    </p>
                    <p className="mt-1">
                      The <strong>Image Link</strong> column can be an image URL
                      (including Google Drive share links) or the filename of an
                      uploaded image (e.g.{' '}
                      <code className="font-mono text-[11px]">cafe.jpg</code>).
                    </p>
                    <a
                      href="/toronto.csv"
                      download
                      className="mt-1.5 inline-flex items-center gap-1 font-medium text-blue-600 underline underline-offset-2"
                    >
                      <Download className="h-3 w-3" />
                      Download sample CSV
                    </a>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="csv-title">List title</Label>
                <Input
                  id="csv-title"
                  value={csvImportForm.title}
                  onChange={(e) =>
                    setCsvImportForm((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  placeholder="Toronto curated spots"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="csv-description">Description</Label>
                <Textarea
                  id="csv-description"
                  value={csvImportForm.description}
                  onChange={(e) =>
                    setCsvImportForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="A collection of must-visit spots"
                  rows={2}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Accent color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      className="h-9 w-14 cursor-pointer rounded-lg border p-1"
                      value={csvImportForm.accentColor}
                      onChange={(e) =>
                        setCsvImportForm((prev) => ({
                          ...prev,
                          accentColor: e.target.value,
                        }))
                      }
                    />
                    <Input
                      value={csvImportForm.accentColor}
                      onChange={(e) =>
                        setCsvImportForm((prev) => ({
                          ...prev,
                          accentColor: e.target.value,
                        }))
                      }
                      className="uppercase"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-dashed border-gray-200 px-3 py-2">
                  <input
                    id="csv-active"
                    type="checkbox"
                    checked={csvImportForm.isActive}
                    onChange={(e) =>
                      setCsvImportForm((prev) => ({
                        ...prev,
                        isActive: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="csv-active" className="text-sm font-medium">
                    Active list
                  </Label>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="csv-file">CSV file</Label>
                <Input
                  key={`csv-${csvFileInputKey}`}
                  id="csv-file"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
                  required
                />
                {csvFile && (
                  <p className="text-xs text-gray-500">
                    {csvFile.name} ({Math.round(csvFile.size / 1024)} kB)
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="csv-images">Location images</Label>
                <Input
                  key={`img-${csvFileInputKey}`}
                  id="csv-images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) =>
                    setCsvImages(
                      e.target.files ? Array.from(e.target.files) : []
                    )
                  }
                />
                {csvImages.length > 0 && (
                  <p className="text-xs text-gray-500">
                    {csvImages.length} image
                    {csvImages.length !== 1 ? 's' : ''} selected
                  </p>
                )}
                <p className="text-xs text-gray-400">
                  Optional if your CSV already has image URLs. Filenames here
                  are matched to the &ldquo;Image Link&rdquo; column.
                </p>
              </div>

              <Button
                type="submit"
                disabled={csvImportMutation.isPending}
                className={`w-full ${blackButtonClasses}`}
              >
                {csvImportMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing&hellip;
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Import locations
                  </>
                )}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Location Dialog */}
      <Dialog
        open={showCreateLocationDialog}
        onOpenChange={setShowCreateLocationDialog}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle>Create a new location</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateLocation} className="space-y-4">
            <div className="space-y-2 rounded-2xl border border-gray-200 bg-gray-50 p-3">
              <div className="text-xs text-gray-600">
                Use Mapbox search to auto-fill the Place ID + coordinates, then
                tweak any fields manually.
              </div>
              <LocationSearch
                placeholder="Search for a spot"
                proximity={null}
                onSelect={handleSearchAutofill}
                className="w-full"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="new-place-id">Place ID</Label>
              <Input
                id="new-place-id"
                value={newLocationForm.placeId}
                onChange={(event) =>
                  setNewLocationForm((prev) => ({
                    ...prev,
                    placeId: event.target.value,
                  }))
                }
                placeholder="mapbox.places.123"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="new-name">Name</Label>
              <Input
                id="new-name"
                value={newLocationForm.name}
                onChange={(event) =>
                  setNewLocationForm((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="new-address">Address</Label>
              <Input
                id="new-address"
                value={newLocationForm.address}
                onChange={(event) =>
                  setNewLocationForm((prev) => ({
                    ...prev,
                    address: event.target.value,
                  }))
                }
                placeholder="Street address"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="new-description">Description</Label>
              <Textarea
                id="new-description"
                value={newLocationForm.description}
                onChange={(event) =>
                  setNewLocationForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                rows={2}
                maxLength={500}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="new-location-category">Category</Label>
              <Select
                value={newLocationForm.categorySlug || undefined}
                onValueChange={(value) =>
                  setNewLocationForm((prev) => ({
                    ...prev,
                    categorySlug: value,
                  }))
                }
              >
                <SelectTrigger id="new-location-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.slug}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="new-event-url">Event URL</Label>
              <Input
                id="new-event-url"
                type="url"
                value={newLocationForm.eventUrl}
                onChange={(event) =>
                  setNewLocationForm((prev) => ({
                    ...prev,
                    eventUrl: event.target.value,
                  }))
                }
                placeholder="https://example.com/event"
              />
              <p className="text-xs text-gray-500">
                Optional. Shown as a button on the map marker when set.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="new-latitude">Latitude</Label>
                <Input
                  id="new-latitude"
                  value={newLocationForm.latitude}
                  onChange={(event) =>
                    setNewLocationForm((prev) => ({
                      ...prev,
                      latitude: event.target.value,
                    }))
                  }
                  placeholder="45.5017"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-longitude">Longitude</Label>
                <Input
                  id="new-longitude"
                  value={newLocationForm.longitude}
                  onChange={(event) =>
                    setNewLocationForm((prev) => ({
                      ...prev,
                      longitude: event.target.value,
                    }))
                  }
                  placeholder="-73.5673"
                  required
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="new-wallet-address">Creator wallet</Label>
                <Input
                  id="new-wallet-address"
                  value={newLocationForm.walletAddress}
                  onChange={(event) =>
                    setNewLocationForm((prev) => ({
                      ...prev,
                      walletAddress: event.target.value,
                    }))
                  }
                  placeholder="0x..."
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-username">Creator username</Label>
                <Input
                  id="new-username"
                  value={newLocationForm.username}
                  onChange={(event) =>
                    setNewLocationForm((prev) => ({
                      ...prev,
                      username: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="new-location-image">Location image</Label>
              <Input
                key={fileInputKey}
                id="new-location-image"
                type="file"
                accept="image/*"
                onChange={(event) =>
                  setNewLocationForm((prev) => ({
                    ...prev,
                    locationImageFile: event.target.files?.[0] ?? null,
                  }))
                }
                required
              />
              {newLocationForm.locationImageFile ? (
                <p className="text-xs text-gray-600">
                  {newLocationForm.locationImageFile.name} (
                  {Math.round(newLocationForm.locationImageFile.size / 1024)}
                  kB)
                </p>
              ) : (
                <p className="text-xs text-gray-500">
                  Upload a square asset&mdash;pins only show up with an image.
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={createLocationMutation.isPending}
              className={`flex h-11 w-full items-center justify-between bg-[var(--Dark-Tint-100---Ink-Black,#171717)] px-4 py-2 transition-colors hover:bg-black disabled:opacity-50 ${blackButtonClasses}`}
            >
              <span className="label-medium uppercase text-white">
                {createLocationMutation.isPending
                  ? 'Creating...'
                  : 'Create location'}
              </span>
              {createLocationMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#DBDBDB]" />
              ) : (
                <Image
                  src="/arrow-right.svg"
                  alt=""
                  width={24}
                  height={24}
                  className="block size-6 max-w-none"
                />
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <EditLocationDialog
        open={editingLocation != null}
        onOpenChange={(open) => {
          if (!open) setEditingLocation(null);
        }}
        location={editingLocation}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: listLocationsKey });
          queryClient.invalidateQueries({ queryKey: LOCATION_OPTIONS_KEY });
          setEditingLocation(null);
        }}
      />
    </div>
  );
}
