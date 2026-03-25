import { Core } from "@walletconnect/core";
import { WalletKit } from "@reown/walletkit";

type WalletKitClient = Awaited<ReturnType<typeof WalletKit.init>>;

let initPromise: Promise<WalletKitClient> | null = null;

export type InitWalletKitParams = {
  projectId: string;
  /** Pay credential for WalletKit: WCPay ID from Cloud → Pay → Integrate → WCPay ID (not Pay API Keys tab). */
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

  const payApiKey = params.payApiKey?.trim();
  if (!payApiKey) {
    return Promise.reject(
      new Error(
        "WalletConnect Pay needs NEXT_PUBLIC_WALLETCONNECT_PAY_API_KEY (WCPay ID from Pay → Integrate, or API Keys secret if 401). Not your Cloud project id."
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
          apiKey: payApiKey,
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
