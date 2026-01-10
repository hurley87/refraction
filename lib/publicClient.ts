import { createPublicClient, defineChain, http } from "viem";

const IRl_RPC_URL = "https://smartrpc.testnet.irl.syndicate.io";

export const irlChain = defineChain({
  id: 63821,
  name: "IRL",
  network: "irl",
  nativeCurrency: {
    decimals: 18,
    name: "ETH",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [IRl_RPC_URL],
    },
    public: {
      http: [IRl_RPC_URL],
    },
  },
  blockExplorers: {
    default: {
      name: "IRL Explorer",
      url: "https://explorer.testnet.irl.syndicate.io",
    },
  },
  testnet: true,
});

export const publicClient = createPublicClient({
  chain: irlChain,
  transport: http(IRl_RPC_URL),
});

export const testPublicClient = createPublicClient({
  chain: irlChain,
  transport: http(IRl_RPC_URL),
});
