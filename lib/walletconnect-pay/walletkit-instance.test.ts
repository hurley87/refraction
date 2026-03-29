import { beforeEach, describe, expect, it, vi } from "vitest";

const { coreCtorMock, walletKitInitMock } = vi.hoisted(() => ({
  coreCtorMock: vi.fn(),
  walletKitInitMock: vi.fn(),
}));

vi.mock("@walletconnect/core", () => ({
  Core: function MockCore(options: unknown) {
    coreCtorMock(options);
    return { options };
  },
}));

vi.mock("@reown/walletkit", () => ({
  WalletKit: {
    init: walletKitInitMock,
  },
}));

import {
  getWalletKitSingleton,
  resetWalletKitSingletonForTests,
} from "./walletkit-instance";

describe("walletkit-instance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetWalletKitSingletonForTests();
  });

  it("rejects missing project id and includes raw value in error", async () => {
    await expect(getWalletKitSingleton({ projectId: "" })).rejects.toThrow(
      'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is required for WalletKit (received "")'
    );
  });

  it("rejects when neither payAppId nor payApiKey is provided", async () => {
    await expect(
      getWalletKitSingleton({ projectId: "project-id-123" })
    ).rejects.toThrow(
      "WalletConnect Pay needs a credential. Provide a WCPay ID via `payAppId` (recommended) or a linked API key via `payApiKey`."
    );
  });

  it("uses payAppId for payConfig while keeping projectId for core", async () => {
    walletKitInitMock.mockResolvedValueOnce({ pay: {} });

    const rawProjectId = "  untrimmed-project-id  ";
    const payAppId = "wc_pay_app_123";
    await getWalletKitSingleton({ projectId: rawProjectId, payAppId });

    expect(coreCtorMock).toHaveBeenCalledWith({ projectId: rawProjectId });
    expect(walletKitInitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payConfig: {
          appId: payAppId,
        },
      })
    );
  });

  it("uses payApiKey when payAppId is not set", async () => {
    walletKitInitMock.mockResolvedValueOnce({ pay: {} });

    await getWalletKitSingleton({
      projectId: "project-id-123",
      payApiKey: "pay_api_key_abc",
    });

    expect(walletKitInitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payConfig: {
          apiKey: "pay_api_key_abc",
        },
      })
    );
  });

  it("includes raw project id in init failures", async () => {
    walletKitInitMock.mockRejectedValueOnce(new Error("401 unauthorized"));

    await expect(
      getWalletKitSingleton({
        projectId: "project-id-123",
        payAppId: "wc_pay_app_123",
      })
    ).rejects.toThrow(
      'WalletKit init failed for projectId="project-id-123": 401 unauthorized'
    );
  });
});
