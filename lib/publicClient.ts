import { createPublicClient, http } from "viem";
import { base, baseSepolia } from "viem/chains";

export const publicClient = createPublicClient({
  chain: base,
  transport: http(),
}) as any;

export const testPublicClient = createPublicClient({
  chain: baseSepolia,
  transport: http("https://base-sepolia-rpc.publicnode.com"),
}) as any;
