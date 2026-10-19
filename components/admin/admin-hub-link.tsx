'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Nested admin pages link back to the hub. The hub itself does not. */
export function AdminHubLink() {
  const pathname = usePathname();
  if (!pathname || pathname === '/admin') return null;

  return (
    <div className="border-b border-gray-200 bg-white px-6 py-3 dark:border-neutral-800 dark:bg-neutral-950">
      <Button variant="outline" size="sm" asChild>
        <Link href="/admin">
          <ArrowLeft />
          Admin hub
        </Link>
      </Button>
    </div>
  );
}
