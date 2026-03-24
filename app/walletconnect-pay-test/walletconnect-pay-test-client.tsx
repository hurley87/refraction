"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ExternalLink, QrCode, ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CHECKOUT_URL = process.env.NEXT_PUBLIC_WALLETCONNECT_PAY_CHECKOUT_URL ?? "";

const POSTER_PRICE_USD = 1;
const POSTER_TOTAL = 100;
const PRODUCT_NAME = "Limited edition poster";

const DOCS = {
  walletOverview:
    "https://docs.walletconnect.com/payments/wallets/overview",
  payOverview: "https://docs.walletconnect.com/payments/overview",
  merchantOnboarding:
    "https://docs.walletconnect.com/payments/merchant/onboarding",
  ecommerce: "https://docs.walletconnect.com/payments/ecommerce/overview",
  dashboard: "https://dashboard.walletconnect.com/",
} as const;

function buildQrImageUrl(data: string): string {
  const encoded = encodeURIComponent(data);
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encoded}`;
}

export function WalletConnectPayTestClient() {
  const [showEmbed, setShowEmbed] = useState(false);
  const hasCheckout = CHECKOUT_URL.length > 0;

  const qrSrc = useMemo(
    () => (hasCheckout ? buildQrImageUrl(CHECKOUT_URL) : ""),
    [hasCheckout]
  );

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
            WalletConnect Pay · test
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-10 px-4 py-10">
        <section className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            <ShoppingBag className="size-3.5" aria-hidden />
            Test listing — not linked from main nav
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {PRODUCT_NAME}
          </h1>
          <p className="max-w-xl text-zinc-600 dark:text-zinc-400">
            {POSTER_TOTAL} posters at ${POSTER_PRICE_USD} each (USDC via
            WalletConnect Pay on supported networks). This page is for internal
            testing of the pay flow your buyers see when they scan a QR or open
            your checkout link.
          </p>
        </section>

        <section
          className={cn(
            "rounded-xl border p-6 shadow-sm",
            hasCheckout
              ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/40"
              : "border-amber-200 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/40"
          )}
        >
          <h2 className="text-lg font-semibold">
            {hasCheckout ? "Checkout ready" : "Configure checkout URL"}
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {hasCheckout ? (
              <>
                Using{" "}
                <code className="rounded bg-white/70 px-1.5 py-0.5 text-xs dark:bg-zinc-900">
                  NEXT_PUBLIC_WALLETCONNECT_PAY_CHECKOUT_URL
                </code>
                . Open the link or scan the QR with a wallet that supports
                WalletConnect Pay.
              </>
            ) : (
              <>
                Set{" "}
                <code className="rounded bg-white/70 px-1.5 py-0.5 text-xs dark:bg-zinc-900">
                  NEXT_PUBLIC_WALLETCONNECT_PAY_CHECKOUT_URL
                </code>{" "}
                in{" "}
                <code className="rounded bg-white/70 px-1.5 py-0.5 text-xs dark:bg-zinc-900">
                  .env.local
                </code>{" "}
                to the payment or hosted checkout URL from your WalletConnect
                Pay merchant tooling (see config guide below), then restart{" "}
                <code className="rounded bg-white/70 px-1.5 py-0.5 text-xs dark:bg-zinc-900">
                  yarn dev
                </code>
                .
              </>
            )}
          </p>

          {hasCheckout ? (
            <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="flex flex-col items-center gap-2 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                {/* eslint-disable-next-line @next/next/no-img-element -- external dynamic QR API */}
                <img
                  src={qrSrc}
                  alt="QR code that encodes the WalletConnect Pay checkout URL"
                  width={220}
                  height={220}
                  className="rounded-md"
                />
                <span className="flex items-center gap-1 text-xs text-zinc-500">
                  <QrCode className="size-3.5" aria-hidden />
                  Scan with a Pay-enabled wallet
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-3">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <a
                    href={CHECKOUT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open WalletConnect Pay checkout
                    <ExternalLink className="size-4" aria-hidden />
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEmbed((v) => !v)}
                >
                  {showEmbed ? "Hide embedded preview" : "Try embedded preview"}
                </Button>
                <p className="text-xs text-zinc-500">
                  Some hosts block iframes; if the preview is blank, use “Open
                  checkout” instead.
                </p>
                {showEmbed ? (
                  <iframe
                    title="WalletConnect Pay checkout"
                    src={CHECKOUT_URL}
                    className="mt-2 h-[min(70vh,520px)] w-full rounded-lg border border-zinc-200 bg-white dark:border-zinc-800"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                    allow="payment *"
                  />
                ) : null}
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold">Offer details</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-4 border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <dt className="text-zinc-500">Unit price</dt>
              <dd className="font-medium">${POSTER_PRICE_USD} USDC (typical)</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <dt className="text-zinc-500">Quantity cap</dt>
              <dd className="font-medium">{POSTER_TOTAL} posters</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-zinc-100 pb-3 sm:col-span-2 dark:border-zinc-800">
              <dt className="text-zinc-500">Networks (Pay docs)</dt>
              <dd className="text-right font-medium">
                Ethereum, Base, Optimism, Polygon, Arbitrum (USDC)
              </dd>
            </div>
            <div className="flex justify-between gap-4 pb-1 sm:col-span-2">
              <dt className="text-zinc-500">Fulfillment</dt>
              <dd className="text-right text-zinc-700 dark:text-zinc-300">
                Handle shipping outside this flow; this page only tests payment.
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold">Your config checklist</h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
            <li>
              <strong className="text-zinc-900 dark:text-zinc-100">
                Merchant account
              </strong>
              : Complete WalletConnect Pay merchant onboarding (KYB, transit
              account, device linking). See{" "}
              <a
                href={DOCS.merchantOnboarding}
                className="text-primary underline-offset-4 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Merchant onboarding
              </a>
              .
            </li>
            <li>
              <strong className="text-zinc-900 dark:text-zinc-100">
                Create a $1 payment for this drop
              </strong>
              : In the Merchant Dashboard (or your PSP flow), create a
              checkout / payment intent for{" "}
              <strong className="text-zinc-900 dark:text-zinc-100">
                $1 × 1 unit
              </strong>{" "}
              (buyers purchase one poster per transaction; repeat up to{" "}
              {POSTER_TOTAL} sales operationally). Copy the hosted checkout or
              payment link the dashboard gives you.
            </li>
            <li>
              <strong className="text-zinc-900 dark:text-zinc-100">
                Wire the URL into this app
              </strong>
              : Add{" "}
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">
                NEXT_PUBLIC_WALLETCONNECT_PAY_CHECKOUT_URL=&lt;your link&gt;
              </code>{" "}
              to{" "}
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">
                .env.local
              </code>
              . Redeploy or restart the dev server.
            </li>
            <li>
              <strong className="text-zinc-900 dark:text-zinc-100">
                Wallet testing
              </strong>
              : Use a wallet that implements WalletConnect Pay (WalletKit or
              standalone Pay SDK). The docs describe detecting the payment link,
              fetching options, signing, and confirming — see{" "}
              <a
                href={DOCS.walletOverview}
                className="text-primary underline-offset-4 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Wallet integration overview
              </a>
              . For dashboard POS-style tests, configure a mock-merchant
              recipient as described in that doc.
            </li>
            <li>
              <strong className="text-zinc-900 dark:text-zinc-100">
                Project ID
              </strong>
              : WalletConnect Cloud project IDs are used elsewhere in this repo
              (e.g. Stellar WalletConnect). Pay flows may use dashboard / PSP
              credentials; keep secrets server-side. This test page only needs
              the public checkout URL.
            </li>
          </ol>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a
                href={DOCS.dashboard}
                target="_blank"
                rel="noopener noreferrer"
              >
                WalletConnect Dashboard
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a
                href={DOCS.payOverview}
                target="_blank"
                rel="noopener noreferrer"
              >
                Pay overview
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a
                href={DOCS.ecommerce}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ecommerce / checkout
              </a>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
