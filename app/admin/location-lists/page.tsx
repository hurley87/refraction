"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type FormEvent,
} from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2, Map, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import LocationSearch from "@/components/shared/location-search";
import type {
  LocationListWithCount,
  LocationListLocation,
  LocationOption,
} from "@/lib/types";

const LISTS_KEY = ["admin-location-lists"] as const;
const LIST_LOCATIONS_KEY = (listId: string) => ["admin-location-list", listId];
const LOCATION_OPTIONS_KEY = ["admin-location-options"] as const;

const hexColorRegex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const blackButtonClasses =
  "bg-black text-white hover:bg-black/80 focus-visible:ring-black/80";

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

const editLocationSchema = z
  .object({
    placeId: z.string().min(3, "Place ID is required"),
    displayName: z.string().min(3, "Display name is required"),
    name: z.string().min(3, "Name is required"),
    description: z.string().max(500).optional(),
    latitude: z
      .string()
      .min(1, "Latitude is required")
      .pipe(
        z.coerce.number().refine((value) => value >= -90 && value <= 90, {
          message: "Latitude must be between -90 and 90",
        }),
      ),
    longitude: z
      .string()
      .min(1, "Longitude is required")
      .pipe(
        z.coerce.number().refine((value) => value >= -180 && value <= 180, {
          message: "Longitude must be between -180 and 180",
        }),
      ),
    walletAddress: z.string().optional(),
    username: z.string().optional(),
    locationType: z.enum(["location", "event"]).default("location"),
    eventUrl: z
      .union([z.string().url("Event URL must be a valid URL"), z.literal("")])
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
  })
  .refine(
    (data) =>
      data.locationType !== "event" ||
      (data.eventUrl && data.eventUrl.length > 0),
    {
      message: "Event URL is required for event locations",
      path: ["eventUrl"],
    },
  );

type NewLocationFormState = {
  placeId: string;
  displayName: string;
  name: string;
  description: string;
  latitude: string;
  longitude: string;
  walletAddress: string;
  username: string;
  locationImageFile: File | null;
  locationType: "location" | "event";
  eventUrl: string;
};

type EditLocationFormState = {
  placeId: string;
  displayName: string;
  name: string;
  description: string;
  latitude: string;
  longitude: string;
  walletAddress: string;
  username: string;
  currentImageUrl: string;
  locationImageFile: File | null;
  locationType: "location" | "event";
  eventUrl: string;
};

type CreateLocationVariables = {
  placeId: string;
  displayName: string;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  walletAddress: string;
  username?: string;
  imageFile: File;
  type: string;
  eventUrl?: string;
};

type EditLocationVariables = {
  locationId: number;
  payload: z.infer<typeof editLocationSchema>;
  currentImageUrl: string;
  imageFile?: File | null;
};

const createLocationSchema = z
  .object({
    placeId: z.string().min(3, "Place ID is required"),
    displayName: z.string().min(3, "Display name is required"),
    name: z.string().min(3, "Name is required"),
    description: z.string().max(500).optional(),
    latitude: z
      .string()
      .min(1, "Latitude is required")
      .pipe(
        z.coerce.number().refine((value) => value >= -90 && value <= 90, {
          message: "Latitude must be between -90 and 90",
        }),
      ),
    longitude: z
      .string()
      .min(1, "Longitude is required")
      .pipe(
        z.coerce.number().refine((value) => value >= -180 && value <= 180, {
          message: "Longitude must be between -180 and 180",
        }),
      ),
    walletAddress: z.string().min(4, "Wallet address is required"),
    username: z.string().optional(),
    locationType: z.enum(["location", "event"]).default("location"),
    eventUrl: z
      .union([z.string().url("Event URL must be a valid URL"), z.literal("")])
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
  })
  .refine(
    (data) =>
      data.locationType !== "event" ||
      (data.eventUrl && data.eventUrl.length > 0),
    {
      message: "Event URL is required for event locations",
      path: ["eventUrl"],
    },
  );

export default function AdminLocationListsPage() {
  const { user, login } = usePrivy();
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminLoading, setAdminLoading] = useState(true);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    accentColor: "#111827",
    isActive: true,
  });
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    accentColor: "#111827",
    isActive: true,
  });
  const [locationSearch, setLocationSearch] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(
    null,
  );
  const [removalTarget, setRemovalTarget] = useState<number | null>(null);
  const [newLocationForm, setNewLocationForm] = useState<NewLocationFormState>({
    placeId: "",
    displayName: "",
    name: "",
    description: "",
    latitude: "",
    longitude: "",
    walletAddress: "",
    username: "",
    locationImageFile: null,
    locationType: "location",
    eventUrl: "",
  });
  const [fileInputKey, setFileInputKey] = useState(0);
  const [editingLocation, setEditingLocation] =
    useState<LocationListLocation | null>(null);
  const [editingLocationId, setEditingLocationId] = useState<number | null>(
    null,
  );
  const [editLocationForm, setEditLocationForm] =
    useState<EditLocationFormState>({
      placeId: "",
      displayName: "",
      name: "",
      description: "",
      latitude: "",
      longitude: "",
      walletAddress: "",
      username: "",
      currentImageUrl: "",
      locationImageFile: null,
      locationType: "location",
      eventUrl: "",
    });
  const [editFileInputKey, setEditFileInputKey] = useState(0);
  const [showCreateLocationDialog, setShowCreateLocationDialog] =
    useState(false);
  const lastUserValuesRef = useRef<{
    walletAddress: string;
    email: string;
  }>({ walletAddress: "", email: "" });

  const checkAdminStatus = useCallback(async () => {
    if (!user?.email?.address) return false;

    try {
      const response = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email.address }),
      });
      const responseData = await response.json();
      // Unwrap the apiSuccess wrapper
      const data = responseData.data || responseData;
      return data.isAdmin;
    } catch (error) {
      console.error("Error checking admin status", error);
      return false;
    }
  }, [user?.email?.address]);

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
    const userWalletAddress = user?.wallet?.address || "";
    const userEmail = user?.email?.address || "";

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
      (prevUserWallet !== "" &&
        userWalletAddress !== "" &&
        userWalletAddress !== prevUserWallet) ||
      (prevUserEmail !== "" &&
        userEmail !== "" &&
        userEmail !== prevUserEmail) ||
      (prevUserWallet === "" && userWalletAddress !== "") ||
      (prevUserEmail === "" && userEmail !== "") ||
      (prevUserWallet !== "" && userWalletAddress === "") ||
      (prevUserEmail !== "" && userEmail === "");

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

  const adminEmail = user?.email?.address || "";

  const { data: lists = [], isLoading: listsLoading } = useQuery<
    LocationListWithCount[]
  >({
    queryKey: LISTS_KEY,
    queryFn: async () => {
      const response = await fetch("/api/admin/location-lists", {
        headers: { "x-user-email": adminEmail },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch location lists");
      }
      const responseData = await response.json();
      // Unwrap the apiSuccess wrapper
      const data = responseData.data || responseData;
      return data.lists ?? [];
    },
    enabled: !!isAdmin,
  });

  const { data: locationOptions = [], isLoading: locationOptionsLoading } =
    useQuery<LocationOption[]>({
      queryKey: LOCATION_OPTIONS_KEY,
      queryFn: async () => {
        const response = await fetch(
          "/api/admin/location-lists/location-options",
          {
            headers: { "x-user-email": adminEmail },
          },
        );
        if (!response.ok) {
          throw new Error("Failed to fetch location options");
        }
        const responseData = await response.json();
        // Unwrap the apiSuccess wrapper
        const data = responseData.data || responseData;
        return data.locations ?? [];
      },
      enabled: !!isAdmin,
    });

  const selectedList = useMemo(
    () => lists.find((list) => list.id === selectedListId) ?? null,
    [lists, selectedListId],
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
        description: selectedList.description ?? "",
        accentColor: selectedList.accent_color || "#111827",
        isActive: selectedList.is_active,
      });
    }
  }, [selectedList]);

  const listLocationsKey = selectedListId
    ? LIST_LOCATIONS_KEY(selectedListId)
    : (["admin-location-list", "idle"] as const);

  const { data: listLocations = [], isLoading: listLocationsLoading } =
    useQuery<LocationListLocation[]>({
      queryKey: listLocationsKey,
      queryFn: async () => {
        const response = await fetch(
          `/api/admin/location-lists/${selectedListId}/locations`,
          {
            headers: { "x-user-email": adminEmail },
          },
        );
        if (!response.ok) {
          throw new Error("Failed to fetch list locations");
        }
        const responseData = await response.json();
        // Unwrap the apiSuccess wrapper
        const data = responseData.data || responseData;
        return data.locations ?? [];
      },
      enabled: !!selectedListId && !!isAdmin,
    });

  const createListMutation = useMutation({
    mutationFn: async (payload: z.infer<typeof createListSchema>) => {
      const response = await fetch("/api/admin/location-lists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": adminEmail,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || "Failed to create list");
      }

      return response.json();
    },
    onSuccess: (data: { list?: { id?: string } }) => {
      queryClient.invalidateQueries({ queryKey: LISTS_KEY });
      setCreateForm({
        title: "",
        description: "",
        accentColor: "#111827",
        isActive: true,
      });
      if (data?.list?.id) {
        setSelectedListId(data.list.id);
      }
      toast.success("List created");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Unable to create list");
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
      const response = await fetch(`/api/admin/location-lists/${listId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": adminEmail,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || "Failed to update list");
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
      toast.success("List updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Unable to update list");
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
      const response = await fetch(
        `/api/admin/location-lists/${listId}/locations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-email": adminEmail,
          },
          body: JSON.stringify({ locationId }),
        },
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || "Failed to add location");
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
      toast.success("Location added to list");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Unable to add location");
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
      const response = await fetch(
        `/api/admin/location-lists/${listId}/locations?locationId=${locationId}`,
        {
          method: "DELETE",
          headers: {
            "x-user-email": adminEmail,
          },
        },
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || "Failed to remove location");
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
      toast.success("Location removed");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Unable to remove location");
    },
    onSettled: () => {
      setRemovalTarget(null);
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: async (listId: string) => {
      const response = await fetch(`/api/admin/location-lists/${listId}`, {
        method: "DELETE",
        headers: { "x-user-email": adminEmail },
      });
      if (!response.ok) throw new Error("Failed to delete list");
      return response.json();
    },
    onSuccess: (_data, deletedListId) => {
      queryClient.invalidateQueries({ queryKey: LISTS_KEY });
      if (selectedListId === deletedListId) {
        setSelectedListId(null);
      }
      toast.success("List deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Unable to delete list");
    },
  });

  const createLocationMutation = useMutation<
    { location?: { id?: number } },
    Error,
    CreateLocationVariables
  >({
    mutationFn: async ({
      placeId,
      displayName,
      name,
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
      uploadForm.append("file", imageFile);

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: uploadForm,
      });

      if (!uploadResponse.ok) {
        const errorBody = await uploadResponse.json().catch(() => ({}));
        throw new Error(errorBody.error || "Failed to upload image");
      }

      const uploadResponseData = await uploadResponse.json();
      // Unwrap the apiSuccess wrapper
      const uploadData = uploadResponseData.data || uploadResponseData;
      const imageUrl = uploadData.imageUrl || uploadData.url;

      if (!imageUrl) {
        throw new Error("Upload succeeded but no image URL was returned");
      }

      const response = await fetch("/api/locations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": user?.email?.address || "",
        },
        body: JSON.stringify({
          place_id: placeId,
          display_name: displayName,
          name,
          description: description?.trim() || null,
          lat: latitude.toString(),
          lon: longitude.toString(),
          type: type || "location",
          eventUrl: eventUrl?.trim() || null,
          walletAddress,
          username,
          locationImage: imageUrl,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || "Failed to create location");
      }

      return response.json();
    },
    onSuccess: (data: { location?: { id?: number } }, variables) => {
      queryClient.invalidateQueries({ queryKey: LOCATION_OPTIONS_KEY });
      toast.success("Location created");
      setNewLocationForm((prev) => ({
        placeId: "",
        displayName: "",
        name: "",
        description: "",
        latitude: "",
        longitude: "",
        walletAddress: prev.walletAddress,
        username: prev.username,
        locationImageFile: null,
        locationType: "location",
        eventUrl: "",
      }));
      setFileInputKey((prev) => prev + 1);
      setLocationSearch(variables.displayName);
      setShowCreateLocationDialog(false);

      if (data?.location?.id) {
        setSelectedLocationId(data.location.id);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Unable to create location");
    },
  });

  const editLocationMutation = useMutation<
    { location?: { id?: number } },
    Error,
    EditLocationVariables
  >({
    mutationFn: async ({ locationId, payload, currentImageUrl, imageFile }) => {
      let imageUrl = currentImageUrl;
      if (imageFile) {
        const uploadForm = new FormData();
        uploadForm.append("file", imageFile);

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: uploadForm,
        });

        if (!uploadResponse.ok) {
          const errorBody = await uploadResponse.json().catch(() => ({}));
          throw new Error(errorBody.error || "Failed to upload image");
        }

        const uploadResponseData = await uploadResponse.json();
        // Unwrap the apiSuccess wrapper
        const uploadData = uploadResponseData.data || uploadResponseData;
        imageUrl = uploadData.imageUrl || uploadData.url || "";
      }

      const response = await fetch(`/api/admin/locations/${locationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": adminEmail,
        },
        body: JSON.stringify({
          placeId: payload.placeId,
          displayName: payload.displayName,
          name: payload.name,
          description: payload.description?.trim() || null,
          latitude: payload.latitude,
          longitude: payload.longitude,
          walletAddress: payload.walletAddress?.trim() || null,
          username: payload.username?.trim() || null,
          imageUrl: imageUrl || null,
          type: payload.locationType || "location",
          eventUrl: payload.eventUrl?.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || "Failed to update location");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Location updated");
      queryClient.invalidateQueries({ queryKey: listLocationsKey });
      queryClient.invalidateQueries({ queryKey: LOCATION_OPTIONS_KEY });
      resetEditLocationForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Unable to update location");
    },
  });

  const visibleLocationOptions = useMemo(() => {
    const normalized = locationSearch.trim().toLowerCase();
    if (!normalized) return locationOptions;

    return locationOptions.filter((option) => {
      const display = option.display_name?.toLowerCase() || "";
      const name = option.name?.toLowerCase() || "";
      return display.includes(normalized) || name.includes(normalized);
    });
  }, [locationOptions, locationSearch]);

  const handleCreateList = (event: FormEvent) => {
    event.preventDefault();
    const parsed = createListSchema.safeParse(createForm);
    if (!parsed.success) {
      toast.error("Please complete the form correctly");
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
      toast.error("Select a location first");
      return;
    }

    addLocationMutation.mutate({
      listId: selectedListId,
      locationId: parsed.data.locationId,
    });
  };

  const handleSearchAutofill = useCallback(
    (picked: {
      longitude: number;
      latitude: number;
      id: string;
      name?: string;
      placeFormatted?: string;
    }) => {
      setNewLocationForm((prev) => ({
        ...prev,
        placeId: picked.id || prev.placeId,
        displayName: picked.placeFormatted || picked.name || prev.displayName,
        name: picked.name || picked.placeFormatted || prev.name,
        latitude: picked.latitude?.toString() ?? prev.latitude,
        longitude: picked.longitude?.toString() ?? prev.longitude,
      }));
      toast.info("Loaded details from search—review and tweak if needed.");
    },
    [],
  );

  const handleCreateLocation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = createLocationSchema.safeParse({
      placeId: newLocationForm.placeId,
      displayName: newLocationForm.displayName,
      name: newLocationForm.name,
      description: newLocationForm.description,
      latitude: newLocationForm.latitude,
      longitude: newLocationForm.longitude,
      walletAddress: newLocationForm.walletAddress,
      username: newLocationForm.username,
      locationType: newLocationForm.locationType,
      eventUrl: newLocationForm.eventUrl,
    });

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message;
      toast.error(firstError || "Please complete the location form");
      return;
    }

    if (!newLocationForm.locationImageFile) {
      toast.error("Please upload an image for this location");
      return;
    }

    createLocationMutation.mutate({
      ...parsed.data,
      type: parsed.data.locationType || "location",
      imageFile: newLocationForm.locationImageFile,
    });
  };

  const startEditingLocation = (entry: LocationListLocation) => {
    setEditingLocation(entry);
    setEditingLocationId(entry.location.id ?? entry.location_id);
    setEditLocationForm({
      placeId: entry.location.place_id,
      displayName: entry.location.display_name,
      name: entry.location.name,
      description: entry.location.description ?? "",
      latitude: entry.location.latitude?.toString() ?? "",
      longitude: entry.location.longitude?.toString() ?? "",
      walletAddress: entry.location.creator_wallet_address ?? "",
      username: entry.location.creator_username ?? "",
      currentImageUrl: entry.location.coin_image_url ?? "",
      locationImageFile: null,
      locationType: (entry.location.type as "location" | "event") || "location",
      eventUrl: entry.location.event_url ?? "",
    });
    setEditFileInputKey((prev) => prev + 1);
  };

  const resetEditLocationForm = () => {
    setEditingLocation(null);
    setEditingLocationId(null);
    setEditLocationForm({
      placeId: "",
      displayName: "",
      name: "",
      description: "",
      latitude: "",
      longitude: "",
      walletAddress: "",
      username: "",
      currentImageUrl: "",
      locationImageFile: null,
      locationType: "location",
      eventUrl: "",
    });
    setEditFileInputKey((prev) => prev + 1);
  };

  const handleUpdateLocation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingLocation || !editingLocationId) return;

    const parsed = editLocationSchema.safeParse({
      placeId: editLocationForm.placeId,
      displayName: editLocationForm.displayName,
      name: editLocationForm.name,
      description: editLocationForm.description,
      latitude: editLocationForm.latitude,
      longitude: editLocationForm.longitude,
      walletAddress: editLocationForm.walletAddress,
      username: editLocationForm.username,
      locationType: editLocationForm.locationType,
      eventUrl: editLocationForm.eventUrl,
    });

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message;
      toast.error(firstError || "Please check the fields and try again.");
      return;
    }

    editLocationMutation.mutate({
      locationId: editingLocationId,
      payload: parsed.data,
      currentImageUrl: editLocationForm.currentImageUrl,
      imageFile: editLocationForm.locationImageFile,
    });
  };

  const handleEditSearchAutofill = useCallback(
    (picked: {
      longitude: number;
      latitude: number;
      id: string;
      name?: string;
      placeFormatted?: string;
    }) => {
      setEditLocationForm((prev) => ({
        ...prev,
        placeId: picked.id || prev.placeId,
        displayName: picked.placeFormatted || picked.name || prev.displayName,
        name: picked.name || picked.placeFormatted || prev.name,
        latitude: picked.latitude?.toString() ?? prev.latitude,
        longitude: picked.longitude?.toString() ?? prev.longitude,
      }));
      toast.info("Loaded details from search. Review and save to apply.");
    },
    [],
  );

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
    <div className="min-h-screen bg-[#f5f5f5] px-4 py-10 font-inktrap">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-gray-500">
              Admin
            </p>
            <h1 className="text-3xl font-semibold">Location Lists</h1>
            <p className="text-sm text-gray-500">
              Curate themed collections of IRL locations and control which pins
              appear in each list.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <div>
                <h2 className="text-xl font-semibold">Create a new list</h2>
                <p className="text-sm text-gray-500">
                  Titles are public facing. Accent colors help visually group
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

            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Your lists</h2>
                <span className="text-sm text-gray-500">
                  {lists.length} total
                </span>
              </div>

              {listsLoading ? (
                <div className="mt-10 flex items-center justify-center text-gray-500">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading
                  lists
                </div>
              ) : lists.length === 0 ? (
                <p className="mt-6 text-sm text-gray-500">
                  No lists yet. Create your first curated collection above.
                </p>
              ) : (
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {lists.map((list) => (
                    <div
                      key={list.id}
                      onClick={() => setSelectedListId(list.id)}
                      className={`cursor-pointer rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${
                        selectedListId === list.id
                          ? "border-black bg-black text-white"
                          : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {list.title}
                          </h3>
                          <p
                            className={`text-xs ${
                              selectedListId === list.id
                                ? "text-white/70"
                                : "text-gray-500"
                            }`}
                          >
                            {list.slug}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{
                              backgroundColor: list.accent_color || "#111827",
                            }}
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (
                                confirm(
                                  `Delete "${list.title}"? This cannot be undone.`,
                                )
                              ) {
                                deleteListMutation.mutate(list.id);
                              }
                            }}
                            className={`rounded p-1 transition hover:bg-red-500 hover:text-white ${
                              selectedListId === list.id
                                ? "text-white/70"
                                : "text-gray-400"
                            }`}
                            disabled={deleteListMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-2 text-sm">
                        <Map className="h-4 w-4" />
                        {list.location_count} locations
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="rounded-3xl bg-white p-6 shadow-sm">
            {!selectedList ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-gray-500">
                <p>Select a list to manage assignments.</p>
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
                    {selectedList.location_count} locations · slug{" "}
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
                      Search by name and attach to this list.
                    </p>
                  </div>

                  <Input
                    placeholder="Search locations"
                    value={locationSearch}
                    onChange={(event) => setLocationSearch(event.target.value)}
                  />

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
                            ? "Loading options..."
                            : "Choose a location"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {locationOptionsLoading ? (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          Loading locations...
                        </div>
                      ) : visibleLocationOptions.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          No matches
                        </div>
                      ) : (
                        visibleLocationOptions.slice(0, 50).map((option) => (
                          <SelectItem key={option.id} value={String(option.id)}>
                            <div>
                              <p className="text-sm font-medium">
                                {option.display_name}
                              </p>
                              <p className="text-xs text-gray-500">
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
                          className={`space-y-3 rounded-2xl border p-3 transition-colors ${
                            editingLocationId ===
                            (item.location.id ?? item.location_id)
                              ? "border-black bg-gray-50 ring-1 ring-black"
                              : "border-gray-200"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold">
                                {item.location.display_name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {item.location.name}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => startEditingLocation(item)}
                                disabled={
                                  editLocationMutation.isPending &&
                                  editingLocation?.location_id ===
                                    item.location_id
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

                <div className="space-y-4 rounded-2xl border border-dashed border-gray-200 bg-white/70 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">
                        {editingLocation
                          ? `Editing ${editingLocation.location.display_name}`
                          : "Edit location"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {editingLocation
                          ? "Adjust the fields and save to update the location."
                          : "Select a location above to edit its details."}
                      </p>
                    </div>
                    {editingLocation && (
                      <button
                        type="button"
                        onClick={resetEditLocationForm}
                        className="text-sm text-gray-500 hover:text-gray-900 underline"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  {editingLocation ? (
                    <form onSubmit={handleUpdateLocation} className="space-y-3">
                      <div className="space-y-1">
                        <Label>Place ID</Label>
                        <Input
                          value={editLocationForm.placeId}
                          disabled
                          className="bg-gray-100 text-gray-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label>Display name</Label>
                        <Input
                          value={editLocationForm.displayName}
                          onChange={(event) =>
                            setEditLocationForm((prev) => ({
                              ...prev,
                              displayName: event.target.value,
                            }))
                          }
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <Label>Address</Label>
                        <Input
                          value={editLocationForm.name}
                          onChange={(event) =>
                            setEditLocationForm((prev) => ({
                              ...prev,
                              name: event.target.value,
                            }))
                          }
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <Label>Description</Label>
                        <Textarea
                          value={editLocationForm.description}
                          onChange={(event) =>
                            setEditLocationForm((prev) => ({
                              ...prev,
                              description: event.target.value,
                            }))
                          }
                          rows={2}
                          maxLength={500}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label>Type</Label>
                        <Select
                          value={editLocationForm.locationType}
                          onValueChange={(value) =>
                            setEditLocationForm((prev) => ({
                              ...prev,
                              locationType: value as "location" | "event",
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="location">Location</SelectItem>
                            <SelectItem value="event">Event</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {editLocationForm.locationType === "event" && (
                        <div className="space-y-1">
                          <Label>Event URL</Label>
                          <Input
                            type="url"
                            value={editLocationForm.eventUrl}
                            onChange={(event) =>
                              setEditLocationForm((prev) => ({
                                ...prev,
                                eventUrl: event.target.value,
                              }))
                            }
                            placeholder="https://example.com/event"
                            required
                          />
                          <p className="text-xs text-gray-500">
                            This URL will be shown as a button in the map marker
                          </p>
                        </div>
                      )}

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <Label>Latitude</Label>
                          <Input
                            value={editLocationForm.latitude}
                            onChange={(event) =>
                              setEditLocationForm((prev) => ({
                                ...prev,
                                latitude: event.target.value,
                              }))
                            }
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Longitude</Label>
                          <Input
                            value={editLocationForm.longitude}
                            onChange={(event) =>
                              setEditLocationForm((prev) => ({
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
                          <Label>Creator wallet</Label>
                          <Input
                            value={editLocationForm.walletAddress}
                            onChange={(event) =>
                              setEditLocationForm((prev) => ({
                                ...prev,
                                walletAddress: event.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Creator username</Label>
                          <Input
                            value={editLocationForm.username}
                            onChange={(event) =>
                              setEditLocationForm((prev) => ({
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
                          onSelect={handleEditSearchAutofill}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label>Location image</Label>
                        {editLocationForm.currentImageUrl && (
                          <img
                            src={editLocationForm.currentImageUrl}
                            alt={editLocationForm.displayName}
                            className="h-32 w-full rounded-2xl object-cover"
                          />
                        )}
                        <Input
                          key={editFileInputKey}
                          type="file"
                          accept="image/*"
                          onChange={(event) =>
                            setEditLocationForm((prev) => ({
                              ...prev,
                              locationImageFile:
                                event.target.files?.[0] ?? null,
                            }))
                          }
                        />
                        <p className="text-xs text-gray-500">
                          Uploading a new image replaces the current one.
                        </p>
                      </div>

                      <Button
                        type="submit"
                        disabled={editLocationMutation.isPending}
                        className={`w-full ${blackButtonClasses}`}
                      >
                        {editLocationMutation.isPending && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        Save location
                      </Button>
                    </form>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Start by selecting a location card above.
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

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
              <Label htmlFor="new-display-name">Display name</Label>
              <Input
                id="new-display-name"
                value={newLocationForm.displayName}
                onChange={(event) =>
                  setNewLocationForm((prev) => ({
                    ...prev,
                    displayName: event.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="new-name">Address</Label>
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
              <Label htmlFor="new-location-type">Type</Label>
              <Select
                value={newLocationForm.locationType}
                onValueChange={(value) =>
                  setNewLocationForm((prev) => ({
                    ...prev,
                    locationType: value as "location" | "event",
                  }))
                }
              >
                <SelectTrigger id="new-location-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="location">Location</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newLocationForm.locationType === "event" && (
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
                  required
                />
                <p className="text-xs text-gray-500">
                  This URL will be shown as a button in the map marker
                </p>
              </div>
            )}

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
              className={`w-full ${blackButtonClasses}`}
            >
              {createLocationMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Create location
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
