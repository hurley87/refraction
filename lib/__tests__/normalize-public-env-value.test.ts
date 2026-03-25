import { describe, expect, it } from "vitest";

import { normalizePublicEnvValue } from "@/lib/walletconnect-pay/normalize-public-env-value";

describe("normalizePublicEnvValue", () => {
  it("trims whitespace", () => {
    expect(normalizePublicEnvValue("  abc  ")).toBe("abc");
  });

  it("strips one pair of double quotes", () => {
    expect(normalizePublicEnvValue('"990458db"')).toBe("990458db");
  });

  it("strips one pair of single quotes", () => {
    expect(normalizePublicEnvValue("'x'")).toBe("x");
  });
});
