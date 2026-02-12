/**
 * Types for NEAR Intents 1Click API (bridge to Stellar).
 * @see https://docs.near-intents.org/near-intents/integration/distribution-channels/1click-api
 */

export interface OneClickToken {
  assetId: string;
  decimals: number;
  blockchain: string;
  symbol: string;
  price?: string;
  priceUpdatedAt?: string;
  contractAddress?: string;
}

export interface QuoteRequest {
  dry: boolean;
  depositMode?: 'SIMPLE' | 'MEMO';
  swapType: 'EXACT_INPUT' | 'EXACT_OUTPUT' | 'FLEX_INPUT' | 'ANY_INPUT';
  slippageTolerance: number;
  originAsset: string;
  depositType: 'ORIGIN_CHAIN' | 'INTENTS';
  destinationAsset: string;
  amount: string;
  refundTo: string;
  refundType: 'ORIGIN_CHAIN' | 'INTENTS';
  recipient: string;
  recipientType: 'DESTINATION_CHAIN' | 'INTENTS';
  deadline: string;
  referral?: string;
  quoteWaitingTimeMs?: number;
}

export interface QuoteResponse {
  quote?: {
    depositAddress: string;
    depositMemo?: string;
    amountIn: string;
    amountInFormatted: string;
    amountOut: string;
    amountOutFormatted: string;
    minAmountOut?: string;
    deadline: string;
    timeWhenInactive?: string;
    timeEstimate?: number;
  };
}

export interface StatusResponse {
  status?: string;
  quoteResponse?: { quote?: { depositAddress?: string; depositMemo?: string } };
  updatedAt?: string;
  swapDetails?: {
    originChainTxHashes?: { hash: string; explorerUrl?: string }[];
    destinationChainTxHashes?: { hash: string; explorerUrl?: string }[];
    amountOutFormatted?: string;
    refundedAmountFormatted?: string;
    refundReason?: string;
  };
}
