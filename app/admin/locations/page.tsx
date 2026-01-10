"use client";

import { useState, useEffect, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { Location } from "@/lib/types";

const LOCATIONS_KEY = ["admin-locations"] as const;

export default function AdminLocationsPage() {
  const { user, login } = usePrivy();
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminLoading, setAdminLoading] = useState(true);
  const [showApproved, setShowApproved] = useState(false);
  const [page, setPage] = useState(1);
  const LIMIT = 50;

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

  // Fetch all locations (including hidden) using admin endpoint
  const { data: allLocations = [], isLoading: locationsLoading } = useQuery({
    queryKey: [...LOCATIONS_KEY, "all"],
    queryFn: async () => {
      const res = await fetch(`/api/locations?includeHidden=true`, {
        headers: { "x-user-email": user?.email?.address || "" },
      });
      if (!res.ok) throw new Error("Failed to fetch locations");
      const responseData = await res.json();
      // Unwrap the apiSuccess wrapper
      const json = responseData.data || responseData;
      return (json.locations || []) as Location[];
    },
    enabled: !!isAdmin && !!user?.email?.address,
  });

  // Filter client-side based on showApproved checkbox
  const filteredLocations = allLocations.filter((loc: Location) =>
    showApproved ? true : !loc.is_visible
  );

  // Sort by created_at descending
  const sortedLocations = [...filteredLocations].sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
  });

  // Paginate client-side
  const paginatedLocations = sortedLocations.slice(
    (page - 1) * LIMIT,
    page * LIMIT
  );

  const totalPages = Math.ceil(sortedLocations.length / LIMIT);

  // Toggle visibility mutation
  const toggleMutation = useMutation({
    mutationFn: async ({
      id,
      isVisible,
    }: {
      id: number;
      isVisible: boolean;
    }) => {
      const res = await fetch(`/api/admin/locations/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": user?.email?.address || "",
        },
        body: JSON.stringify({ isVisible }),
      });
      if (!res.ok) throw new Error("Failed to update visibility");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...LOCATIONS_KEY, "all"] });
      toast.success("Visibility updated");
    },
    onError: () => {
      toast.error("Failed to update visibility");
    },
  });

  // Loading state
  if (adminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-gray-600">Please log in to access this page.</p>
        <Button onClick={login}>Log In</Button>
      </div>
    );
  }

  // Not admin
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-red-600">
          Unauthorized: You don&apos;t have admin access.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">
          Location Approval
        </h1>

        <div className="mb-6 flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={showApproved}
              onChange={(e) => {
                setShowApproved(e.target.checked);
                setPage(1);
              }}
              className="h-4 w-4 rounded border-gray-300"
            />
            Show approved locations
          </label>

          <div className="text-sm text-gray-500">
            {sortedLocations.length} location
            {sortedLocations.length !== 1 ? "s" : ""}{" "}
            {showApproved ? "total" : "pending approval"}
          </div>
        </div>

        {locationsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : paginatedLocations.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
            <p className="text-gray-500">
              {showApproved
                ? "No locations found."
                : "No locations pending approval."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Creator
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Created
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                      Visible
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedLocations.map((location: Location) => (
                    <tr key={location.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {location.coin_image_url && (
                            <img
                              src={location.coin_image_url}
                              alt=""
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          )}
                          <div>
                            <div className="font-medium text-gray-900">
                              {location.display_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {location.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            location.type === "event"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {location.type || "location"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {location.creator_username || (
                          <span className="text-gray-400">
                            {location.creator_wallet_address?.slice(0, 8)}...
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {location.created_at
                          ? new Date(location.created_at).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Switch
                          checked={location.is_visible ?? false}
                          disabled={toggleMutation.isPending}
                          onCheckedChange={(checked) =>
                            toggleMutation.mutate({
                              id: location.id!,
                              isVisible: checked,
                            })
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Page {page} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
