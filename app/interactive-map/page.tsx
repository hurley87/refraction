"use client";

import InteractiveMap from "@/components/interactive-map";
import { usePrivy } from "@privy-io/react-auth";
import MobileFooterNav from "@/components/mobile-footer-nav";
import { Button } from "@/components/ui/button";
import { Sparkles, Map, Coins } from "lucide-react";

export default function InteractiveMapPage() {
  const { ready, authenticated, login } = usePrivy();

  if (!ready) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login screen when not authenticated
  if (!authenticated) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-black">
        {/* Decorative background */}
        <div className="pointer-events-none absolute -top-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-tr from-fuchsia-400/30 to-sky-400/30 blur-3xl dark:from-fuchsia-500/20 dark:to-sky-500/20" />
        <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-tr from-blue-400/30 to-violet-400/30 blur-3xl dark:from-blue-500/20 dark:to-violet-500/20" />

        <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
          <div className="w-full max-w-md">
            <div className="rounded-3xl border border-zinc-200/60 bg-white/70 p-8 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-200/60 bg-white/70 px-3 py-1 text-xs font-medium text-zinc-700 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-zinc-300">
                <Sparkles className="h-3.5 w-3.5 text-fuchsia-500" />
                Location-based coins on Base
              </div>
              <h1 className="mb-2 bg-gradient-to-r from-fuchsia-500 to-sky-500 bg-clip-text text-3xl font-bold text-transparent">
                Welcome to Refraction
              </h1>
              <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
                Create and trade coins at real-world locations. Sign in to get
                started.
              </p>

              <div className="mb-6 grid grid-cols-3 gap-3 text-xs">
                <div className="rounded-xl border border-zinc-200/60 bg-white/70 p-3 text-center dark:border-white/10 dark:bg-white/10">
                  <Map className="mx-auto mb-1 h-4 w-4 text-sky-500" />
                  Discover
                </div>
                <div className="rounded-xl border border-zinc-200/60 bg-white/70 p-3 text-center dark:border-white/10 dark:bg-white/10">
                  <Coins className="mx-auto mb-1 h-4 w-4 text-amber-500" />
                  Create
                </div>
                <div className="rounded-xl border border-zinc-200/60 bg-white/70 p-3 text-center dark:border-white/10 dark:bg-white/10">
                  <Sparkles className="mx-auto mb-1 h-4 w-4 text-fuchsia-500" />
                  Earn
                </div>
              </div>

              <Button
                onClick={login}
                size="lg"
                className="group relative inline-flex w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-6 py-3 text-white shadow-lg transition-all hover:shadow-blue-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
              >
                <span className="absolute inset-0 -z-10 rounded-2xl bg-white/20 opacity-0 blur transition-opacity duration-300 group-hover:opacity-100" />
                Continue
              </Button>

              <p className="mt-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
                By continuing, you agree to our Terms and Privacy Policy.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 font-grotesk">
      <InteractiveMap />
      <MobileFooterNav showOnDesktop />
    </div>
  );
}
