import { createPublicClient, defineChain, http } from "viem";

export const irlChain = defineChain({
  id: 63821,
  name: "IRL",
  nativeCurrency: {
    decimals: 18,
    name: "ETH",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.testnet.irl.syndicate.io"],
    },
  },
});

export const publicClient = createPublicClient({
  chain: irlChain,
  transport: http("https://rpc.testnet.irl.syndicate.io"),
}) as any;

export const testPublicClient = createPublicClient({
  chain: irlChain,
  transport: http("https://rpc.testnet.irl.syndicate.io"),
}) as any;
