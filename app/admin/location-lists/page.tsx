"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  type FormEvent,
} from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2, Map, PlusCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  LocationListWithCount,
  LocationListLocation,
  LocationOption,
} from "@/lib/supabase";

const LISTS_KEY = ["admin-location-lists"] as const;
const LIST_LOCATIONS_KEY = (listId: string) => ["admin-location-list", listId];
const LOCATION_OPTIONS_KEY = ["admin-location-options"] as const;

const hexColorRegex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

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

  const adminEmail = user?.email?.address || "";

  const {
    data: lists = [],
    isLoading: listsLoading,
  } = useQuery<LocationListWithCount[]>({
    queryKey: LISTS_KEY,
    queryFn: async () => {
      const response = await fetch("/api/admin/location-lists", {
        headers: { "x-user-email": adminEmail },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch location lists");
      }
      const data = await response.json();
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
        const data = await response.json();
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

  const {
    data: listLocations = [],
    isLoading: listLocationsLoading,
  } = useQuery<LocationListLocation[]>({
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
      const data = await response.json();
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
    const parsed = assignmentSchema.safeParse({ locationId: selectedLocationId });
    if (!parsed.success) {
      toast.error("Select a location first");
      return;
    }

    addLocationMutation.mutate({
      listId: selectedListId,
      locationId: parsed.data.locationId,
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
        <Button onClick={login}>Login with Privy</Button>
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

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-black/5 p-3">
                  <PlusCircle className="h-6 w-6 text-black" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Create a new list</h2>
                  <p className="text-sm text-gray-500">
                    Titles are public facing. Accent colors help visually group
                    cards.
                  </p>
                </div>
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
                  className="w-full"
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading lists
                </div>
              ) : lists.length === 0 ? (
                <p className="mt-6 text-sm text-gray-500">
                  No lists yet. Create your first curated collection above.
                </p>
              ) : (
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {lists.map((list) => (
                    <button
                      key={list.id}
                      onClick={() => setSelectedListId(list.id)}
                      className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${
                        selectedListId === list.id
                          ? "border-black bg-black text-white"
                          : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold">{list.title}</h3>
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
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{
                            backgroundColor: list.accent_color || "#111827",
                          }}
                        />
                      </div>
                      <div className="mt-4 flex items-center gap-2 text-sm">
                        <Map className="h-4 w-4" />
                        {list.location_count} locations
                      </div>
                    </button>
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
                  <h2 className="text-2xl font-semibold">{selectedList.title}</h2>
                  <p className="text-sm text-gray-500">
                    {selectedList.location_count} locations · slug {selectedList.slug}
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
                    className="w-full"
                  >
                    {updateListMutation.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Save changes
                  </Button>
                </form>

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
                    value={selectedLocationId ? String(selectedLocationId) : undefined}
                    onValueChange={(value) => setSelectedLocationId(Number(value))}
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
                    className="w-full"
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
                          className="flex items-start justify-between rounded-2xl border border-gray-200 p-3"
                        >
                          <div>
                            <p className="font-semibold">
                              {item.location.display_name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {item.location.name}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
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
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
