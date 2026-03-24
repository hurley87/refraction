import { Core } from "@walletconnect/core";
import { WalletKit } from "@reown/walletkit";

type WalletKitClient = Awaited<ReturnType<typeof WalletKit.init>>;

let initPromise: Promise<WalletKitClient> | null = null;

export type InitWalletKitParams = {
  projectId: string;
  /** WalletConnect Pay API key (WCP ID from Dashboard → Pay → copy). */
  payApiKey?: string;
};

/**
 * Single shared WalletKit instance for the browser session (WalletKit Web + Pay).
 * Matches https://docs.walletconnect.com/payments/wallets/walletkit/web
 */
export function getWalletKitSingleton(
  params: InitWalletKitParams
): Promise<WalletKitClient> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("WalletKit can only be initialized in the browser")
    );
  }

  if (!params.projectId) {
    return Promise.reject(
      new Error("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is required for WalletKit")
    );
  }

  if (!initPromise) {
    initPromise = (async () => {
      const core = new Core({ projectId: params.projectId });
      const payApiKey = params.payApiKey?.trim() || params.projectId;

      return WalletKit.init({
        core,
        metadata: {
          name: "IRL — WalletConnect Pay test",
          description: "Internal WalletConnect Pay / WalletKit test wallet",
          url:
            typeof window !== "undefined"
              ? window.location.origin
              : "https://irl.energy",
          icons: [`${typeof window !== "undefined" ? window.location.origin : "https://irl.energy"}/favicon.ico`],
        },
        payConfig: {
          apiKey: payApiKey,
        },
      });
    })();
  }

  return initPromise;
}

export function resetWalletKitSingletonForTests(): void {
  initPromise = null;
}
