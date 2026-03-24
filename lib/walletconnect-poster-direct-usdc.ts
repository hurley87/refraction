import { encodeFunctionData, erc20Abi, parseUnits } from "viem";
import { base } from "viem/chains";

/** Official USDC on Base mainnet (same chain as Privy `supportedChains` in providers). */
export const POSTER_CHECKOUT_USDC_ADDRESS_BASE =
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;

export const POSTER_CHECKOUT_CHAIN = base;
export const POSTER_CHECKOUT_CHAIN_ID = base.id;

const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export function isEvmAddress(value: string): boolean {
  return EVM_ADDRESS_RE.test(value.trim());
}

/** 1 USDC (6 decimals). */
export function encodePosterUsdcTransferData(
  recipient: `0x${string}`
): `0x${string}` {
  return encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [recipient, parseUnits("1", 6)],
  });
}
