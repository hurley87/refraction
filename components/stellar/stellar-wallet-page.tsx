"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WalletProvider } from "@/lib/stellar/providers/wallet-provider";
import { NotificationProvider } from "@/lib/stellar/providers/notification-provider";
import ConnectAccount from "./connect-account";
import TestSendContract from "./test-send-contract";

import { Toaster } from "sonner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

export function StellarWalletPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <WalletProvider>
          <div className="min-h-screen bg-[#131313] p-8">
            <div className="max-w-4xl mx-auto space-y-8">
              <h1 className="text-3xl font-bold text-white">Stellar</h1>
              
              <div className="bg-[#1a1a1a] rounded-lg p-6 border border-[#313131]">
                <ConnectAccount />
              </div>

              <div className="bg-[#1a1a1a] rounded-lg p-6 border border-[#313131]">
                <TestSendContract />
              </div>
              
            </div>
          </div>
          <Toaster position="top-center" />
        </WalletProvider>
      </NotificationProvider>
    </QueryClientProvider>
  );
}