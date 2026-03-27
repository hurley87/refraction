"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { isPaymentLink } from "@reown/walletkit";
import {
  CheckCircle2,
  Loader2,
  Lock,
  QrCode,
  Sparkles,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getWalletKitSingleton,
  isWalletConnectPayAuthErrorMessage,
  resetWalletKitSingleton,
} from "@/lib/walletconnect-pay/walletkit-instance";
import {
  signWalletRpcAction,
  type BrowserProvider,
} from "@/lib/walletconnect-pay/sign-wallet-rpc-action";
import {
  encodePosterUsdcTransferData,
  isEvmAddress,
  POSTER_CHECKOUT_CHAIN_ID,
  POSTER_CHECKOUT_USDC_ADDRESS_BASE,
} from "@/lib/walletconnect-poster-direct-usdc";
import { PaymentLinkQrReaderDialog } from "@/components/walletconnect/payment-link-qr-reader-dialog";
import { cn } from "@/lib/utils";

import type { PaymentOptionsResponse } from "@walletconnect/pay";

const PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";
/** When set, /walletconnect can settle $1 USDC on Base without a Pay product link (plain ERC-20 transfer). */
const POSTER_USDC_RECIPIENT =
  process.env.NEXT_PUBLIC_POSTER_USDC_RECIPIENT_ADDRESS?.trim() ?? "";

const POSTER_PRICE_USD = 1;
const POSTER_TOTAL = 100;
const PRODUCT_NAME = "Limited edition poster";
const PRODUCT_BLURB =
  "Screen-printed IRL drop. Ships worldwide. Pay with USDC via WalletConnect Pay — pick your network in your wallet.";

const PAY_EVM_CHAIN_IDS = [1, 8453, 10, 137, 42161] as const;

function buildCaip10Accounts(address: string): string[] {
  const checksummed = address as `0x${string}`;
  return PAY_EVM_CHAIN_IDS.map((id) => `eip155:${id}:${checksummed}`);
}

type FlowStatus =
  | "idle"
  | "initializing"
  | "loading_options"
  | "awaiting_ic"
  | "signing"
  | "confirming"
  | "done";

function shortAddress(addr: string): string {
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function WalletConnectPageClient() {
  const { login, authenticated, ready: privyReady, user } = usePrivy();
  const { wallets } = useWallets();

  const [paymentLinkOverride, setPaymentLinkOverride] = useState("");
  const [qrReaderOpen, setQrReaderOpen] = useState(false);
  const [optionsResponse, setOptionsResponse] =
    useState<PaymentOptionsResponse | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [flowStatus, setFlowStatus] = useState<FlowStatus>("idle");
  const [lastError, setLastError] = useState<string | null>(null);
  const [purchaseComplete, setPurchaseComplete] = useState(false);

  const [icOpen, setIcOpen] = useState(false);
  const [icUrl, setIcUrl] = useState<string | null>(null);
  const icResolveRef = useRef<(() => void) | null>(null);
  const icRejectRef = useRef<((err: Error) => void) | null>(null);

  const address = user?.wallet?.address;

  const evmWallet = (() => {
    if (!address) return null;
    const lower = address.toLowerCase();
    return (
      wallets.find((w) => w.address.toLowerCase() === lower) ?? wallets[0] ?? null
    );
  })();

  /** Payment URI from QR scan only (no env-based product link). */
  const effectivePaymentLink = paymentLinkOverride.trim();
  const wcPayLinkValid =
    effectivePaymentLink.length > 0 && isPaymentLink(effectivePaymentLink);
  const directUsdcReady = isEvmAddress(POSTER_USDC_RECIPIENT);

  /** WalletConnect Pay needs a valid payment link and project id; direct USDC only needs treasury env. */
  const checkoutReady = wcPayLinkValid || directUsdcReady;

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

  const handleWalletKitPayError = useCallback((err: unknown, authHint: string) => {
    const msg = err instanceof Error ? err.message : String(err);
    const formattedProjectId = JSON.stringify(PROJECT_ID);
    const withProjectId = (text: string) =>
      `${text} (projectId=${formattedProjectId})`;
    if (isWalletConnectPayAuthErrorMessage(msg)) {
      resetWalletKitSingleton();
      const hint = withProjectId(authHint);
      setLastError(hint);
      toast.error(hint);
      return;
    }
    const detail = withProjectId(msg);
    setLastError(detail);
    toast.error(detail);
  }, []);

  const initWalletKit = useCallback(
    async (authHint: string) => {
      if (!PROJECT_ID) {
        toast.error("App configuration incomplete");
        return null;
      }
      try {
        return await getWalletKitSingleton({
          projectId: PROJECT_ID,
        });
      } catch (e) {
        handleWalletKitPayError(e, authHint);
        return null;
      }
    },
    [handleWalletKitPayError]
  );

  const loadPaymentOptions =
    useCallback(async (): Promise<PaymentOptionsResponse | null> => {
      const link = effectivePaymentLink;
      if (!link) {
        toast.error("Scan the payment QR code first");
        return null;
      }
      if (!isPaymentLink(link)) {
        toast.error("Invalid payment link");
        return null;
      }
      if (!address) {
        toast.error("Connect your wallet to continue");
        return null;
      }
      setLastError(null);
      setFlowStatus("initializing");
      try {
        const walletkit = await initWalletKit(
          "Pay rejected the configured project id (401). Confirm NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID and redeploy."
        );
        if (!walletkit) return null;
        setFlowStatus("loading_options");
        const accounts = buildCaip10Accounts(address);
        const options = await walletkit.pay.getPaymentOptions({
          paymentLink: link,
          accounts,
          includePaymentInfo: true,
        });
        setOptionsResponse(options);
        if (options.options.length === 0) {
          toast.error("No payment options for your wallet");
          return null;
        }
        const first = options.options[0]!.id;
        setSelectedOptionId(first);
        return options;
      } catch (e) {
        handleWalletKitPayError(
          e,
          "Pay rejected the configured project id (401). Confirm NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID and redeploy."
        );
        return null;
      } finally {
        setFlowStatus("idle");
      }
    }, [
      address,
      effectivePaymentLink,
      handleWalletKitPayError,
      initWalletKit,
    ]);

  const payWithSelectedOption = useCallback(
    async (response: PaymentOptionsResponse, optionId: string) => {
      if (!address || !evmWallet) {
        toast.error("Wallet not ready");
        return;
      }
      const link = effectivePaymentLink;
      if (!link || !isPaymentLink(link)) {
        toast.error("Invalid payment link");
        return;
      }
      setLastError(null);

      try {
        const walletkit = await initWalletKit(
          "Pay rejected the configured project id (401). Check NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID and redeploy after changes."
        );
        if (!walletkit) return;

        const option = response.options.find((o) => o.id === optionId);
        if (!option) {
          throw new Error("Selected payment method not found");
        }

        const ic = option.collectData?.url;
        if (ic) {
          setFlowStatus("awaiting_ic");
          await runDataCollectionIframe(ic);
        }

        setFlowStatus("signing");
        const actions = await walletkit.pay.getRequiredPaymentActions({
          paymentId: response.paymentId,
          optionId,
        });

        const provider = await evmWallet.getEthereumProvider();
        if (!provider) {
          throw new Error("Could not connect to your wallet");
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
          paymentId: response.paymentId,
          optionId,
          signatures,
        });

        setFlowStatus("done");
        if (result.status === "succeeded") {
          setPurchaseComplete(true);
          toast.success("Payment received — thank you!");
        } else if (result.status === "processing") {
          setPurchaseComplete(true);
          toast.message("Payment is processing", {
            description: "We will confirm shortly.",
          });
        } else {
          toast.error(`Payment could not complete (${result.status})`);
        }
      } catch (e) {
        handleWalletKitPayError(
          e,
          "Pay rejected the configured project id (401). Check NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID and redeploy after changes."
        );
        setFlowStatus("idle");
      }
    },
    [
      address,
      effectivePaymentLink,
      evmWallet,
      handleWalletKitPayError,
      initWalletKit,
      runDataCollectionIframe,
    ]
  );

  const payDirectUsdcOnBase = useCallback(async () => {
    if (!address || !evmWallet) {
      toast.error("Wallet not ready");
      return;
    }
    if (!directUsdcReady) return;

    setLastError(null);
    setFlowStatus("signing");
    try {
      await evmWallet.switchChain(POSTER_CHECKOUT_CHAIN_ID);
      const provider = await evmWallet.getEthereumProvider();
      if (!provider) {
        throw new Error("Could not connect to your wallet");
      }
      const data = encodePosterUsdcTransferData(
        POSTER_USDC_RECIPIENT as `0x${string}`
      );
      await (provider as unknown as BrowserProvider).request({
        method: "eth_sendTransaction",
        params: [
          {
            from: address,
            to: POSTER_CHECKOUT_USDC_ADDRESS_BASE,
            data,
          },
        ],
      });
      setFlowStatus("done");
      setPurchaseComplete(true);
      toast.success("Payment sent — thank you!");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setLastError(msg);
      setFlowStatus("idle");
      toast.error(msg);
    }
  }, [address, directUsdcReady, evmWallet]);

  const handlePayClick = useCallback(async () => {
    if (!checkoutReady) {
      toast.error(
        "Scan the payment QR code, or set NEXT_PUBLIC_POSTER_USDC_RECIPIENT_ADDRESS for direct 1 USDC on Base."
      );
      return;
    }
    if (!wcPayLinkValid) {
      await payDirectUsdcOnBase();
      return;
    }

    let response = optionsResponse;
    let optionId = selectedOptionId;

    if (!response || !optionId) {
      response = (await loadPaymentOptions()) ?? null;
      if (!response) return;
      optionId = response.options[0]?.id ?? null;
      if (!optionId) return;
      setSelectedOptionId(optionId);
    }

    await payWithSelectedOption(response, optionId);
  }, [
    checkoutReady,
    wcPayLinkValid,
    loadPaymentOptions,
    optionsResponse,
    payDirectUsdcOnBase,
    payWithSelectedOption,
    selectedOptionId,
  ]);

  const configOk = Boolean(PROJECT_ID);
  const walletReady = privyReady && authenticated && Boolean(address) && configOk;
  const isBusy =
    flowStatus === "initializing" ||
    flowStatus === "loading_options" ||
    flowStatus === "awaiting_ic" ||
    flowStatus === "signing" ||
    flowStatus === "confirming";

  useEffect(() => {
    if (
      !walletReady ||
      !wcPayLinkValid ||
      purchaseComplete ||
      optionsResponse
    )
      return;
    void loadPaymentOptions();
  }, [
    walletReady,
    wcPayLinkValid,
    purchaseComplete,
    optionsResponse,
    loadPaymentOptions,
  ]);

  const remaining = POSTER_TOTAL;

  return (
    <div className="min-h-dvh bg-gradient-to-b from-zinc-100 to-zinc-200 text-zinc-900 dark:from-zinc-950 dark:to-zinc-900 dark:text-zinc-50">
      <header className="border-b border-zinc-200/80 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4 sm:max-w-xl">
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
            <span>Shop</span>
          </Link>
          <span className="flex items-center gap-1 text-xs text-zinc-500">
            <Lock className="size-3" aria-hidden />
            Secure checkout
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-8 sm:max-w-xl sm:py-12">
        {!configOk ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            This checkout is not fully configured. Add{" "}
            <code className="rounded bg-white/60 px-1 dark:bg-zinc-900">
              NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
            </code>{" "}
            to the app environment.
          </div>
        ) : null}

        <div className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
          <div className="relative aspect-[4/3] bg-gradient-to-br from-violet-200 via-fuchsia-100 to-amber-100 dark:from-violet-950 dark:via-fuchsia-950 dark:to-amber-950">
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div className="text-center">
                <Sparkles
                  className="mx-auto size-12 text-violet-600 dark:text-violet-300"
                  aria-hidden
                />
                <p className="mt-3 text-sm font-medium text-violet-950/80 dark:text-violet-100">
                  {PRODUCT_NAME}
                </p>
              </div>
            </div>
            <div className="absolute bottom-3 left-3 right-3 flex justify-between text-xs font-medium text-zinc-700/90 dark:text-zinc-200">
              <span className="rounded-full bg-white/90 px-2.5 py-1 backdrop-blur dark:bg-zinc-950/80">
                {remaining} left
              </span>
              <span className="rounded-full bg-white/90 px-2.5 py-1 backdrop-blur dark:bg-zinc-950/80">
                USDC · WalletConnect Pay
              </span>
            </div>
          </div>

          <div className="space-y-5 p-6 sm:p-8">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {PRODUCT_NAME}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {PRODUCT_BLURB}
              </p>
              <p className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight">
                  ${POSTER_PRICE_USD}
                </span>
                <span className="text-sm text-zinc-500">per poster</span>
              </p>
            </div>

            {purchaseComplete ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
                <div className="flex gap-3">
                  <CheckCircle2 className="size-8 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="font-semibold text-emerald-950 dark:text-emerald-100">
                      You are all set
                    </p>
                    <p className="mt-1 text-sm text-emerald-900/80 dark:text-emerald-200/90">
                      Thanks for your purchase. We will email shipping details to
                      the address on your order when your pack ships.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {!authenticated ? (
              <Button
                size="lg"
                className="h-12 w-full rounded-xl text-base"
                onClick={() => login()}
                disabled={!privyReady || !configOk}
              >
                <Wallet className="size-5" />
                Connect wallet to buy
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Paying with
                    </p>
                    <p className="font-mono text-sm">{shortAddress(address!)}</p>
                  </div>
                </div>

                {!directUsdcReady && !wcPayLinkValid ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="h-12 w-full rounded-xl text-base"
                    disabled={!walletReady || purchaseComplete}
                    onClick={() => setQrReaderOpen(true)}
                  >
                    <QrCode className="size-5" />
                    Scan payment QR
                  </Button>
                ) : null}

                {wcPayLinkValid && optionsResponse && selectedOptionId ? (
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Payment method
                    </p>
                    <ul className="space-y-2">
                      {optionsResponse.options.map((opt) => {
                        const active = selectedOptionId === opt.id;
                        const needsInfo = Boolean(opt.collectData?.url);
                        return (
                          <li key={opt.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedOptionId(opt.id)}
                              className={cn(
                                "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                                active
                                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                                  : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                              )}
                            >
                              <span>
                                <span className="font-medium">
                                  {opt.amount.display.assetSymbol}
                                </span>
                                {opt.amount.display.networkName ? (
                                  <span className="text-zinc-500">
                                    {" "}
                                    on {opt.amount.display.networkName}
                                  </span>
                                ) : null}
                              </span>
                              {needsInfo ? (
                                <span className="text-xs text-amber-700 dark:text-amber-300">
                                  ID check
                                </span>
                              ) : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}

                <Button
                  size="lg"
                  className="h-12 w-full rounded-xl text-base"
                  disabled={
                    !walletReady || !checkoutReady || isBusy || purchaseComplete
                  }
                  onClick={() => void handlePayClick()}
                >
                  {isBusy ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <Sparkles className="size-5" />
                  )}
                  {wcPayLinkValid && optionsResponse
                    ? `Pay $${POSTER_PRICE_USD} with crypto`
                    : wcPayLinkValid
                      ? `Continue — $${POSTER_PRICE_USD}`
                      : `Pay $${POSTER_PRICE_USD} USDC on Base`}
                </Button>

                {directUsdcReady && !wcPayLinkValid ? (
                  <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                    Sends 1 USDC on Base to the merchant wallet. No WalletConnect
                    Pay link needed.
                  </p>
                ) : null}
              </div>
            )}

            {lastError ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                {lastError}
              </p>
            ) : null}
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-zinc-500">
          Questions?{" "}
          <Link href="/contact-us" className="underline underline-offset-2">
            Contact us
          </Link>
        </p>
      </main>

      <PaymentLinkQrReaderDialog
        open={qrReaderOpen}
        onOpenChange={setQrReaderOpen}
        onPaymentLink={(uri) => {
          setPaymentLinkOverride(uri);
          setOptionsResponse(null);
          setSelectedOptionId(null);
        }}
      />

      <Dialog open={icOpen} onOpenChange={(open) => !open && handleCloseIc()}>
        <DialogContent className="max-w-lg gap-0 p-0 sm:max-w-lg">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Verify your details</DialogTitle>
          </DialogHeader>
          <p className="px-4 pb-2 text-xs text-muted-foreground">
            Regulations require a few details for this payment. Complete the form,
            then we will finish in your wallet.
          </p>
          {icUrl ? (
            <iframe
              title="Payment verification"
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
