/**
 * Classifies Base USDC payment verification error strings (IRL-28). Kept dependency-free so
 * callers and tests do not load RPC / rail config or Privy server modules.
 */
export function isAmbiguousSpendPaymentVerifyFailure(reason: string): boolean {
  const r = reason.toLowerCase();
  return (
    r.includes('timeout') ||
    r.includes('rpc not configured') ||
    r.includes('receipt wait') ||
    r.includes('wait failed')
  );
}
