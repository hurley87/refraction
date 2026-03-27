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

  it("uses params.projectId directly for core and pay appId", async () => {
    walletKitInitMock.mockResolvedValueOnce({ pay: {} });

    const rawProjectId = "  untrimmed-project-id  ";
    await getWalletKitSingleton({ projectId: rawProjectId });

    expect(coreCtorMock).toHaveBeenCalledWith({ projectId: rawProjectId });
    expect(walletKitInitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payConfig: {
          appId: rawProjectId,
        },
      })
    );
  });

  it("includes raw project id in init failures", async () => {
    walletKitInitMock.mockRejectedValueOnce(new Error("401 unauthorized"));

    await expect(
      getWalletKitSingleton({ projectId: "project-id-123" })
    ).rejects.toThrow(
      'WalletKit init failed for projectId="project-id-123": 401 unauthorized'
    );
  });
});
