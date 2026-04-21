import { Core } from '@walletconnect/core';
import { WalletKit } from '@reown/walletkit';

type WalletKitClient = Awaited<ReturnType<typeof WalletKit.init>>;

let initPromise: Promise<WalletKitClient> | null = null;

export type InitWalletKitParams = {
  projectId: string;
};

/**
 * Single shared WalletKit instance for the browser session (WalletKit Web + Pay).
 * Matches https://docs.walletconnect.com/payments/wallets/walletkit/web
 */
export function getWalletKitSingleton(
  params: InitWalletKitParams
): Promise<WalletKitClient> {
  if (typeof window === 'undefined') {
    return Promise.reject(
      new Error('WalletKit can only be initialized in the browser')
    );
  }

  if (!params.projectId) {
    return Promise.reject(
      new Error(
        `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is required for WalletKit (received "${params.projectId}")`
      )
    );
  }

  if (!initPromise) {
    initPromise = (async () => {
      const core = new Core({ projectId: params.projectId });

      try {
        return await WalletKit.init({
          core,
          metadata: {
            name: 'IRL — WalletConnect Pay test',
            description: 'Internal WalletConnect Pay / WalletKit test wallet',
            url:
              typeof window !== 'undefined'
                ? window.location.origin
                : 'https://irl.energy',
            icons: [
              `${typeof window !== 'undefined' ? window.location.origin : 'https://irl.energy'}/IRL-SVG/IRL-LOGO-NEW.svg`,
            ],
          },
          payConfig: {
            appId: params.projectId,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
          `WalletKit init failed for projectId="${params.projectId}": ${message}`
        );
      }
    })();
  }

  return initPromise;
}

/** Clears the cached WalletKit instance (e.g. after changing project id in env). */
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
    m.includes('401') ||
    m.includes('invalid api key') ||
    m.includes('invalid_api_key') ||
    m.includes('unauthorized')
  );
}
