import { Core } from "@walletconnect/core";
import { WalletKit } from "@reown/walletkit";

type WalletKitClient = Awaited<ReturnType<typeof WalletKit.init>>;

let initPromise: Promise<WalletKitClient> | null = null;

export type InitWalletKitParams = {
  projectId: string;
  /** WCPay ID from Cloud → Pay → Integrate. */
  payAppId?: string;
  /** Optional linked Pay API key from Cloud → Pay → API Keys. */
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

  const payAppId = params.payAppId?.trim();
  const payApiKey = params.payApiKey?.trim();
  if (!payAppId && !payApiKey) {
    return Promise.reject(
      new Error(
        "WalletConnect Pay needs a credential. Provide a WCPay ID via `payAppId` (recommended) or a linked API key via `payApiKey`."
      )
    );
  }

  if (!initPromise) {
    initPromise = (async () => {
      const core = new Core({ projectId: params.projectId });

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
          ...(payAppId ? { appId: payAppId } : {}),
          ...(payApiKey && !payAppId ? { apiKey: payApiKey } : {}),
        },
      });
    })();
  }

  return initPromise;
}

/** Clears the cached WalletKit instance (e.g. after changing Pay API key in env). */
export function resetWalletKitSingleton(): void {
  initPromise = null;
}

export function resetWalletKitSingletonForTests(): void {
  resetWalletKitSingleton();
}

/** True when the error likely means Pay rejected the Api-Key (wrong/missing credential). */
export function isWalletConnectPayAuthErrorMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("401") ||
    m.includes("invalid api key") ||
    m.includes("invalid_api_key") ||
    m.includes("unauthorized")
  );
}
