import { defineChain, getAddress } from 'viem';

export const TEMPO_MAINNET_CHAIN_ID = 4217;
export const TEMPO_MAINNET_CAIP2 = 'eip155:4217';
export const TEMPO_CADD_DECIMALS = 6;
export const TEMPO_CADD_CONTRACT_ADDRESS = getAddress(
  '0x20c000000000000000000000D65B4808c85DbB81'
);

export function getTempoRpcUrl(): string {
  return (
    process.env.SPONSORED_ACTIVATION_TEMPO_RPC_URL?.trim() ||
    'https://rpc.tempo.xyz'
  );
}

export function getTempoExplorerTxUrlTemplate(): string {
  return (
    process.env.NEXT_PUBLIC_SPONSORED_ACTIVATION_TEMPO_EXPLORER_TX_URL_TEMPLATE?.trim() ||
    'https://explore.tempo.xyz/tx/{txHash}'
  );
}

export function getTempoExplorerOrigin(): string {
  return (
    getTempoExplorerTxUrlTemplate().match(/^(https?:\/\/[^/?#]+)/)?.[1] ??
    'https://explore.tempo.xyz'
  );
}

export function getTempoViemChain() {
  return defineChain({
    id: TEMPO_MAINNET_CHAIN_ID,
    name: 'Tempo Mainnet',
    nativeCurrency: { name: 'USD', symbol: 'USD', decimals: 18 },
    rpcUrls: { default: { http: [getTempoRpcUrl()] } },
    blockExplorers: {
      default: { name: 'Tempo Explorer', url: getTempoExplorerOrigin() },
    },
  });
}

export function getDefaultTempoSponsoredActivationAssetConfig(): {
  contract_address: `0x${string}`;
  symbol: 'CADD';
} {
  return {
    contract_address: TEMPO_CADD_CONTRACT_ADDRESS,
    symbol: 'CADD',
  };
}
