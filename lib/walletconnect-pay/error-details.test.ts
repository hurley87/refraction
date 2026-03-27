import { describe, expect, it } from "vitest";

import {
  buildNoPaymentOptionsDetail,
  buildWalletConnectPayErrorDetail,
} from "./error-details";

describe("walletconnect-pay error detail helpers", () => {
  it("serializes full error details from Error instances", () => {
    const detail = buildWalletConnectPayErrorDetail(
      new Error("payment options request failed")
    );

    expect(detail).toContain('"name":"Error"');
    expect(detail).toContain('"message":"payment options request failed"');
  });

  it("includes project id and response payload for no-option results", () => {
    const detail = buildNoPaymentOptionsDetail({
      projectId: "  raw-project-id  ",
      walletAddress: "0x1234",
      paymentLink: "wc:pay://example",
      response: {
        paymentId: "p_123",
        options: [],
      } as never,
    });

    expect(detail).toContain("No payment options for your wallet.");
    expect(detail).toContain('projectId="  raw-project-id  "');
    expect(detail).toContain("wallet=0x1234");
    expect(detail).toContain("paymentLink=wc:pay://example");
    expect(detail).toContain('response={"paymentId":"p_123","options":[]}');
  });
});
