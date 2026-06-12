'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { adminApiAuthHeaders } from '@/lib/admin-api-auth-headers';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  Building2,
  Calendar,
  Flag,
  Gift,
  Loader2,
  MapPin,
  List,
  BookOpen,
  Users,
  CreditCard,
  CircleDollarSign,
  Globe,
} from 'lucide-react';

interface AdminSection {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: string;
}

const SECTIONS: AdminSection[] = [
  {
    title: 'Analytics',
    description: 'Player stats, check-ins, and growth metrics',
    href: '/admin/analytics',
    icon: <BarChart3 className="h-6 w-6" />,
    color: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  },
  {
    title: 'Users',
    description: 'Player accounts, wallets, and points',
    href: '/admin/users',
    icon: <Users className="h-6 w-6" />,
    color: 'bg-violet-50 text-violet-600 border-violet-200',
  },
  {
    title: 'Locations',
    description: 'Manage check-in spots and visibility',
    href: '/admin/locations',
    icon: <MapPin className="h-6 w-6" />,
    color: 'bg-rose-50 text-rose-600 border-rose-200',
  },
  {
    title: 'Location Lists',
    description: 'Curated location collections',
    href: '/admin/location-lists',
    icon: <List className="h-6 w-6" />,
    color: 'bg-orange-50 text-orange-600 border-orange-200',
  },
  {
    title: 'Checkpoints',
    description: 'Branded checkpoint pages and QR codes',
    href: '/admin/checkpoints',
    icon: <Flag className="h-6 w-6" />,
    color: 'bg-teal-50 text-teal-600 border-teal-200',
  },
  {
    title: 'DICE Events',
    description: 'DICE events and manual event listings',
    href: '/admin/events',
    icon: <Calendar className="h-6 w-6" />,
    color: 'bg-blue-50 text-blue-600 border-blue-200',
  },
  {
    title: 'Perks',
    description: 'Tier-based rewards and redemptions',
    href: '/admin/perks',
    icon: <Gift className="h-6 w-6" />,
    color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  },
  {
    title: 'Spend Experiences',
    description: 'USDC payment flows and pilot sessions',
    href: '/admin/spend-experiences',
    icon: <CreditCard className="h-6 w-6" />,
    color: 'bg-amber-50 text-amber-600 border-amber-200',
  },
  {
    title: 'Sponsored Activations',
    description: 'Sponsor-funded activations, settlements, and redemptions',
    href: '/admin/sponsored-activations',
    icon: <CircleDollarSign className="h-6 w-6" />,
    color: 'bg-lime-50 text-lime-700 border-lime-200',
  },
  {
    title: 'Cities',
    description: 'Canonical cities for event and guide filters',
    href: '/admin/cities',
    icon: <Building2 className="h-6 w-6" />,
    color: 'bg-sky-50 text-sky-600 border-sky-200',
  },
  {
    title: 'City Guides',
    description: 'Guides, editorials, and contributors',
    href: '/admin/guides',
    icon: <BookOpen className="h-6 w-6" />,
    color: 'bg-pink-50 text-pink-600 border-pink-200',
  },
  {
    title: 'City Metrics',
    description: 'Per-city spot tracking and milestones',
    href: '/admin/city-metrics',
    icon: <Globe className="h-6 w-6" />,
    color: 'bg-cyan-50 text-cyan-600 border-cyan-200',
  },
];

export default function AdminHomePage() {
  const { user, login, getAccessToken } = usePrivy();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminLoading, setAdminLoading] = useState(true);

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

  if (adminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-gray-600">Please log in to access admin.</p>
        <Button onClick={login}>Log In</Button>
      </div>
    );
  }

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
      <div className="mx-auto max-w-5xl">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Admin</h1>
          <p className="mt-1 text-gray-500">Choose a section to manage.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-gray-300 hover:shadow-md"
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${section.color}`}
              >
                {section.icon}
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-gray-900 group-hover:text-gray-700">
                  {section.title}
                </h2>
                <p className="mt-0.5 text-sm text-gray-500">
                  {section.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
