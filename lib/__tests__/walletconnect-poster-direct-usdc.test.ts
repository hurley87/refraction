import { describe, expect, it } from "vitest";

import {
  encodePosterUsdcTransferData,
  isEvmAddress,
  POSTER_CHECKOUT_USDC_ADDRESS_BASE,
} from "@/lib/walletconnect-poster-direct-usdc";

describe("walletconnect-poster-direct-usdc", () => {
  it("isEvmAddress validates 0x addresses", () => {
    expect(isEvmAddress("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913")).toBe(true);
    expect(isEvmAddress("0x123")).toBe(false);
    expect(isEvmAddress("")).toBe(false);
  });

  it("encodePosterUsdcTransferData targets USDC contract with transfer calldata", () => {
    const recipient = "0x000000000000000000000000000000000000dEaD" as `0x${string}`;
    const data = encodePosterUsdcTransferData(recipient);
    expect(data.startsWith("0xa9059cbb")).toBe(true);
    expect(data.slice(2).toLowerCase()).toContain(
      recipient.slice(2).toLowerCase()
    );
    expect(POSTER_CHECKOUT_USDC_ADDRESS_BASE).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });
});
