'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useStellarWallet } from '@/hooks/useStellarWallet';
import { usePrivy } from '@privy-io/react-auth';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { OneClickToken, QuoteResponse } from '@/lib/near-intents/types';

const ONECLICK_QUOTE_WAIT_MS = 3000;
const SLIPPAGE_BPS = 100; // 1%

/** Chain slug used by Llama.fi chain icons CDN */
const CHAIN_ICON_SLUG: Record<string, string> = {
  eth: 'ethereum',
  ethereum: 'ethereum',
  bera: 'berachain',
  base: 'base',
  gnosis: 'gnosis',
  arb: 'arbitrum',
  arbitrum: 'arbitrum',
  bsc: 'bsc',
  avax: 'avalanche',
  avalanche: 'avalanche',
  op: 'optimism',
  optimism: 'optimism',
  pol: 'polygon',
  polygon: 'polygon',
};

const CHAIN_ICON_SIZE = 20;

/** Human-readable chain name for display */
const CHAIN_DISPLAY_NAME: Record<string, string> = {
  eth: 'Ethereum',
  ethereum: 'Ethereum',
  bera: 'Berachain',
  base: 'Base',
  gnosis: 'Gnosis',
  arb: 'Arbitrum',
  arbitrum: 'Arbitrum',
  bsc: 'BSC',
  avax: 'Avalanche',
  avalanche: 'Avalanche',
  op: 'Optimism',
  optimism: 'Optimism',
  pol: 'Polygon',
  polygon: 'Polygon',
};

function getChainDisplayName(blockchain: string): string {
  const key = blockchain.toLowerCase();
  return CHAIN_DISPLAY_NAME[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

function getChainIconUrl(blockchain: string): string {
  const slug =
    CHAIN_ICON_SLUG[blockchain.toLowerCase()] ?? blockchain.toLowerCase();
  return `https://icons.llamao.fi/icons/chains/rsz_${slug}.jpg`;
}

function ChainIcon({
  blockchain,
  className,
}: {
  blockchain: string;
  className?: string;
}) {
  const src = getChainIconUrl(blockchain);
  return (
    <span
      className={className}
      style={{
        width: CHAIN_ICON_SIZE,
        height: CHAIN_ICON_SIZE,
        flexShrink: 0,
        borderRadius: '50%',
        overflow: 'hidden',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <img
        src={src}
        alt=""
        width={CHAIN_ICON_SIZE}
        height={CHAIN_ICON_SIZE}
        className="object-cover w-full h-full"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    </span>
  );
}

interface NearIntentsBridgeWidgetProps {
  /** When provided (e.g. from Freighter on Stellar page), used as recipient instead of Privy Stellar address */
  stellarAddressOverride?: string | null;
  /** When provided (e.g. from useWallet().network on Stellar page), used for display and to align with wallet network. Falls back to NEXT_PUBLIC_STELLAR_NETWORK. */
  stellarNetworkOverride?: string | null;
}

export function NearIntentsBridgeWidget({
  stellarAddressOverride,
  stellarNetworkOverride,
}: NearIntentsBridgeWidgetProps = {}) {
  const { address: stellarAddressFromPrivy, isLoading } = useStellarWallet();
  const { user } = usePrivy();
  const stellarAddress = stellarAddressOverride ?? stellarAddressFromPrivy;
  const stellarNetwork =
    stellarNetworkOverride ??
    (typeof process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'string'
      ? process.env.NEXT_PUBLIC_STELLAR_NETWORK
      : 'TESTNET');
  const isTestnet =
    stellarNetwork.toUpperCase() === 'TESTNET' ||
    stellarNetwork.toUpperCase() === 'FUTURENET';

  const [tokens, setTokens] = useState<OneClickToken[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(true);
  const [sourceToken, setSourceToken] = useState<OneClickToken | null>(null);
  const [destinationToken, setDestinationToken] =
    useState<OneClickToken | null>(null);
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<QuoteResponse['quote'] | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [refundAddress, setRefundAddress] = useState('');

  const evmAddress = user?.wallet?.address;

  // Pre-fill refund address when user has connected EVM wallet (only when field is empty)
  useEffect(() => {
    if (evmAddress && !refundAddress.trim()) setRefundAddress(evmAddress);
  }, [evmAddress]);

  const loadTokens = useCallback(async () => {
    setLoadingTokens(true);
    try {
      const res = await fetch('/api/near-intents/tokens');
      if (!res.ok) throw new Error('Failed to load tokens');
      const list = (await res.json()) as OneClickToken[];
      setTokens(list);
      const stellarTokens = list.filter(
        (t) => t.blockchain.toLowerCase() === 'stellar'
      );
      if (stellarTokens.length > 0 && !destinationToken) {
        const xlm = stellarTokens.find((t) => t.symbol.toUpperCase() === 'XLM');
        setDestinationToken(xlm ?? stellarTokens[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTokens(false);
    }
  }, [destinationToken]);

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  // Refund address must be on the origin chain. We support EVM source chains and use manual or connected refund address.
  const EVM_CHAINS = new Set([
    'eth',
    'bera',
    'base',
    'gnosis',
    'arb',
    'bsc',
    'avax',
    'op',
    'pol',
    'arbitrum',
    'avalanche',
    'optimism',
    'polygon',
    'ethereum',
  ]);
  const sourceTokens = tokens.filter((t) => {
    const chain = t.blockchain.toLowerCase();
    if (chain === 'stellar') return false;
    return EVM_CHAINS.has(chain);
  });
  const sortedSourceTokens = useMemo(
    () =>
      [...sourceTokens].sort((a, b) => {
        const byChain = a.blockchain.localeCompare(b.blockchain);
        if (byChain !== 0) return byChain;
        return a.symbol.localeCompare(b.symbol);
      }),
    [sourceTokens]
  );
  const stellarTokens = tokens.filter(
    (t) => t.blockchain.toLowerCase() === 'stellar'
  );
  const effectiveRefundAddress = (refundAddress?.trim() || evmAddress) ?? '';

  const requestQuote = useCallback(async () => {
    if (
      !stellarAddress ||
      !sourceToken ||
      !destinationToken ||
      !amount ||
      Number(amount) <= 0
    ) {
      setQuoteError('Select source token and enter amount.');
      return;
    }
    const decimals = sourceToken.decimals ?? 18;
    const amountSmallest = BigInt(
      Math.floor(Number(amount) * 10 ** decimals)
    ).toString();
    const deadline = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const refundTo = effectiveRefundAddress.trim();
    if (!refundTo) {
      setQuoteError(
        'Enter a refund address (on the source chain). Refunds for failed swaps are sent there.'
      );
      setQuoteLoading(false);
      return;
    }

    setQuoteLoading(true);
    setQuoteError(null);
    setQuote(null);
    try {
      const res = await fetch('/api/near-intents/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dry: false,
          depositMode: 'SIMPLE',
          swapType: 'EXACT_INPUT',
          slippageTolerance: SLIPPAGE_BPS,
          originAsset: sourceToken.assetId,
          depositType: 'ORIGIN_CHAIN',
          destinationAsset: destinationToken.assetId,
          amount: amountSmallest,
          refundTo,
          refundType: 'ORIGIN_CHAIN',
          recipient: stellarAddress,
          recipientType: 'DESTINATION_CHAIN',
          deadline,
          quoteWaitingTimeMs: ONECLICK_QUOTE_WAIT_MS,
        }),
      });
      let data: (QuoteResponse & { error?: string }) | null = null;
      try {
        data = (await res.json()) as QuoteResponse & { error?: string };
      } catch {
        setQuoteError('Invalid response from server. Try again.');
        return;
      }
      if (!res.ok) {
        setQuoteError(data?.error ?? 'Quote failed');
        return;
      }
      if (data?.quote?.depositAddress) {
        setQuote(data.quote);
      } else {
        setQuoteError('No deposit address in quote');
      }
    } catch (e) {
      setQuoteError(e instanceof Error ? e.message : 'Quote request failed');
    } finally {
      setQuoteLoading(false);
    }
  }, [
    stellarAddress,
    sourceToken,
    destinationToken,
    amount,
    effectiveRefundAddress,
  ]);

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-[26px] p-4">
        <p className="body-medium text-[#7D7D7D] font-grotesk">
          Loading Stellar wallet…
        </p>
      </div>
    );
  }

  if (!stellarAddress) {
    return (
      <div className="bg-white rounded-[26px] p-4">
        <h2 className="title2 text-[#313131] font-grotesk">
          Bridge to Stellar
        </h2>
        <p className="mt-2 body-medium text-[#7D7D7D] font-grotesk">
          Connect or create a Stellar wallet above to bridge assets from other
          chains (Ethereum, Solana, Bitcoin, etc.) to your Stellar address.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[26px] p-4">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="title2 text-[#313131] font-grotesk">
            Bridge to Stellar
          </h2>
          <p className="mt-2 body-medium text-[#7D7D7D] font-grotesk">
            Swap from 100+ chains into XLM or USDC on Stellar. Powered by NEAR
            Intents.
          </p>
          <p className="mt-2 body-medium text-[#7D7D7D] font-grotesk">
            App/wallet network:{' '}
            <span className="font-medium text-[#313131]">
              Stellar {isTestnet ? 'Testnet' : 'Mainnet'}
            </span>
            . The bridge uses this network for your recipient address. NEAR
            Intents 1Click API may operate on mainnet only—if you are on
            testnet, confirm with the provider where bridged funds will arrive.
          </p>
        </div>

        {loadingTokens ? (
          <p className="body-medium text-[#7D7D7D] font-grotesk">
            Loading tokens…
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block body-medium text-[#313131] font-grotesk">
                From (source chain)
              </label>
              <Select
                value={sourceToken?.assetId ?? ''}
                onValueChange={(value) => {
                  const t = sourceTokens.find((x) => x.assetId === value);
                  setSourceToken(t ?? null);
                  setQuote(null);
                }}
              >
                <SelectTrigger className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-[#313131] font-grotesk focus:border-[#313131] focus:ring-1 focus:ring-[#313131] [&>span]:flex [&>span]:items-center [&>span]:gap-2">
                  {sourceToken ? (
                    <span className="flex items-center gap-3">
                      <ChainIcon blockchain={sourceToken.blockchain} />
                      <span>{sourceToken.symbol}</span>
                      <span className="text-gray-500">
                        {getChainDisplayName(sourceToken.blockchain)}
                      </span>
                    </span>
                  ) : (
                    <SelectValue placeholder="Select token" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {sortedSourceTokens.slice(0, 50).map((t) => (
                    <SelectItem key={t.assetId} value={t.assetId}>
                      <span className="flex items-center gap-3">
                        <ChainIcon blockchain={t.blockchain} />
                        <span>{t.symbol}</span>
                        <span className="text-gray-500">
                          {getChainDisplayName(t.blockchain)}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1 block body-medium text-[#313131] font-grotesk">
                To (Stellar)
              </label>
              <select
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-[#313131] font-grotesk focus:border-[#313131] focus:outline-none focus:ring-1 focus:ring-[#313131]"
                value={destinationToken?.assetId ?? ''}
                onChange={(e) => {
                  const t = stellarTokens.find(
                    (x) => x.assetId === e.target.value
                  );
                  setDestinationToken(t ?? null);
                  setQuote(null);
                }}
              >
                {stellarTokens.map((t) => (
                  <option key={t.assetId} value={t.assetId}>
                    {t.symbol}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block body-medium text-[#313131] font-grotesk">
                Amount
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-[#313131] font-grotesk focus:border-[#313131] focus:outline-none focus:ring-1 focus:ring-[#313131]"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setQuote(null);
                }}
              />
            </div>

            <div>
              <label className="mb-1 block body-medium text-[#313131] font-grotesk">
                Refund address (on source chain)
              </label>
              <input
                type="text"
                placeholder="0x... (EVM address for failed swaps)"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-mono text-[#313131] placeholder:text-gray-400 font-grotesk focus:border-[#313131] focus:outline-none focus:ring-1 focus:ring-[#313131]"
                value={refundAddress}
                onChange={(e) => {
                  setRefundAddress(e.target.value);
                  setQuote(null);
                }}
              />
              <p className="mt-1 body-medium text-[#7D7D7D] font-grotesk text-sm">
                If the swap fails, funds are returned here. Must be a valid
                address on the source chain (e.g. Ethereum 0x...).
              </p>
            </div>

            {quoteError && (
              <p className="body-medium text-red-600 font-grotesk text-sm">
                {quoteError}
              </p>
            )}

            <button
              type="button"
              disabled={
                quoteLoading ||
                !sourceToken ||
                !amount ||
                !effectiveRefundAddress.trim()
              }
              className="w-full rounded-xl bg-[#313131] px-4 py-2.5 text-sm font-medium text-white font-grotesk disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#313131] focus:ring-offset-2"
              onClick={requestQuote}
            >
              {quoteLoading ? 'Getting quote…' : 'Get quote & deposit address'}
            </button>

            {quote && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="title2 text-[#313131] font-grotesk">
                  Send to complete swap
                </p>
                <p className="mt-2 body-medium text-[#7D7D7D] font-grotesk">
                  Send exactly{' '}
                  <strong className="text-[#313131]">
                    {quote.amountInFormatted} {sourceToken?.symbol}
                  </strong>{' '}
                  to the address below before{' '}
                  {quote.deadline
                    ? new Date(quote.deadline).toLocaleString()
                    : 'deadline'}
                  . You will receive ~{quote.amountOutFormatted}{' '}
                  {destinationToken?.symbol} on Stellar.
                </p>
                <div className="mt-3 space-y-3">
                  <div>
                    <span className="body-medium text-[#7D7D7D] font-grotesk text-sm">
                      Deposit address:
                    </span>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="break-all rounded-lg bg-white border border-gray-200 px-3 py-2 text-xs font-mono text-[#313131]">
                        {quote.depositAddress}
                      </code>
                      <button
                        type="button"
                        className="shrink-0 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-[#313131] font-grotesk hover:bg-gray-50"
                        onClick={() => copyToClipboard(quote.depositAddress)}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  {quote.depositMemo && (
                    <div>
                      <span className="body-medium text-[#7D7D7D] font-grotesk text-sm">
                        Memo (required for Stellar):
                      </span>
                      <div className="mt-1 flex items-center gap-2">
                        <code className="rounded-lg bg-white border border-gray-200 px-3 py-2 text-xs font-mono text-[#313131]">
                          {quote.depositMemo}
                        </code>
                        <button
                          type="button"
                          className="shrink-0 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-[#313131] font-grotesk hover:bg-gray-50"
                          onClick={() =>
                            copyToClipboard(quote.depositMemo ?? '')
                          }
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
