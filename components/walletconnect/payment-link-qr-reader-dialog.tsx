"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef } from "react";
import { isPaymentLink } from "@reown/walletkit";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Same pattern as Reown react-wallet-v2: dynamic import avoids SSR (camera APIs). */
const ReactQrReader = dynamic(() => import("react-qr-reader-es6"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">
      Starting camera…
    </div>
  ),
});

type PaymentLinkQrReaderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with a validated WalletConnect Pay URI from the QR payload. */
  onPaymentLink: (uri: string) => void;
};

/**
 * Camera QR scanner for WalletConnect Pay payment links, following the pattern in
 * {@link https://github.com/reown-com/web-examples/blob/main/advanced/wallets/react-wallet-v2/src/components/QrReader.tsx Reown's react-wallet-v2 QrReader}.
 */
export function PaymentLinkQrReaderDialog({
  open,
  onOpenChange,
  onPaymentLink,
}: PaymentLinkQrReaderDialogProps) {
  const lastInvalidToastAt = useRef(0);
  const processedUri = useRef<string | null>(null);

  useEffect(() => {
    if (open) {
      processedUri.current = null;
    }
  }, [open]);

  const handleScan = useCallback(
    (data: string | null) => {
      if (!data || !data.trim()) return;
      const trimmed = data.trim();
      if (processedUri.current === trimmed) return;

      if (!isPaymentLink(trimmed)) {
        const now = Date.now();
        if (now - lastInvalidToastAt.current > 2500) {
          lastInvalidToastAt.current = now;
          toast.error("Not a WalletConnect Pay link. Scan the payment QR from the merchant.");
        }
        return;
      }

      processedUri.current = trimmed;
      onPaymentLink(trimmed);
      onOpenChange(false);
      toast.success("Payment link captured");
    },
    [onOpenChange, onPaymentLink]
  );

  const handleError = useCallback(() => {
    toast.error("Could not access the camera. Check permissions and try again.");
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0 sm:max-w-md">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle>Scan payment QR</DialogTitle>
          <DialogDescription>
            Point your camera at the WalletConnect Pay QR code to load the payment link.
          </DialogDescription>
        </DialogHeader>
        <div className="border-t border-border bg-black">
          {open ? (
            <ReactQrReader
              delay={300}
              showViewFinder={false}
              onError={handleError}
              onScan={handleScan}
              style={{ width: "100%" }}
              facingMode="environment"
            />
          ) : null}
        </div>
        <p className="px-4 pb-4 pt-2 text-center text-xs text-muted-foreground">
          Requires camera access. You can close this dialog to cancel.
        </p>
      </DialogContent>
    </Dialog>
  );
}
