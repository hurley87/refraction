import { describe, expect, it, vi } from "vitest";

import { signWalletRpcAction } from "./sign-wallet-rpc-action";

function makeAction(method: string, params: unknown, chainId = "eip155:8453") {
  return {
    walletRpc: {
      chainId,
      method,
      params: JSON.stringify(params),
    },
  };
}

describe("signWalletRpcAction", () => {
  it("uses connected account for eth_sendTransaction", async () => {
    const request = vi.fn().mockResolvedValue("0xhash");
    const switchChain = vi.fn().mockResolvedValue(undefined);

    const signature = await signWalletRpcAction(
      { request },
      makeAction("eth_sendTransaction", [
        { to: "0x000000000000000000000000000000000000dEaD", data: "0x1234" },
      ]) as never,
      {
        accountAddress: "0x1111111111111111111111111111111111111111",
        switchChain,
      }
    );

    expect(signature).toBe("0xhash");
    expect(switchChain).toHaveBeenCalledWith(8453);
    expect(request).toHaveBeenCalledWith({
      method: "eth_sendTransaction",
      params: [
        {
          to: "0x000000000000000000000000000000000000dEaD",
          data: "0x1234",
          from: "0x1111111111111111111111111111111111111111",
        },
      ],
    });
  });

  it("normalizes eth_signTypedData_v4 payload for strict providers", async () => {
    const request = vi.fn().mockResolvedValue("0xsig");
    const switchChain = vi.fn().mockResolvedValue(undefined);
    const typedData = {
      domain: { name: "Permit2", chainId: 8453 },
      types: {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "chainId", type: "uint256" },
        ],
      },
      message: { amount: "1" },
      primaryType: "PermitSingle",
    };

    const signature = await signWalletRpcAction(
      { request },
      makeAction("eth_signTypedData_v4", [
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        typedData,
      ]) as never,
      {
        accountAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        switchChain,
      }
    );

    expect(signature).toBe("0xsig");
    expect(request).toHaveBeenCalledWith({
      method: "eth_signTypedData_v4",
      params: [
        "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        JSON.stringify(typedData),
      ],
    });
  });

  it("accepts personal_sign param order [address, message]", async () => {
    const request = vi.fn().mockResolvedValue("0xpersonalsig");
    const switchChain = vi.fn().mockResolvedValue(undefined);
    const signer = "0xcccccccccccccccccccccccccccccccccccccccc";

    const signature = await signWalletRpcAction(
      { request },
      makeAction("personal_sign", [signer, "hello from walletconnect pay"]) as never,
      {
        switchChain,
      }
    );

    expect(signature).toBe("0xpersonalsig");
    expect(request).toHaveBeenCalledWith({
      method: "personal_sign",
      params: ["hello from walletconnect pay", signer],
    });
  });

  it("throws for personal_sign when signer is missing", async () => {
    const request = vi.fn().mockResolvedValue("0xpersonalsig");
    const switchChain = vi.fn().mockResolvedValue(undefined);

    await expect(
      signWalletRpcAction(
        { request },
        makeAction("personal_sign", [{ message: "hello" }, { bad: true }]) as never,
        {
          switchChain,
        }
      )
    ).rejects.toThrow("personal_sign: signer address missing or invalid");
  });
});
