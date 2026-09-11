'use client';

import { useEffect, useState } from 'react';
import { Loader2, Search, UserRound } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { adminApiAuthHeaders } from '@/lib/admin-api-auth-headers';

export type AdminContributorUser = {
  id: number;
  email: string;
  username: string;
  name: string;
  bio: string;
  profile_picture_url: string;
  instagram_handle: string;
};

type AdminUserSearchComboboxProps = {
  getAccessToken: () => Promise<string | null>;
  onSelect: (user: AdminContributorUser) => void;
};

export function AdminUserSearchCombobox({
  getAccessToken,
  onSelect,
}: AdminUserSearchComboboxProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AdminContributorUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const search = query.trim();
    if (search.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const auth = await adminApiAuthHeaders(getAccessToken);
        const params = new URLSearchParams({
          page: '1',
          limit: '8',
          q: search,
        });
        const response = await fetch(`/api/admin/users?${params}`, {
          headers: auth,
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('User search failed');
        const json = await response.json();
        const data = json.data || json;
        setResults((data.users ?? []) as AdminContributorUser[]);
      } catch {
        if (!controller.signal.aborted) setResults([]);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [getAccessToken, query]);

  return (
    <div className="relative space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search users by name, username, email, or wallet"
          className="pl-9"
          autoComplete="off"
        />
        {isLoading ? (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-neutral-400" />
        ) : null}
      </div>

      {results.length > 0 ? (
        <div className="absolute z-30 max-h-64 w-full overflow-y-auto rounded-md border border-neutral-200 bg-white shadow-lg">
          {results.map((user) => {
            const displayName = user.name || user.username || user.email;
            return (
              <button
                key={user.id}
                type="button"
                className="flex w-full items-center gap-3 border-b border-neutral-100 px-3 py-2 text-left last:border-b-0 hover:bg-neutral-50"
                onClick={() => {
                  onSelect(user);
                  setQuery('');
                  setResults([]);
                }}
              >
                {user.profile_picture_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- remote admin search result
                  <img
                    src={user.profile_picture_url}
                    alt=""
                    className="size-9 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-100">
                    <UserRound className="size-4 text-neutral-500" />
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-neutral-900">
                    {displayName}
                  </span>
                  <span className="block truncate text-xs text-neutral-500">
                    {user.username ? `@${user.username} · ` : ''}
                    {user.email}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
