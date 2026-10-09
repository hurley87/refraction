'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isHub = pathname === '/admin';

  if (isHub) return children;

  return (
    <>
      <div className="border-b border-gray-200 bg-white px-4 py-2 dark:border-neutral-800 dark:bg-neutral-950">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin">
            <ArrowLeft />
            Admin home
          </Link>
        </Button>
      </div>
      {children}
    </>
  );
}
