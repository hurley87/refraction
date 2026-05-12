/**
 * Builds a payment transaction explorer URL using a server-provided template.
 * Safe for client bundles (no env reads). Mirrors server substitution rules for spend payments.
 */
export function formatSpendPaymentExplorerUrl(
  explorerTxUrlTemplate: string | null | undefined,
  txHash: string | null | undefined
): string | null {
  const raw = txHash?.trim();
  if (!raw || raw.toLowerCase().startsWith('pending:')) {
    return null;
  }
  const tpl = explorerTxUrlTemplate?.trim();
  if (!tpl || !tpl.includes('{txHash}')) {
    return null;
  }
  const evmHash = /^0x[a-fA-F0-9]{64}$/.test(raw);
  if (evmHash) {
    return tpl.replace('{txHash}', raw.toLowerCase());
  }
  return tpl.replace('{txHash}', encodeURIComponent(raw));
}

/** Derives a short link label from an explorer URL template (hostname only). */
export function spendPaymentExplorerLinkLabel(
  explorerTxUrlTemplate: string | null | undefined
): string {
  const tpl = explorerTxUrlTemplate?.trim();
  if (!tpl || !tpl.includes('{txHash}')) {
    return 'View payment transaction';
  }
  try {
    const prefix = tpl.split('{txHash}')[0];
    const u = new URL(prefix.endsWith('/') ? prefix.slice(0, -1) : prefix);
    const host = u.hostname.replace(/^www\./, '');
    return host ? `View payment on ${host}` : 'View payment transaction';
  } catch {
    return 'View payment transaction';
  }
}
