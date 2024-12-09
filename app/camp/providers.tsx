"use client";
import { CampProvider } from "@campnetwork/sdk/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <CampProvider clientId={process.env.NEXT_PUBLIC_CAMP_CLIENT_ID}>
        {children}
      </CampProvider>
    </QueryClientProvider>
  );
}
