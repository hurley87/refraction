import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("node:dns/promises", async () => {
  const actual = await vi.importActual<typeof import("node:dns/promises")>(
    "node:dns/promises"
  );
  const lookupMock = vi.fn();
  return {
    ...actual,
    lookup: lookupMock,
    default: {
      ...(actual as unknown as Record<string, unknown>),
      lookup: lookupMock,
    },
  };
});

import { lookup } from "node:dns/promises";
import { isSafeRemoteHttpUrl } from "../remote-url";

describe("isSafeRemoteHttpUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows public HTTPS URLs", async () => {
    vi.mocked(lookup).mockResolvedValueOnce([
      { address: "93.184.216.34", family: 4 },
    ]);

    await expect(
      isSafeRemoteHttpUrl("https://example.com/image.jpg")
    ).resolves.toBe(true);
  });

  it("rejects localhost targets", async () => {
    await expect(
      isSafeRemoteHttpUrl("http://localhost:3000/private")
    ).resolves.toBe(false);
    expect(lookup).not.toHaveBeenCalled();
  });

  it("rejects link-local metadata IP targets", async () => {
    await expect(
      isSafeRemoteHttpUrl("http://169.254.169.254/latest/meta-data")
    ).resolves.toBe(false);
    expect(lookup).not.toHaveBeenCalled();
  });

  it("rejects domains that resolve to private IPs", async () => {
    vi.mocked(lookup).mockResolvedValueOnce([
      { address: "10.0.0.8", family: 4 },
    ]);

    await expect(
      isSafeRemoteHttpUrl("https://internal.example.com/asset.png")
    ).resolves.toBe(false);
  });

  it("rejects domains with mixed public and private DNS answers", async () => {
    vi.mocked(lookup).mockResolvedValueOnce([
      { address: "203.0.113.10", family: 4 },
      { address: "192.168.1.9", family: 4 },
    ]);

    await expect(
      isSafeRemoteHttpUrl("https://cdn.example.com/asset.png")
    ).resolves.toBe(false);
  });
});
