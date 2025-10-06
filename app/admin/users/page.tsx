"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePrivy } from "@privy-io/react-auth";
import {
  ArrowUpDown,
  Search,
  Download,
  Upload,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Force dynamic rendering to avoid build-time pre-rendering issues
export const dynamic = "force-dynamic";

interface UserStats {
  id: number;
  wallet_address: string;
  email: string;
  username: string;
  total_points: number;
  created_at: string;
}

interface UploadResult {
  email: string;
  points: number;
  reason: string;
  status: "success" | "failed" | "user_not_found";
  error?: string;
  wallet_address?: string;
}

interface UploadSummary {
  total: number;
  successful: number;
  failed: number;
  user_not_found: number;
  total_points_awarded: number;
}

interface UploadHistory {
  id: string;
  email: string;
  points_awarded: number;
  reason: string;
  status: string;
  created_at: string;
  uploaded_by_email: string;
}

interface PendingPoint {
  id: string;
  email: string;
  points: number;
  reason: string;
  uploaded_by_email: string;
  awarded: boolean;
  created_at: string;
}

interface PendingPointsSummary {
  email: string;
  pending_count: number;
  total_pending_points: number;
  oldest_pending: string;
}

type SortField = "email" | "wallet_address" | "total_points" | "created_at";
type SortDirection = "asc" | "desc";

export default function AdminUsersPage() {
  const { user, login } = usePrivy();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminLoading, setAdminLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("total_points");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadResults, setUploadResults] = useState<UploadResult[] | null>(
    null,
  );
  const [uploadSummary, setUploadSummary] = useState<UploadSummary | null>(
    null,
  );
  const [showUploadHistory, setShowUploadHistory] = useState(false);
  const [showPendingPoints, setShowPendingPoints] = useState(false);

  // Check admin status
  const checkAdminStatus = useCallback(async () => {
    if (!user?.email?.address) return false;

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": user.email.address,
        },
        body: JSON.stringify({ email: user.email.address }),
      });
      const data = await response.json();
      return data.isAdmin;
    } catch (error) {
      console.error("Error checking admin status:", error);
      return false;
    }
  }, [user?.email?.address]);

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

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users", {
        headers: {
          "x-user-email": user?.email?.address || "",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      return data.users as UserStats[];
    },
    enabled: !!isAdmin,
  });

  // Fetch upload history
  const { data: uploadHistory = [] } = useQuery({
    queryKey: ["upload-history"],
    queryFn: async () => {
      const response = await fetch("/api/admin/points-upload", {
        headers: {
          "x-user-email": user?.email?.address || "",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch upload history");
      const data = await response.json();
      return data.uploads as UploadHistory[];
    },
    enabled: !!isAdmin && showUploadHistory,
  });

  // Fetch pending points
  const { data: pendingPointsData } = useQuery({
    queryKey: ["pending-points"],
    queryFn: async () => {
      const response = await fetch("/api/admin/pending-points", {
        headers: {
          "x-user-email": user?.email?.address || "",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch pending points");
      const data = await response.json();
      return {
        pendingPoints: data.pendingPoints as PendingPoint[],
        summary: data.summary as PendingPointsSummary[],
      };
    },
    enabled: !!isAdmin && showPendingPoints,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/points-upload", {
        method: "POST",
        headers: {
          "x-user-email": user?.email?.address || "",
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload CSV");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setUploadResults(data.results);
      setUploadSummary(data.summary);
      setIsUploadDialogOpen(true);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["upload-history"] });
      toast.success(
        `Successfully processed ${data.summary.successful} of ${data.summary.total} records`,
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to upload CSV");
    },
  });

  // Filter and sort users
  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = users.filter(
        (user) =>
          user.email?.toLowerCase().includes(query) ||
          user.wallet_address?.toLowerCase().includes(query) ||
          user.username?.toLowerCase().includes(query),
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) aValue = "";
      if (bValue === null || bValue === undefined) bValue = "";

      // Convert to strings for comparison if needed
      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = (bValue as string).toLowerCase();
      }

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

    return sorted;
  }, [users, searchQuery, sortField, sortDirection]);

  // Handle column header click for sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      "Email",
      "Wallet Address",
      "Username",
      "Points",
      "Created At",
    ];
    const rows = filteredAndSortedUsers.map((user) => [
      user.email || "",
      user.wallet_address || "",
      user.username || "",
      user.total_points,
      new Date(user.created_at).toLocaleString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `users-export-${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy wallet address to clipboard
  const copyToClipboard = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      toast.success("Wallet address copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Failed to copy wallet address");
    }
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    uploadMutation.mutate(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Download CSV template
  const downloadTemplate = () => {
    const template =
      "email,reason,points\nuser@example.com,Bonus for event participation,100\nuser2@example.com,Campaign reward,50";
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "points-upload-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Render sort icon
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 opacity-30" />;
    }
    return (
      <ArrowUpDown
        className={`w-4 h-4 ml-1 ${sortDirection === "desc" ? "rotate-180" : ""}`}
      />
    );
  };

  if (adminLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-white">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen space-y-4 bg-white">
        <p className="text-lg">Please login to access admin features</p>
        <Button onClick={login}>Login</Button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-white">
        <p className="text-lg">Access denied. Admin permissions required.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">User Management</h1>
          <div className="flex gap-2">
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="default"
              className="flex items-center gap-2"
              disabled={uploadMutation.isPending}
            >
              <Upload className="w-4 h-4" />
              {uploadMutation.isPending ? "Uploading..." : "Upload Points CSV"}
            </Button>
            <Button
              onClick={downloadTemplate}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Template
            </Button>
            <Button
              onClick={exportToCSV}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-600 font-medium">Total Users</div>
            <div className="text-2xl font-bold text-blue-900">
              {users.length}
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-sm text-green-600 font-medium">
              Total Points Awarded
            </div>
            <div className="text-2xl font-bold text-green-900">
              {users
                .reduce((sum, u) => sum + u.total_points, 0)
                .toLocaleString()}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search by email, wallet address, or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Users Table */}
      {usersLoading ? (
        <div className="flex justify-center py-12">
          <div className="text-lg">Loading users...</div>
        </div>
      ) : filteredAndSortedUsers.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {searchQuery
            ? "No users found matching your search."
            : "No users found."}
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("email")}
                  >
                    <div className="flex items-center">
                      Email
                      <SortIcon field="email" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("wallet_address")}
                  >
                    <div className="flex items-center">
                      Wallet Address
                      <SortIcon field="wallet_address" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Username
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("total_points")}
                  >
                    <div className="flex items-center justify-end">
                      Points
                      <SortIcon field="total_points" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("created_at")}
                  >
                    <div className="flex items-center justify-end">
                      Joined
                      <SortIcon field="created_at" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.email || (
                        <span className="text-gray-400 italic">No email</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                      <button
                        onClick={() => copyToClipboard(user.wallet_address)}
                        className="hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                        title={`${user.wallet_address}\nClick to copy`}
                      >
                        {user.wallet_address
                          ? `${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-4)}`
                          : "-"}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.username || (
                        <span className="text-gray-400 italic">
                          No username
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {user.total_points.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="bg-gray-50 px-6 py-3 border-t">
            <p className="text-sm text-gray-700">
              Showing{" "}
              <span className="font-medium">
                {filteredAndSortedUsers.length}
              </span>{" "}
              of <span className="font-medium">{users.length}</span> users
            </p>
          </div>
        </div>
      )}

      {/* Upload Results Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle>Upload Results</DialogTitle>
          </DialogHeader>

          {uploadSummary && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-50 p-3 rounded-lg border">
                  <div className="text-xs text-gray-600">Total Records</div>
                  <div className="text-2xl font-bold">
                    {uploadSummary.total}
                  </div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <div className="text-xs text-green-600">Successful</div>
                  <div className="text-2xl font-bold text-green-700">
                    {uploadSummary.successful}
                  </div>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                  <div className="text-xs text-orange-600">Not Found</div>
                  <div className="text-2xl font-bold text-orange-700">
                    {uploadSummary.user_not_found}
                  </div>
                </div>
                <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                  <div className="text-xs text-red-600">Failed</div>
                  <div className="text-2xl font-bold text-red-700">
                    {uploadSummary.failed}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="text-sm text-blue-600">
                  Total Points Awarded
                </div>
                <div className="text-3xl font-bold text-blue-900">
                  {uploadSummary.total_points_awarded.toLocaleString()}
                </div>
              </div>

              {/* Detailed Results */}
              {uploadResults && uploadResults.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Detailed Results</h3>
                  <div className="max-h-96 overflow-y-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left">Status</th>
                          <th className="px-3 py-2 text-left">Email</th>
                          <th className="px-3 py-2 text-left">Reason</th>
                          <th className="px-3 py-2 text-right">Points</th>
                          <th className="px-3 py-2 text-left">Message</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {uploadResults.map((result, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-3 py-2">
                              {result.status === "success" && (
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                              )}
                              {result.status === "user_not_found" && (
                                <AlertCircle className="w-4 h-4 text-orange-600" />
                              )}
                              {result.status === "failed" && (
                                <XCircle className="w-4 h-4 text-red-600" />
                              )}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs">
                              {result.email}
                            </td>
                            <td className="px-3 py-2">{result.reason}</td>
                            <td className="px-3 py-2 text-right font-semibold">
                              {result.points}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-600">
                              {result.error || "Success"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={() => setIsUploadDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pending Points Section */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold">Pending Points</h2>
            <p className="text-sm text-gray-600">
              Points waiting for users who haven&apos;t signed up yet
            </p>
          </div>
          <Button
            onClick={() => setShowPendingPoints(!showPendingPoints)}
            variant="outline"
          >
            {showPendingPoints ? "Hide Pending" : "Show Pending"}
          </Button>
        </div>

        {showPendingPoints && (
          <div className="space-y-4">
            {/* Summary Cards */}
            {pendingPointsData?.summary &&
              pendingPointsData.summary.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <div className="text-sm text-orange-600 font-medium">
                      Pending Users
                    </div>
                    <div className="text-2xl font-bold text-orange-900">
                      {pendingPointsData.summary.length}
                    </div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <div className="text-sm text-purple-600 font-medium">
                      Total Pending Records
                    </div>
                    <div className="text-2xl font-bold text-purple-900">
                      {pendingPointsData.summary.reduce(
                        (sum, s) => sum + s.pending_count,
                        0,
                      )}
                    </div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="text-sm text-blue-600 font-medium">
                      Total Pending Points
                    </div>
                    <div className="text-2xl font-bold text-blue-900">
                      {pendingPointsData.summary
                        .reduce((sum, s) => sum + s.total_pending_points, 0)
                        .toLocaleString()}
                    </div>
                  </div>
                </div>
              )}

            {/* Pending Points Table */}
            <div className="bg-white border rounded-lg overflow-hidden">
              {!pendingPointsData?.pendingPoints ||
              pendingPointsData.pendingPoints.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No pending points found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Reason
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Points
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Uploaded By
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {pendingPointsData.pendingPoints.map((pending) => (
                        <tr key={pending.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {new Date(pending.created_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                            {pending.email}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {pending.reason}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              {pending.points}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {pending.uploaded_by_email}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Upload History Section */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Upload History</h2>
          <Button
            onClick={() => setShowUploadHistory(!showUploadHistory)}
            variant="outline"
          >
            {showUploadHistory ? "Hide History" : "Show History"}
          </Button>
        </div>

        {showUploadHistory && (
          <div className="bg-white border rounded-lg overflow-hidden">
            {uploadHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No upload history found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Reason
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Points
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Uploaded By
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {uploadHistory.map((upload) => (
                      <tr key={upload.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(upload.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                          {upload.email}
                        </td>
                        <td className="px-6 py-4 text-sm">{upload.reason}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold">
                          {upload.points_awarded}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              upload.status === "success"
                                ? "bg-green-100 text-green-800"
                                : upload.status === "user_not_found"
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-red-100 text-red-800"
                            }`}
                          >
                            {upload.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {upload.uploaded_by_email}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
