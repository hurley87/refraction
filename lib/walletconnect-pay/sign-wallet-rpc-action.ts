import type { Action } from "@walletconnect/pay";

/** EIP-1193 shape used by Privy / browser wallets with Pay RPC payloads. */
export type BrowserProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

function caip2ChainIdToNumber(chainId: string): number {
  const match = /^eip155:(\d+)$/.exec(chainId.trim());
  if (!match) {
    throw new Error(`Unsupported chainId (expected eip155:*): ${chainId}`);
  }
  return Number(match[1]);
}

/**
 * Execute a single WalletConnect Pay wallet RPC action via an EIP-1193 provider (e.g. Privy embedded wallet).
 * Order and count of results must match the actions array for confirmPayment.
 */
export async function signWalletRpcAction(
  provider: BrowserProvider,
  action: Action,
  options: { switchChain: (chainId: number) => Promise<void> }
): Promise<string> {
  const { chainId, method, params: paramsJson } = action.walletRpc;
  const numericChain = caip2ChainIdToNumber(chainId);
  await options.switchChain(numericChain);

  const parsedParams: unknown = JSON.parse(paramsJson);

  switch (method) {
    case "eth_sendTransaction": {
      const tx = Array.isArray(parsedParams)
        ? (parsedParams as Record<string, unknown>[])[0]
        : (parsedParams as Record<string, unknown>);
      const hash = await provider.request({
        method: "eth_sendTransaction",
        params: [tx],
      });
      return typeof hash === "string" ? hash : String(hash);
    }
    case "eth_signTypedData_v4": {
      const tuple = parsedParams as unknown[];
      if (!Array.isArray(tuple) || tuple.length < 2) {
        throw new Error("eth_signTypedData_v4: expected [address, typedData]");
      }
      const [address, typedData] = tuple;
      const sig = await provider.request({
        method: "eth_signTypedData_v4",
        params: [address, typedData],
      });
      return typeof sig === "string" ? sig : String(sig);
    }
    case "personal_sign": {
      const tuple = parsedParams as unknown[];
      if (!Array.isArray(tuple) || tuple.length < 2) {
        throw new Error("personal_sign: expected [message, address]");
      }
      const [message, address] = tuple;
      const sig = await provider.request({
        method: "personal_sign",
        params: [message, address],
      });
      return typeof sig === "string" ? sig : String(sig);
    }
    default:
      throw new Error(`Unsupported RPC method: ${method}`);
  }
}
