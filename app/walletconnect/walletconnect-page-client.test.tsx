import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WalletConnectPageClient } from "./walletconnect-page-client";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const mockLogin = vi.fn();

vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({
    login: mockLogin,
    authenticated: true,
    ready: true,
    user: { wallet: { address: "0x4D41AABBCCDDEEFF00112233445566778899A9E3" } },
  }),
  useWallets: () => ({ wallets: [] }),
}));

vi.mock("@reown/walletkit", () => ({
  isPaymentLink: () => false,
}));

vi.mock("@/lib/walletconnect-pay/walletkit-instance", () => ({
  getWalletKitSingleton: vi.fn(),
  isWalletConnectPayAuthErrorMessage: () => false,
  resetWalletKitSingleton: vi.fn(),
}));

vi.mock("@/lib/walletconnect-pay/sign-wallet-rpc-action", () => ({
  signWalletRpcAction: vi.fn(),
}));

vi.mock("@/lib/walletconnect-poster-direct-usdc", () => ({
  encodePosterUsdcTransferData: vi.fn(),
  isEvmAddress: () => false,
  POSTER_CHECKOUT_CHAIN_ID: 8453,
  POSTER_CHECKOUT_USDC_ADDRESS_BASE: "0x0000000000000000000000000000000000000000",
}));

vi.mock("@/components/walletconnect/payment-link-qr-reader-dialog", () => ({
  PaymentLinkQrReaderDialog: () => null,
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("WalletConnectPageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render a Change button in the paying-with row", () => {
    render(<WalletConnectPageClient />);

    expect(screen.getByText(/paying with/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /change/i })).not.toBeInTheDocument();
  });
});
