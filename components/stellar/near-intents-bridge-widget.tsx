'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useStellarWallet } from '@/hooks/useStellarWallet';
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

const primaryCtaClass =
  'label-large uppercase flex h-[44px] w-full cursor-pointer items-center justify-between bg-black py-2 pr-2 pl-4 text-white transition-colors hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-50';

const fieldClass =
  'h-11 w-full rounded-none border-0 border-b border-[#757575] bg-transparent px-0 text-sm text-[#171717] font-grotesk placeholder:text-[#757575] focus:border-[#171717] focus:outline-none focus:ring-0';

const selectTriggerClass =
  'h-11 w-full rounded-none border-0 border-b border-[#757575] bg-transparent px-0 text-sm text-[#171717] font-grotesk shadow-none focus:ring-0 focus:ring-offset-0 [&>span]:flex [&>span]:items-center [&>span]:gap-2';

/** Chain slug used by Llama.fi chain icons CDN */
const CHAIN_ICON_SLUG: Record<string, string> = {
  btc: 'bitcoin',
  bitcoin: 'bitcoin',
  sol: 'solana',
  solana: 'solana',
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
  btc: 'Bitcoin',
  bitcoin: 'Bitcoin',
  sol: 'Solana',
  solana: 'Solana',
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

/** Refund field copy by chain (manual entry only). */
function getRefundFieldConfig(blockchain: string): {
  label: string;
  placeholder: string;
  help: string;
} {
  const chain = blockchain.toLowerCase();
  const name = getChainDisplayName(blockchain);
  if (chain === 'btc' || chain === 'bitcoin') {
    return {
      label: `Refund address (${name})`,
      placeholder: 'bc1... or 1... or 3...',
      help: `If the swap fails, funds are returned here. Enter a valid Bitcoin address (Legacy, P2SH, Bech32, or Taproot).`,
    };
  }
  if (chain === 'sol' || chain === 'solana') {
    return {
      label: `Refund address (${name})`,
      placeholder: 'Your Solana wallet address (base58)',
      help: `If the swap fails, funds are returned here. Enter a valid Solana address.`,
    };
  }
  return {
    label: `Refund address (${name})`,
    placeholder: '0x...',
    help: `If the swap fails, funds are returned here. Must be a valid address on ${name}.`,
  };
}

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
        className="h-full w-full object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    </span>
  );
}

function CtaArrow() {
  return (
    <Image
      src="/guidance_up-right-2-short-arrow.svg"
      alt=""
      width={24}
      height={24}
      className="h-6 w-6 shrink-0"
      aria-hidden
    />
  );
}

interface NearIntentsBridgeWidgetProps {
  /** When provided (e.g. Privy-first from /stellar), used as recipient before falling back to `useStellarWallet` */
  stellarAddressOverride?: string | null;
  /** When provided (e.g. from useWallet().network on Stellar page), used for display and to align with wallet network. Falls back to NEXT_PUBLIC_STELLAR_NETWORK. */
  stellarNetworkOverride?: string | null;
}

export function NearIntentsBridgeWidget({
  stellarAddressOverride,
  stellarNetworkOverride,
}: NearIntentsBridgeWidgetProps = {}) {
  const { address: stellarAddressFromPrivy, isLoading } = useStellarWallet();
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

  // Clear refund address when source chain/token changes (address format is chain-specific).
  const sourceAssetId = sourceToken?.assetId ?? null;
  useEffect(() => {
    setRefundAddress('');
  }, [sourceAssetId]);

  // Source chains: EVM + Bitcoin + Solana (refund address is manual, chain-aware).
  const SOURCE_CHAINS = new Set([
    'btc',
    'bitcoin',
    'sol',
    'solana',
    'eth',
    'ethereum',
    'bera',
    'base',
    'gnosis',
    'arb',
    'arbitrum',
    'bsc',
    'avax',
    'avalanche',
    'op',
    'optimism',
    'pol',
    'polygon',
  ]);
  const sourceTokens = tokens.filter((t) => {
    const chain = t.blockchain.toLowerCase();
    if (chain === 'stellar') return false;
    return SOURCE_CHAINS.has(chain);
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
  const effectiveRefundAddress = refundAddress?.trim() ?? '';

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
    return <p className="body-small text-[#757575]">Loading Stellar wallet…</p>;
  }

  if (!stellarAddress) {
    return (
      <p className="body-small text-[#757575]">
        Sign in with IRL above to bridge assets from other chains (Ethereum,
        Solana, Bitcoin, etc.) to your Stellar address.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="body-small text-[#757575]">
          Swap from 100+ chains into XLM or USDC on Stellar. Powered by NEAR
          Intents.
        </p>
        <p className="mt-1 body-small text-[#757575]">
          Network:{' '}
          <span className="font-medium text-[#171717]">
            Stellar {isTestnet ? 'Testnet' : 'Mainnet'}
          </span>
        </p>
      </div>

      {loadingTokens ? (
        <p className="body-small text-[#757575]">Loading tokens…</p>
      ) : (
        <div className="flex flex-col gap-5">
          <div>
            <label className="mb-1 block label-small uppercase text-[#171717]">
              From (Source Chain)
            </label>
            <Select
              value={sourceToken?.assetId ?? ''}
              onValueChange={(value) => {
                const t = sourceTokens.find((x) => x.assetId === value);
                setSourceToken(t ?? null);
                setRefundAddress('');
                setQuote(null);
              }}
            >
              <SelectTrigger className={selectTriggerClass}>
                {sourceToken ? (
                  <span className="flex items-center gap-3">
                    <ChainIcon blockchain={sourceToken.blockchain} />
                    <span>{sourceToken.symbol}</span>
                    <span className="text-[#757575]">
                      {getChainDisplayName(sourceToken.blockchain)}
                    </span>
                  </span>
                ) : (
                  <SelectValue placeholder="Select token" />
                )}
              </SelectTrigger>
              <SelectContent className="rounded-none border border-[#EDEDED] bg-white text-[#171717]">
                {sortedSourceTokens.map((t) => (
                  <SelectItem
                    key={t.assetId}
                    value={t.assetId}
                    className="rounded-none text-[#171717] focus:bg-[#EDEDED] focus:text-[#171717]"
                  >
                    <span className="flex items-center gap-3">
                      <ChainIcon blockchain={t.blockchain} />
                      <span>{t.symbol}</span>
                      <span className="text-[#757575]">
                        {getChainDisplayName(t.blockchain)}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1 block label-small uppercase text-[#171717]">
              To (Stellar)
            </label>
            <select
              className={fieldClass}
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
            <label className="mb-1 block label-small uppercase text-[#171717]">
              Amount
            </label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0"
              className={fieldClass}
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setQuote(null);
              }}
            />
          </div>

          <div>
            <label className="mb-1 block label-small uppercase text-[#171717]">
              {sourceToken
                ? getRefundFieldConfig(sourceToken.blockchain).label
                : 'Refund address (source chain)'}
            </label>
            <input
              type="text"
              placeholder={
                sourceToken
                  ? getRefundFieldConfig(sourceToken.blockchain).placeholder
                  : 'Select source chain first'
              }
              className={`${fieldClass} font-mono`}
              value={refundAddress}
              onChange={(e) => {
                setRefundAddress(e.target.value);
                setQuote(null);
              }}
            />
            <p className="mt-1 body-small text-[#757575]">
              {sourceToken
                ? getRefundFieldConfig(sourceToken.blockchain).help
                : 'If the swap fails, funds are returned to this address. Select a source token to see chain-specific format.'}
            </p>
          </div>

          {quoteError && (
            <p className="body-small text-red-600">{quoteError}</p>
          )}

          <button
            type="button"
            disabled={
              quoteLoading ||
              !sourceToken ||
              !amount ||
              !effectiveRefundAddress.trim()
            }
            className={primaryCtaClass}
            onClick={requestQuote}
          >
            <span>
              {quoteLoading ? 'Getting quote…' : 'Get quote & deposit address'}
            </span>
            <CtaArrow />
          </button>

          {quote && (
            <div className="border border-[#EDEDED] bg-[#EDEDED]/40 p-4">
              <p className="font-medium text-[#171717]">
                Send to complete swap
              </p>
              <p className="mt-2 body-small text-[#757575]">
                Send exactly{' '}
                <strong className="text-[#171717]">
                  {quote.amountInFormatted} {sourceToken?.symbol}
                </strong>{' '}
                to the address below before{' '}
                {quote.deadline
                  ? new Date(quote.deadline).toLocaleString()
                  : 'deadline'}
                . You will receive ~{quote.amountOutFormatted}{' '}
                {destinationToken?.symbol} on Stellar.
              </p>
              <div className="mt-4 space-y-4">
                <div>
                  <span className="label-small uppercase text-[#757575]">
                    Deposit address
                  </span>
                  <div className="mt-2 flex items-stretch gap-2">
                    <code className="min-w-0 flex-1 break-all border border-[#EDEDED] bg-white px-3 py-2 font-mono text-xs text-[#171717]">
                      {quote.depositAddress}
                    </code>
                    <button
                      type="button"
                      className="label-small shrink-0 cursor-pointer border border-[#171717] bg-transparent px-3 py-2 uppercase text-[#171717] transition-colors hover:bg-black hover:text-white"
                      onClick={() => copyToClipboard(quote.depositAddress)}
                    >
                      Copy
                    </button>
                  </div>
                </div>
                {quote.depositMemo && (
                  <div>
                    <span className="label-small uppercase text-[#757575]">
                      Memo (required for Stellar)
                    </span>
                    <div className="mt-2 flex items-stretch gap-2">
                      <code className="min-w-0 flex-1 border border-[#EDEDED] bg-white px-3 py-2 font-mono text-xs text-[#171717]">
                        {quote.depositMemo}
                      </code>
                      <button
                        type="button"
                        className="label-small shrink-0 cursor-pointer border border-[#171717] bg-transparent px-3 py-2 uppercase text-[#171717] transition-colors hover:bg-black hover:text-white"
                        onClick={() => copyToClipboard(quote.depositMemo ?? '')}
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
  );
}
