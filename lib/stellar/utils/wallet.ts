import storage from "./storage";
import {
  ISupportedWallet,
  StellarWalletsKit,
  WalletNetwork,
  sep43Modules,
} from "@creit.tech/stellar-wallets-kit";
import { Horizon } from "@stellar/stellar-sdk";
import { networkPassphrase, stellarNetwork, getStellarNetworkConfig, getHorizonUrlForNetwork } from "./network";

const kit: StellarWalletsKit = new StellarWalletsKit({
  network: networkPassphrase as WalletNetwork,
  modules: sep43Modules(),
});

export const connectWallet = async () => {
  await kit.openModal({
    modalTitle: "Connect to your wallet",
    onWalletSelected: (option: ISupportedWallet) => {
      const selectedId = option.id;
      kit.setWallet(selectedId);

      // Now open selected wallet's login flow by calling `getAddress` --
      // Yes, it's strange that a getter has a side effect of opening a modal
      void kit.getAddress().then((address) => {
        // Once `getAddress` returns successfully, we know they actually
        // connected the selected wallet, and we set our localStorage
        if (address.address) {
          storage.setItem("walletId", selectedId);
          storage.setItem("walletAddress", address.address);
        } else {
          storage.setItem("walletId", "");
          storage.setItem("walletAddress", "");
        }
      });
      if (selectedId == "freighter" || selectedId == "hot-wallet") {
        void kit.getNetwork().then((network) => {
          if (network.network && network.networkPassphrase) {
            storage.setItem("walletNetwork", network.network);
            storage.setItem("networkPassphrase", network.networkPassphrase);
          } else {
            storage.setItem("walletNetwork", "");
            storage.setItem("networkPassphrase", "");
          }
        });
      }
    },
  });
};

export const disconnectWallet = async () => {
  await kit.disconnect();
  storage.removeItem("walletId");
};

// Cache Horizon servers by network to avoid recreating them
const horizonServers: Map<string, Horizon.Server> = new Map();

const getHorizonServer = (networkName?: string) => {
  const url = getHorizonUrlForNetwork(networkName);
  const normalizedNetwork = networkName?.toUpperCase() || "TESTNET";
  const isLocal = normalizedNetwork === "LOCAL" || normalizedNetwork === "STANDALONE";
  
  if (!horizonServers.has(url)) {
    const server = new Horizon.Server(url, {
      allowHttp: isLocal,
    });
    horizonServers.set(url, server);
    console.log("[Stellar] Horizon server initialized:", url, "Network:", normalizedNetwork);
  }
  
  return horizonServers.get(url)!;
};

const formatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 7,
});

export type MappedBalances = Record<string, Horizon.HorizonApi.BalanceLine & { formattedBalance?: string }>;

export type FetchBalancesResult = {
  balances: MappedBalances;
  accountExists: boolean;
};

export const fetchBalances = async (address: string, networkName?: string): Promise<FetchBalancesResult> => {
  try {
    const server = getHorizonServer(networkName);
    console.log("[Stellar] Fetching balances for address:", address, "on network:", networkName || "default");
    const account = await server.accounts().accountId(address).call();
    console.log("[Stellar] Account data received:", {
      balances: account.balances.length,
      accountId: account.account_id,
    });
    
    const mapped = account.balances.reduce((acc, b) => {
      const balanceNum = Number(b.balance);
      const formattedBalance = formatter.format(balanceNum);
      const key =
        b.asset_type === "native"
          ? "xlm"
          : b.asset_type === "liquidity_pool_shares"
            ? b.liquidity_pool_id
            : `${b.asset_code}:${b.asset_issuer}`;
      
      // Create a new object with the formatted balance, preserving original
      acc[key] = {
        ...b,
        formattedBalance,
      };
      
      console.log("[Stellar] Balance:", key, "=", formattedBalance, "XLM");
      return acc;
    }, {} as MappedBalances);
    
    console.log("[Stellar] Mapped balances:", Object.keys(mapped));
    return { balances: mapped, accountExists: true };
  } catch (err) {
    // `not found` is sort of expected, indicating an unfunded wallet, which
    // the consumer of `balances` can understand via the lack of `xlm` key.
    // If the error does NOT match 'not found', log the error.
    if (err instanceof Error) {
      if (err.message.match(/not found/i)) {
        console.log("[Stellar] Account not found (unfunded) on network:", networkName || "default", "Address:", address);
        // Return empty balances and mark account as not existing
        return { balances: {}, accountExists: false };
      } else {
        console.error("[Stellar] Error fetching balances:", err.message, err);
        // For other errors, we don't know if account exists, so return true to allow retry
        return { balances: {}, accountExists: true };
      }
    } else {
      console.error("[Stellar] Unknown error fetching balances:", err);
      return { balances: {}, accountExists: true };
    }
  }
};

export const wallet = kit;
