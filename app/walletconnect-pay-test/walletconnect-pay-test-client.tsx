"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { isPaymentLink } from "@reown/walletkit";
import { ExternalLink, Loader2, ShoppingBag, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getWalletKitSingleton } from "@/lib/walletconnect-pay/walletkit-instance";
import {
  signWalletRpcAction,
  type BrowserProvider,
} from "@/lib/walletconnect-pay/sign-wallet-rpc-action";
import { cn } from "@/lib/utils";

import type { PaymentOptionsResponse } from "@walletconnect/pay";

const PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";
const PAY_API_KEY =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PAY_API_KEY?.trim() || undefined;
const DEFAULT_PAYMENT_LINK =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PAY_CHECKOUT_URL?.trim() ?? "";

const POSTER_PRICE_USD = 1;
const POSTER_TOTAL = 100;
const PRODUCT_NAME = "Limited edition poster";

/** EVM chains WalletConnect Pay documents for USDC (CAIP-2 → account list). */
const PAY_EVM_CHAIN_IDS = [1, 8453, 10, 137, 42161] as const;

const WALLETKIT_WEB_DOCS =
  "https://docs.walletconnect.com/payments/wallets/walletkit/web";

function buildCaip10Accounts(address: string): string[] {
  const checksummed = address as `0x${string}`;
  return PAY_EVM_CHAIN_IDS.map(
    (id) => `eip155:${id}:${checksummed}`
  );
}

type FlowStatus =
  | "idle"
  | "initializing"
  | "loading_options"
  | "awaiting_ic"
  | "signing"
  | "confirming"
  | "done";

export function WalletConnectPayTestClient() {
  const { login, authenticated, ready: privyReady, user } = usePrivy();
  const { wallets } = useWallets();

  const [paymentLinkInput, setPaymentLinkInput] = useState(DEFAULT_PAYMENT_LINK);
  const [optionsResponse, setOptionsResponse] =
    useState<PaymentOptionsResponse | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [flowStatus, setFlowStatus] = useState<FlowStatus>("idle");
  const [lastError, setLastError] = useState<string | null>(null);
  const [confirmResult, setConfirmResult] = useState<{
    status: string;
    isFinal: boolean;
  } | null>(null);

  const [icOpen, setIcOpen] = useState(false);
  const [icUrl, setIcUrl] = useState<string | null>(null);
  const icResolveRef = useRef<(() => void) | null>(null);
  const icRejectRef = useRef<((err: Error) => void) | null>(null);

  const address = user?.wallet?.address;

  const evmWallet = useMemo(() => {
    if (!address) return null;
    const lower = address.toLowerCase();
    return (
      wallets.find((w) => w.address.toLowerCase() === lower) ?? wallets[0] ?? null
    );
  }, [wallets, address]);

  const linkLooksLikePayment = useMemo(
    () => paymentLinkInput.trim().length > 0 && isPaymentLink(paymentLinkInput.trim()),
    [paymentLinkInput]
  );

  const runDataCollectionIframe = useCallback((url: string) => {
    return new Promise<void>((resolve, reject) => {
      setIcUrl(url);
      setIcOpen(true);
      icResolveRef.current = () => {
        setIcOpen(false);
        setIcUrl(null);
        icResolveRef.current = null;
        icRejectRef.current = null;
        resolve();
      };
      icRejectRef.current = (err) => {
        setIcOpen(false);
        setIcUrl(null);
        icResolveRef.current = null;
        icRejectRef.current = null;
        reject(err);
      };
    });
  }, []);

  useEffect(() => {
    if (!icOpen) return;

    function handleMessage(event: MessageEvent) {
      try {
        const data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.type === "IC_COMPLETE") {
          icResolveRef.current?.();
        } else if (data?.type === "IC_ERROR") {
          icRejectRef.current?.(
            new Error(data.error || "Information collection failed")
          );
        }
      } catch {
        // ignore non-JSON
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [icOpen]);

  const handleCloseIc = useCallback(() => {
    icRejectRef.current?.(new Error("Information collection cancelled"));
  }, []);

  const fetchPaymentOptions = useCallback(async () => {
    setLastError(null);
    setOptionsResponse(null);
    setSelectedOptionId(null);
    setConfirmResult(null);

    const link = paymentLinkInput.trim();
    if (!link) {
      toast.error("Paste a payment link first");
      return;
    }
    if (!isPaymentLink(link)) {
      toast.error("Not a WalletConnect Pay link (isPaymentLink returned false)");
      return;
    }
    if (!address) {
      toast.error("Connect your wallet first");
      return;
    }
    if (!PROJECT_ID) {
      toast.error("Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID");
      return;
    }

    setFlowStatus("initializing");
    try {
      const walletkit = await getWalletKitSingleton({
        projectId: PROJECT_ID,
        payApiKey: PAY_API_KEY,
      });
      setFlowStatus("loading_options");
      const accounts = buildCaip10Accounts(address);
      const options = await walletkit.pay.getPaymentOptions({
        paymentLink: link,
        accounts,
        includePaymentInfo: true,
      });
      setOptionsResponse(options);
      if (options.options.length === 0) {
        toast.error("No payment options for these accounts");
      } else {
        toast.success("Payment options loaded");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setLastError(msg);
      toast.error(msg);
    } finally {
      setFlowStatus("idle");
    }
  }, [address, paymentLinkInput]);

  const payWithSelectedOption = useCallback(async () => {
    if (!optionsResponse || !selectedOptionId || !address || !evmWallet) {
      toast.error("Select a payment option and ensure your wallet is connected");
      return;
    }

    const link = paymentLinkInput.trim();
    if (!link || !isPaymentLink(link)) {
      toast.error("Invalid payment link");
      return;
    }

    setLastError(null);
    setConfirmResult(null);

    try {
      const walletkit = await getWalletKitSingleton({
        projectId: PROJECT_ID,
        payApiKey: PAY_API_KEY,
      });

      const option = optionsResponse.options.find((o) => o.id === selectedOptionId);
      if (!option) {
        throw new Error("Selected option not found");
      }

      // Per-option data collection (recommended in WalletKit Web docs)
      const ic = option.collectData?.url;
      if (ic) {
        setFlowStatus("awaiting_ic");
        await runDataCollectionIframe(ic);
      }

      setFlowStatus("signing");
      const actions = await walletkit.pay.getRequiredPaymentActions({
        paymentId: optionsResponse.paymentId,
        optionId: selectedOptionId,
      });

      const provider = await evmWallet.getEthereumProvider();
      if (!provider) {
        throw new Error("Could not get Ethereum provider from Privy wallet");
      }

      const signatures: string[] = [];
      for (const action of actions) {
        const sig = await signWalletRpcAction(
          provider as unknown as BrowserProvider,
          action,
          {
            switchChain: async (chainId) => {
              await evmWallet.switchChain(chainId);
            },
          }
        );
        signatures.push(sig);
      }

      setFlowStatus("confirming");
      const result = await walletkit.pay.confirmPayment({
        paymentId: optionsResponse.paymentId,
        optionId: selectedOptionId,
        signatures,
      });

      setConfirmResult({ status: result.status, isFinal: result.isFinal });
      setFlowStatus("done");
      if (result.status === "succeeded") {
        toast.success("Payment succeeded");
      } else if (result.status === "processing") {
        toast.message("Payment processing", {
          description: result.pollInMs
            ? `You can poll again after ${result.pollInMs}ms`
            : undefined,
        });
      } else {
        toast.error(`Payment status: ${result.status}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setLastError(msg);
      setFlowStatus("idle");
      toast.error(msg);
    }
  }, [
    address,
    evmWallet,
    optionsResponse,
    paymentLinkInput,
    runDataCollectionIframe,
    selectedOptionId,
  ]);

  const configOk = Boolean(PROJECT_ID);
  const canUsePay = privyReady && authenticated && Boolean(address) && configOk;

  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <Image
              src="/home/IRL.png"
              alt="IRL"
              width={32}
              height={16}
              className="h-4 w-auto dark:invert"
            />
            <span>Back to home</span>
          </Link>
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            WalletKit Pay · test
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-10 px-4 py-10">
        <section className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            <ShoppingBag className="size-3.5" aria-hidden />
            WalletKit Web integration —{" "}
            <a
              href={WALLETKIT_WEB_DOCS}
              className="text-primary underline-offset-4 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              docs
            </a>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">{PRODUCT_NAME}</h1>
          <p className="max-w-xl text-zinc-600 dark:text-zinc-400">
            {POSTER_TOTAL} posters at ${POSTER_PRICE_USD} each. This page runs the
            wallet-side flow:{" "}
            <code className="rounded bg-zinc-200/80 px-1 text-xs dark:bg-zinc-800">
              isPaymentLink
            </code>{" "}
            →{" "}
            <code className="rounded bg-zinc-200/80 px-1 text-xs dark:bg-zinc-800">
              pay.getPaymentOptions
            </code>{" "}
            → optional IC iframe →{" "}
            <code className="rounded bg-zinc-200/80 px-1 text-xs dark:bg-zinc-800">
              getRequiredPaymentActions
            </code>{" "}
            → sign →{" "}
            <code className="rounded bg-zinc-200/80 px-1 text-xs dark:bg-zinc-800">
              confirmPayment
            </code>
            , using your Privy embedded EVM wallet as the signer.
          </p>
        </section>

        <section
          className={cn(
            "rounded-xl border p-6 shadow-sm",
            configOk
              ? "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              : "border-amber-200 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/40"
          )}
        >
          <h2 className="text-lg font-semibold">1. Environment</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
            <li>
              <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
                NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
              </code>{" "}
              — same Cloud project as your wallet (required).
            </li>
            <li>
              <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
                NEXT_PUBLIC_WALLETCONNECT_PAY_API_KEY
              </code>{" "}
              — WCP ID from Dashboard → Pay → copy (optional; defaults to project
              id if unset).
            </li>
            <li>
              <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
                NEXT_PUBLIC_WALLETCONNECT_PAY_CHECKOUT_URL
              </code>{" "}
              — optional default payment link prefilled below.
            </li>
          </ul>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold">2. Connect wallet</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Pay signing uses your Privy EVM wallet (
            <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">
              getEthereumProvider
            </code>
            ). Accounts are advertised on:{" "}
            {PAY_EVM_CHAIN_IDS.join(", ")} (eip155).
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {!authenticated ? (
              <Button onClick={() => login()} disabled={!privyReady}>
                <Wallet className="size-4" />
                Log in with Privy
              </Button>
            ) : (
              <div className="text-sm">
                <span className="text-zinc-500">Connected: </span>
                <span className="font-mono text-xs">{address}</span>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold">3. Payment link</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Paste a{" "}
            <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">
              https://pay.walletconnect.com/...
            </code>{" "}
            link from your merchant / POS flow.{" "}
            <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">
              isPaymentLink(uri)
            </code>{" "}
            gates before calling the Pay API.
          </p>
          <textarea
            value={paymentLinkInput}
            onChange={(e) => setPaymentLinkInput(e.target.value)}
            rows={3}
            className="mt-3 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            placeholder="https://pay.walletconnect.com/..."
            disabled={!canUsePay}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={fetchPaymentOptions}
              disabled={
                !canUsePay ||
                flowStatus === "initializing" ||
                flowStatus === "loading_options" ||
                !linkLooksLikePayment
              }
            >
              {(flowStatus === "initializing" ||
                flowStatus === "loading_options") && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Load payment options
            </Button>
            <span
              className={cn(
                "self-center text-xs",
                linkLooksLikePayment ? "text-emerald-600" : "text-zinc-500"
              )}
            >
              {paymentLinkInput.trim()
                ? linkLooksLikePayment
                  ? "Detected as payment link"
                  : "Not detected as payment link"
                : "Paste a link"}
            </span>
          </div>
        </section>

        {optionsResponse ? (
          <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold">4. Choose option & pay</h2>
            {optionsResponse.info ? (
              <div className="mt-3 rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
                <p>
                  <span className="text-zinc-500">Merchant: </span>
                  {optionsResponse.info.merchant.name}
                </p>
                <p>
                  <span className="text-zinc-500">Amount: </span>
                  {optionsResponse.info.amount.display.assetSymbol} (
                  {optionsResponse.info.amount.display.networkName ?? "network"})
                  {" — "}
                  <span className="font-mono text-xs">
                    raw: {optionsResponse.info.amount.value}
                  </span>
                </p>
                <p className="text-xs text-zinc-500">
                  Payment ID: {optionsResponse.paymentId}
                </p>
              </div>
            ) : null}

            <ul className="mt-4 space-y-2">
              {optionsResponse.options.map((opt) => {
                const needsIc = Boolean(opt.collectData?.url);
                const active = selectedOptionId === opt.id;
                return (
                  <li key={opt.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedOptionId(opt.id)}
                      className={cn(
                        "w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                        active
                          ? "border-primary bg-primary/5"
                          : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">
                          {opt.amount.display.assetSymbol} on{" "}
                          {opt.amount.display.networkName ?? "EVM"}
                        </span>
                        {needsIc ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                            Info required
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        Option id: {opt.id} · ETA ~{opt.etaS}s
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>

            <Button
              className="mt-6"
              size="lg"
              disabled={
                !selectedOptionId ||
                flowStatus === "awaiting_ic" ||
                flowStatus === "signing" ||
                flowStatus === "confirming"
              }
              onClick={() => void payWithSelectedOption()}
            >
              {(flowStatus === "signing" || flowStatus === "confirming") && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Sign & confirm payment
            </Button>

            {confirmResult ? (
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                Result:{" "}
                <strong>{confirmResult.status}</strong>
                {confirmResult.isFinal ? " (final)" : " (not final)"}
              </p>
            ) : null}
          </section>
        ) : null}

        {lastError ? (
          <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {lastError}
          </section>
        ) : null}

        <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold">Merchant / link source</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            This page implements the{" "}
            <strong>wallet</strong> integration from the WalletKit Web guide. You
            still need a <strong>payment link</strong> from your merchant dashboard
            or test POS (see{" "}
            <a
              href="https://docs.walletconnect.com/payments/merchant/onboarding"
              className="text-primary underline-offset-4 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              merchant onboarding
            </a>
            ).
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <a
              href="https://dashboard.walletconnect.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              WalletConnect Dashboard
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
        </section>
      </main>

      <Dialog open={icOpen} onOpenChange={(open) => !open && handleCloseIc()}>
        <DialogContent className="max-w-lg gap-0 p-0 sm:max-w-lg">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Information collection</DialogTitle>
          </DialogHeader>
          <p className="px-4 pb-2 text-xs text-muted-foreground">
            Complete the form. When finished, the iframe posts{" "}
            <code className="rounded bg-muted px-1">IC_COMPLETE</code> so the app
            can call <code className="rounded bg-muted px-1">confirmPayment</code>.
          </p>
          {icUrl ? (
            <iframe
              title="WalletConnect Pay data collection"
              src={icUrl}
              className="h-[min(70vh,560px)] w-full rounded-b-lg border-t border-border bg-white"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
