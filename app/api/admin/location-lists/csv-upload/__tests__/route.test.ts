import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/admin", () => ({
  checkAdminPermission: vi.fn(() => true),
}));

vi.mock("@/lib/db/client", () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
  },
}));

import { downloadImageFromUrl } from "../route";

describe("downloadImageFromUrl", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("blocks localhost URLs before issuing fetch", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response());

    const result = await downloadImageFromUrl("http://localhost/private.png");

    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects large payloads via content-length header", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: {
          "content-type": "image/png",
          "content-length": String(11 * 1024 * 1024),
        },
      })
    );

    const result = await downloadImageFromUrl("https://example.com/big.png");

    expect(result).toBeNull();
  });

  it("rejects payloads that exceed size limit while streaming", async () => {
    const chunk = new Uint8Array(6 * 1024 * 1024).fill(7);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(chunk);
        controller.enqueue(chunk);
        controller.close();
      },
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      })
    );

    const result = await downloadImageFromUrl("https://example.com/huge.jpg");

    expect(result).toBeNull();
  });

  it("accepts small image downloads", async () => {
    const body = new Uint8Array(512).fill(1);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(body, {
        status: 200,
        headers: {
          "content-type": "image/webp",
          "content-length": String(body.byteLength),
        },
      })
    );

    const result = await downloadImageFromUrl("https://example.com/image.webp");

    expect(result).not.toBeNull();
    expect(result?.contentType).toContain("image/webp");
    expect(result?.buffer.byteLength).toBe(512);
  });
});
